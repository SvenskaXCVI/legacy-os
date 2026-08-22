import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  appointments,
  approvals,
  assets,
  auditEvents,
  clientMessages,
  clients,
  notifications,
  portalInvitations,
  projectCandidates,
  projects,
  projectUpdates,
  paymentRequests,
  workspaces,
} from "../../../db/schema";
import {
  jsonError,
  makeId,
  resolveClientAccess,
  WORKSPACE_ID,
} from "../_lib";
import { captureAutomationSignal } from "../../../lib/automation-engine";
import { extractCandidateProject } from "../../../lib/intake-engine";

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
          .select({
            id: clients.id,
            firstName: clients.firstName,
            lastName: clients.lastName,
            displayName: clients.displayName,
            preferredName: clients.preferredName,
            status: clients.status,
          })
          .from(clients)
          .where(
            and(
              eq(clients.id, access.clientId),
              eq(clients.workspaceId, access.workspaceId),
              isNull(clients.archivedAt),
            ),
          )
          .get(),
        db
          .select({
            id: projects.id,
            clientId: projects.clientId,
            title: projects.title,
            lifecyclePhase: projects.lifecyclePhase,
            status: projects.status,
            placement: projects.placement,
            styleTagsJson: projects.styleTagsJson,
            budgetMinCents: projects.budgetMinCents,
            budgetMaxCents: projects.budgetMaxCents,
            targetDate: projects.targetDate,
            nextAction: projects.nextAction,
            clientSummary: projects.clientSummary,
            updatedAt: projects.updatedAt,
          })
          .from(projects)
          .where(
            and(
              eq(projects.clientId, access.clientId),
              eq(projects.workspaceId, access.workspaceId),
              eq(projects.isTest, false),
              isNull(projects.archivedAt),
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
    const [approvalRows, assetRows, updateRows, paymentRows] = projectIds.length
      ? await Promise.all([
          db
            .select({
              id: approvals.id,
              projectId: approvals.projectId,
              assetId: approvals.assetId,
              assetVersion: approvals.assetVersion,
              category: approvals.category,
              subject: approvals.subject,
              summary: approvals.summary,
              status: approvals.status,
              decisionReason: approvals.decisionReason,
              createdAt: approvals.createdAt,
            })
            .from(approvals)
            .where(
              and(
                inArray(approvals.projectId, projectIds),
                eq(approvals.workspaceId, access.workspaceId),
                eq(approvals.audience, "client"),
              ),
            )
            .orderBy(desc(approvals.createdAt)),
          db
            .select({
              id: assets.id,
              clientId: assets.clientId,
              projectId: assets.projectId,
              originalName: assets.originalName,
              mediaType: assets.mediaType,
              mimeType: assets.mimeType,
              byteSize: assets.byteSize,
              sourceType: assets.sourceType,
              assetRole: assets.assetRole,
              visibility: assets.visibility,
              version: assets.version,
              createdAt: assets.createdAt,
            })
            .from(assets)
            .where(
              and(
                inArray(assets.projectId, projectIds),
                eq(assets.workspaceId, access.workspaceId),
                inArray(assets.visibility, ["client_shared", "public"]),
                isNull(assets.deletedAt),
              ),
            )
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
          db
            .select({
              id: paymentRequests.id,
              projectId: paymentRequests.projectId,
              clientId: paymentRequests.clientId,
              kind: paymentRequests.kind,
              title: paymentRequests.title,
              description: paymentRequests.description,
              amountCents: paymentRequests.amountCents,
              amountPaidCents: paymentRequests.amountPaidCents,
              amountRefundedCents: paymentRequests.amountRefundedCents,
              currency: paymentRequests.currency,
              status: paymentRequests.status,
              dueAt: paymentRequests.dueAt,
              approvedAt: paymentRequests.approvedAt,
              paidAt: paymentRequests.paidAt,
              refundedAt: paymentRequests.refundedAt,
              createdAt: paymentRequests.createdAt,
              updatedAt: paymentRequests.updatedAt,
            })
            .from(paymentRequests)
            .where(and(
              eq(paymentRequests.clientId, access.clientId),
              eq(paymentRequests.workspaceId, access.workspaceId),
              inArray(paymentRequests.status, ["approved", "open", "paid", "refund_pending", "partially_refunded", "refunded"]),
            ))
            .orderBy(desc(paymentRequests.createdAt)),
        ])
      : [[], [], [], []];
    const candidateRows = await db
      .select({
        id: projectCandidates.id,
        requestedTitle: projectCandidates.requestedTitle,
        placement: projectCandidates.placement,
        sizeDescription: projectCandidates.sizeDescription,
        styleTagsJson: projectCandidates.styleTagsJson,
        concept: projectCandidates.concept,
        budgetMinCents: projectCandidates.budgetMinCents,
        budgetMaxCents: projectCandidates.budgetMaxCents,
        targetDate: projectCandidates.targetDate,
        status: projectCandidates.status,
        confidenceBps: projectCandidates.confidenceBps,
        proposedProjectId: projectCandidates.proposedProjectId,
        clientResponse: projectCandidates.clientResponse,
        submittedAt: projectCandidates.submittedAt,
        updatedAt: projectCandidates.updatedAt,
      })
      .from(projectCandidates)
      .where(
        and(
          eq(projectCandidates.clientId, access.clientId),
          eq(projectCandidates.workspaceId, access.workspaceId),
        ),
      )
      .orderBy(desc(projectCandidates.submittedAt));

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
      candidates: candidateRows,
      paymentRequests: paymentRows,
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
      action?: "message" | "approval" | "project_intake" | "mark_messages_read";
      projectId?: string;
      body?: string;
      approvalId?: string;
      decision?: "approved" | "revision";
      reason?: string;
      requestKey?: string;
      concept?: string;
      placement?: string;
      sizeDescription?: string;
      style?: string;
      referencesSummary?: string;
      constraints?: string;
      budgetMin?: number;
      budgetMax?: number;
      targetDate?: string;
    };
    const access = await resolveClientAccess(request, payload.token ?? null);
    if (!access) return jsonError("Portal access is invalid or expired", 401);
    const db = getDb();
    const now = new Date().toISOString();

    if (payload.action === "project_intake") {
      if (!payload.requestKey?.trim() || !payload.concept?.trim()) {
        return jsonError("A project concept and request key are required");
      }
      const prior = await db
        .select({ id: projectCandidates.id, status: projectCandidates.status })
        .from(projectCandidates)
        .where(
          and(
            eq(projectCandidates.workspaceId, access.workspaceId),
            eq(projectCandidates.sourceType, "client_portal"),
            eq(projectCandidates.sourceId, payload.requestKey.trim()),
          ),
        )
        .get();
      if (prior) {
        return Response.json({ ...prior, idempotent: true });
      }
      const extracted = extractCandidateProject(payload);
      if (extracted.concept.length < 10) {
        return jsonError("Please describe the tattoo concept in a little more detail");
      }
      const candidateId = makeId("candidate");
      await db.batch([
        db.insert(projectCandidates).values({
          id: candidateId,
          workspaceId: access.workspaceId,
          clientId: access.clientId,
          sourceType: "client_portal",
          sourceId: payload.requestKey.trim(),
          requestedTitle: extracted.requestedTitle,
          placement: extracted.placement,
          sizeDescription: extracted.sizeDescription,
          styleTagsJson: JSON.stringify(extracted.styleTags),
          concept: extracted.concept,
          referencesSummary: extracted.referencesSummary,
          constraints: extracted.constraints,
          budgetMinCents: extracted.budgetMinCents,
          budgetMaxCents: extracted.budgetMaxCents,
          targetDate: extracted.targetDate,
          status: "pending_review",
          confidenceBps: extracted.confidenceBps,
          extractionMethod: extracted.extractionMethod,
          evidenceJson: JSON.stringify(extracted.evidence),
          submittedAt: now,
          createdAt: now,
          updatedAt: now,
        }),
        db.insert(auditEvents).values({
          id: makeId("audit"),
          workspaceId: access.workspaceId,
          actorType: "client",
          actorId: access.clientId,
          action: "project_candidate.submitted",
          targetType: "project_candidate",
          targetId: candidateId,
          riskLevel: "low",
          outcome: "structured",
          metadataJson: JSON.stringify({
            extractionMethod: extracted.extractionMethod,
            confidenceBps: extracted.confidenceBps,
          }),
          occurredAt: now,
        }),
      ]);
      await captureAutomationSignal(
        {
          workspaceId: access.workspaceId,
          eventType: "project_candidate_submitted",
          sourceType: "project_candidate",
          sourceId: candidateId,
          clientId: access.clientId,
          category: "inquiry",
          signalKey: "project.candidate_submitted",
          value: {
            extractionMethod: extracted.extractionMethod,
            confidenceBps: extracted.confidenceBps,
            evidenceFields: extracted.evidence
              .filter((item) => item.present)
              .map((item) => item.field),
          },
          priority: 90,
        },
        db,
      );
      return Response.json(
        {
          id: candidateId,
          status: "pending_review",
          requestedTitle: extracted.requestedTitle,
          confidenceBps: extracted.confidenceBps,
        },
        { status: 201 },
      );
    }

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
              eq(projects.workspaceId, access.workspaceId),
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

    if (payload.action === "mark_messages_read") {
      if (payload.projectId) {
        const project = await db
          .select({ id: projects.id })
          .from(projects)
          .where(
            and(
              eq(projects.id, payload.projectId),
              eq(projects.clientId, access.clientId),
              eq(projects.workspaceId, access.workspaceId),
            ),
          )
          .get();
        if (!project) return jsonError("Project not found", 404);
      }
      await db
        .update(clientMessages)
        .set({ readAt: now })
        .where(
          and(
            eq(clientMessages.workspaceId, access.workspaceId),
            eq(clientMessages.clientId, access.clientId),
            eq(clientMessages.senderType, "owner"),
            isNull(clientMessages.readAt),
            ...(payload.projectId
              ? [
                  or(
                    eq(clientMessages.projectId, payload.projectId),
                    isNull(clientMessages.projectId),
                  ),
                ]
              : []),
          ),
        );
      return Response.json({ status: "read", readAt: now });
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
          audience: approvals.audience,
          status: approvals.status,
          decidedAt: approvals.decidedAt,
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
      if (
        !approval ||
        approval.clientId !== access.clientId ||
        approval.audience !== "client"
      ) {
        return jsonError("Approval not found", 404);
      }
      if (approval.status !== "pending") {
        if (approval.status === payload.decision) {
          return Response.json({
            status: approval.status,
            decidedAt: approval.decidedAt,
            idempotent: true,
          });
        }
        return jsonError("This approval already has a final decision", 409);
      }
      if (payload.decision === "revision" && !payload.reason?.trim()) {
        return jsonError("Please describe what should be revised");
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
        db
          .update(notifications)
          .set({ status: "dismissed", readAt: now, dismissedAt: now })
          .where(
            and(
              eq(notifications.workspaceId, access.workspaceId),
              or(
                eq(notifications.dedupeKey, `approval-overdue:${approval.id}`),
                eq(
                  notifications.dedupeKey,
                  `automation:approval_requested:${approval.projectId || "workspace"}`,
                ),
              ),
            ),
          ),
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
