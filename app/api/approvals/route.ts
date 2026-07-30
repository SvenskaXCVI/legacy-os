import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { approvals, auditEvents } from "../../../db/schema";
import { makeId, requireOwner, routeError } from "../_lib";

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
      summary?: string;
      riskLevel?: string;
    };

    const actor =
      request.headers.get("oai-authenticated-user-email") ?? "local-preview";
    const now = new Date().toISOString();
    const db = getDb();

    if (!payload.approvalId && payload.projectId && payload.subject?.trim()) {
      const approvalId = makeId("approval");
      await db.batch([
        db.insert(approvals).values({
          id: approvalId,
          workspaceId: DEFAULT_WORKSPACE_ID,
          projectId: payload.projectId,
          requestedByType: "owner",
          requestedById: actor,
          category: payload.category || "client_approval",
          actionType: "review",
          subject: payload.subject.trim(),
          summary: payload.summary?.trim() || "Client review requested.",
          payloadHash: approvalId,
          evidenceJson: "[]",
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
          metadataJson: JSON.stringify({ projectId: payload.projectId }),
          occurredAt: now,
        }),
      ]);
      return Response.json(
        { approvalId, status: "pending" },
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
        .where(eq(approvals.id, payload.approvalId)),
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
