import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { approvals, assets, auditEvents, projects } from "../../../db/schema";
import { jsonError, makeId, requireOwner, routeError, sha256 } from "../_lib";
import { captureAutomationSignal } from "../../../lib/automation-engine";

const DEFAULT_WORKSPACE_ID = "legacy-lines";
const decisions = new Set(["approved", "revision", "rejected"]);

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as {
      approvalId?: string;
      decision?: string;
      category?: string;
      subject?: string;
      reason?: string;
      projectId?: string;
      assetId?: string;
      summary?: string;
      riskLevel?: string;
    };

    const actor =
      request.headers.get("oai-authenticated-user-email") ?? "local-preview";
    const now = new Date().toISOString();
    const db = getDb();

    if (!payload.approvalId && payload.projectId && payload.subject?.trim()) {
      const project = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, payload.projectId),
            eq(projects.workspaceId, DEFAULT_WORKSPACE_ID),
          ),
        )
        .get();
      if (!project) {
        return Response.json({ error: "Project not found" }, { status: 404 });
      }
      const clientFacing = ["design", "client_approval"].includes(
        payload.category || "client_approval",
      );
      const asset = payload.assetId
        ? await db
            .select()
            .from(assets)
            .where(
              and(
                eq(assets.id, payload.assetId),
                eq(assets.projectId, payload.projectId),
                eq(assets.workspaceId, DEFAULT_WORKSPACE_ID),
                isNull(assets.deletedAt),
              ),
            )
            .get()
        : null;
      if (clientFacing && !asset) {
        return jsonError(
          "Select the exact design version before requesting client approval",
        );
      }
      const approvalId = makeId("approval");
      const payloadHash = asset
        ? await sha256(
            `${payload.projectId}:${asset.id}:${asset.sha256}:${asset.version}`,
          )
        : await sha256(`${payload.projectId}:${approvalId}`);
      await db.batch([
        db.insert(approvals).values({
          id: approvalId,
          workspaceId: DEFAULT_WORKSPACE_ID,
          projectId: payload.projectId,
          assetId: asset?.id ?? null,
          assetSha256: asset?.sha256 ?? null,
          assetVersion: asset?.version ?? null,
          audience: clientFacing ? "client" : "owner",
          requestedByType: "owner",
          requestedById: actor,
          category: payload.category || "client_approval",
          actionType: "review",
          subject: payload.subject.trim(),
          summary: payload.summary?.trim() || "Client review requested.",
          payloadHash,
          payloadRedactedJson: JSON.stringify(
            asset
              ? {
                  assetId: asset.id,
                  originalName: asset.originalName,
                  version: asset.version,
                  sha256: asset.sha256,
                }
              : {},
          ),
          evidenceJson: JSON.stringify(
            asset ? [{ assetId: asset.id, sha256: asset.sha256 }] : [],
          ),
          riskLevel: payload.riskLevel || "medium",
          reversibility: "reversible",
          status: "pending",
          createdAt: now,
          updatedAt: now,
        }),
        db.insert(auditEvents).values({
          id: makeId("audit"),
          workspaceId: DEFAULT_WORKSPACE_ID,
          actorType: "user",
          actorId: actor,
          action: "approval.requested",
          targetType: "approval",
          targetId: approvalId,
          riskLevel: payload.riskLevel || "medium",
          outcome: "recorded",
          metadataJson: JSON.stringify({
            projectId: payload.projectId,
            assetId: asset?.id ?? null,
            assetVersion: asset?.version ?? null,
          }),
          occurredAt: now,
        }),
        ...(asset
          ? [
              db
                .update(assets)
                .set({ visibility: "client_shared" })
                .where(eq(assets.id, asset.id)),
            ]
          : []),
      ]);
      await captureAutomationSignal(
        {
          workspaceId: DEFAULT_WORKSPACE_ID,
          eventType: "approval_requested",
          sourceType: "approval",
          sourceId: approvalId,
          projectId: payload.projectId,
          category: "approval",
          signalKey: `approval.requested:${payload.category || "client_approval"}`,
          value: {
            category: payload.category || "client_approval",
            riskLevel: payload.riskLevel || "medium",
            status: "pending",
          },
          priority: 85,
        },
        db,
      );
      return Response.json(
        {
          approvalId,
          assetId: asset?.id ?? null,
          assetVersion: asset?.version ?? null,
          status: "pending",
        },
        { status: 201 },
      );
    }

    if (
      !payload.approvalId ||
      !payload.decision ||
      !decisions.has(payload.decision)
    ) {
      return Response.json(
        { error: "approvalId and a valid decision are required" },
        { status: 400 },
      );
    }

    const existing = await db
      .select()
      .from(approvals)
      .where(
        and(
          eq(approvals.id, payload.approvalId),
          eq(approvals.workspaceId, DEFAULT_WORKSPACE_ID),
        ),
      )
      .get();
    if (!existing) {
      return Response.json({ error: "Approval not found" }, { status: 404 });
    }

    await db.batch([
      db
        .update(approvals)
        .set({
          status: payload.decision,
          decisionBy: actor,
          decisionReason: payload.reason ?? null,
          decidedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(approvals.id, payload.approvalId),
            eq(approvals.workspaceId, DEFAULT_WORKSPACE_ID),
          ),
        ),
      db.insert(auditEvents).values({
        id: `audit_${crypto.randomUUID()}`,
        workspaceId: DEFAULT_WORKSPACE_ID,
        actorType: "user",
        actorId: actor,
        action: `approval.${payload.decision}`,
        targetType: "approval",
        targetId: payload.approvalId,
        riskLevel: "medium",
        outcome: "recorded",
        correlationId: null,
        metadataJson: JSON.stringify({
          category: payload.category,
          subject: payload.subject,
        }),
      }),
    ]);
    await captureAutomationSignal(
      {
        workspaceId: DEFAULT_WORKSPACE_ID,
        eventType: "approval_decided",
        sourceType: "approval",
        sourceId: existing.id,
        projectId: existing.projectId,
        category: "approval",
        signalKey: `approval.decision:${payload.decision}`,
        value: {
          category: existing.category,
          riskLevel: existing.riskLevel,
          decision: payload.decision,
        },
        priority: 80,
      },
      db,
    );

    return Response.json({
      approvalId: payload.approvalId,
      decision: payload.decision,
      decidedAt: now,
      auditRecorded: true,
    });
  } catch (error) {
    return routeError(error, "Unable to record decision");
  }
}
