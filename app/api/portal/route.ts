import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  appointments,
  approvals,
  assets,
  auditEvents,
  clientMessages,
  clients,
  portalInvitations,
  projects,
  projectUpdates,
  workspaces,
} from "../../../db/schema";
import {
  jsonError,
  makeId,
  resolveClientAccess,
  WORKSPACE_ID,
} from "../_lib";
import { captureAutomationSignal } from "../../../lib/automation-engine";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    const access = await resolveClientAccess(request, token);
    if (!access) return jsonError("Portal access is invalid or expired", 401);
    const db = getDb();

    const [workspace, client, projectRows, appointmentRows, messageRows] =
      await Promise.all([
        db
          .select({
            name: workspaces.name,
            timezone: workspaces.timezone,
          })
          .from(workspaces)
          .where(eq(workspaces.id, WORKSPACE_ID))
          .get(),
        db
          .select()
          .from(clients)
          .where(
            and(
              eq(clients.id, access.clientId),
              eq(clients.workspaceId, access.workspaceId),
            ),
          )
          .get(),
        db
          .select()
          .from(projects)
          .where(
            and(
              eq(projects.clientId, access.clientId),
              eq(projects.workspaceId, access.workspaceId),
            ),
          )
          .orderBy(desc(projects.updatedAt)),
        db
          .select()
          .from(appointments)
          .where(
            and(
              eq(appointments.clientId, access.clientId),
              eq(appointments.workspaceId, access.workspaceId),
            ),
          )
          .orderBy(appointments.startsAt),
        db
          .select()
          .from(clientMessages)
          .where(
            and(
              eq(clientMessages.clientId, access.clientId),
              eq(clientMessages.workspaceId, access.workspaceId),
            ),
          )
          .orderBy(clientMessages.createdAt),
      ]);

    const projectIds = projectRows.map((project) => project.id);
    const [approvalRows, assetRows, updateRows] = projectIds.length
      ? await Promise.all([
          db
            .select()
            .from(approvals)
            .where(inArray(approvals.projectId, projectIds))
            .orderBy(desc(approvals.createdAt)),
          db
            .select()
            .from(assets)
            .where(inArray(assets.projectId, projectIds))
            .orderBy(desc(assets.createdAt)),
          db
            .select()
            .from(projectUpdates)
            .where(
              and(
                inArray(projectUpdates.projectId, projectIds),
                eq(projectUpdates.visibility, "client"),
              ),
            )
            .orderBy(desc(projectUpdates.createdAt)),
        ])
      : [[], [], []];

    if (access.invitation) {
      await db
        .update(portalInvitations)
        .set({ lastUsedAt: new Date().toISOString() })
        .where(eq(portalInvitations.id, access.invitation.id));
    }

    return Response.json({
      workspace,
      client,
      projects: projectRows,
      appointments: appointmentRows,
      approvals: approvalRows,
      messages: messageRows,
      assets: assetRows,
      updates: updateRows,
      access: {
        expiresAt: access.invitation?.expiresAt ?? null,
        hint: access.invitation?.tokenHint ?? "verified-account",
        method: access.invitation ? "invitation" : "account",
      },
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to open client portal",
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      token?: string;
      action?: "message" | "approval";
      projectId?: string;
      body?: string;
      approvalId?: string;
      decision?: "approved" | "revision";
      reason?: string;
    };
    const access = await resolveClientAccess(request, payload.token ?? null);
    if (!access) return jsonError("Portal access is invalid or expired", 401);
    const db = getDb();
    const now = new Date().toISOString();

    if (payload.action === "message") {
      if (!payload.body?.trim()) return jsonError("Message cannot be empty");
      if (payload.projectId) {
        const project = await db
          .select({ id: projects.id })
          .from(projects)
          .where(
            and(
              eq(projects.id, payload.projectId),
              eq(projects.clientId, access.clientId),
            ),
          )
          .get();
        if (!project) return jsonError("Project not found", 404);
      }
      const messageId = makeId("msg");
      await db.batch([
        db.insert(clientMessages).values({
          id: messageId,
          workspaceId: WORKSPACE_ID,
          clientId: access.clientId,
          projectId: payload.projectId || null,
          senderType: "client",
          senderId: access.clientId,
          body: payload.body.trim(),
          status: "sent",
          createdAt: now,
        }),
        db.insert(auditEvents).values({
          id: makeId("audit"),
          workspaceId: WORKSPACE_ID,
          actorType: "client",
          actorId: access.clientId,
          action: "portal.message_sent",
          targetType: "project",
          targetId: payload.projectId || null,
          riskLevel: "low",
          outcome: "succeeded",
          metadataJson: JSON.stringify({ contentCaptured: false }),
          occurredAt: now,
        }),
      ]);
      await captureAutomationSignal(
        {
          workspaceId: WORKSPACE_ID,
          eventType: "client_message_received",
          sourceType: "message",
          sourceId: messageId,
          projectId: payload.projectId || null,
          clientId: access.clientId,
          category: "communication",
          signalKey: "communication.client_message",
          value: {
            direction: "inbound",
            characterCount: payload.body.trim().length,
            contentCaptured: false,
          },
          priority: 90,
        },
        db,
      );
      return Response.json({ id: messageId, status: "sent" }, { status: 201 });
    }

    if (payload.action === "approval") {
      if (
        !payload.approvalId ||
        !["approved", "revision"].includes(payload.decision ?? "")
      ) {
        return jsonError("Approval and decision are required");
      }
      const approval = await db
        .select({
          id: approvals.id,
          projectId: approvals.projectId,
          clientId: projects.clientId,
        })
        .from(approvals)
        .leftJoin(projects, eq(approvals.projectId, projects.id))
        .where(
          and(
            eq(approvals.id, payload.approvalId),
            eq(approvals.workspaceId, access.workspaceId),
          ),
        )
        .get();
      if (!approval || approval.clientId !== access.clientId) {
        return jsonError("Approval not found", 404);
      }
      await db.batch([
        db
          .update(approvals)
          .set({
            status: payload.decision,
            decisionBy: `client:${access.clientId}`,
            decisionReason: payload.reason?.trim() || null,
            decidedAt: now,
            updatedAt: now,
          })
          .where(eq(approvals.id, payload.approvalId)),
        db.insert(auditEvents).values({
          id: makeId("audit"),
          workspaceId: WORKSPACE_ID,
          actorType: "client",
          actorId: access.clientId,
          action: `approval.${payload.decision}`,
          targetType: "approval",
          targetId: payload.approvalId,
          riskLevel: "medium",
          outcome: "succeeded",
          metadataJson: "{}",
          occurredAt: now,
        }),
      ]);
      await captureAutomationSignal(
        {
          workspaceId: WORKSPACE_ID,
          eventType: "approval_decided",
          sourceType: "approval",
          sourceId: approval.id,
          projectId: approval.projectId,
          clientId: access.clientId,
          category: "approval",
          signalKey: `approval.client_decision:${payload.decision}`,
          value: {
            decision: payload.decision,
            decisionBy: "client",
          },
          priority: 95,
        },
        db,
      );
      return Response.json({ status: payload.decision });
    }

    return jsonError("Unsupported portal action");
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to complete portal action",
      500,
    );
  }
}
