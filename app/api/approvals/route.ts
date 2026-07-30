import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { approvals, auditEvents } from "../../../db/schema";

const DEFAULT_WORKSPACE_ID = "legacy-lines";
const decisions = new Set(["approved", "revision", "rejected"]);

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      approvalId?: string;
      decision?: string;
      category?: string;
      subject?: string;
      reason?: string;
    };

    if (!payload.approvalId || !payload.decision || !decisions.has(payload.decision)) {
      return Response.json(
        { error: "approvalId and a valid decision are required" },
        { status: 400 },
      );
    }

    const actor =
      request.headers.get("oai-authenticated-user-email") ?? "local-preview";
    const now = new Date().toISOString();
    const db = getDb();

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
    const message =
      error instanceof Error ? error.message : "Unable to record decision";
    return Response.json({ error: message }, { status: 500 });
  }
}
