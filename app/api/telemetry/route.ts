import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { aiRuns, auditEvents, usageEvents } from "../../../db/schema";

const DEFAULT_WORKSPACE_ID = "legacy-lines";

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function safeJson(value: unknown) {
  return JSON.stringify(value ?? {});
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const hours = Math.min(
      Math.max(Number(url.searchParams.get("hours") ?? "24"), 1),
      720,
    );
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const db = getDb();

    const [runSummary, usageSummary, recentAudit] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)`,
          successful: sql<number>`sum(case when ${aiRuns.status} = 'succeeded' then 1 else 0 end)`,
          held: sql<number>`sum(case when ${aiRuns.status} = 'approval_held' then 1 else 0 end)`,
          averageLatencyMs: sql<number>`avg(${aiRuns.latencyMs})`,
        })
        .from(aiRuns)
        .where(
          sql`${aiRuns.workspaceId} = ${DEFAULT_WORKSPACE_ID} and ${aiRuns.createdAt} >= ${since}`,
        ),
      db
        .select({
          inputTokens: sql<number>`sum(${usageEvents.inputTokens})`,
          outputTokens: sql<number>`sum(${usageEvents.outputTokens})`,
          estimatedCostMicros: sql<number>`sum(${usageEvents.estimatedCostMicros})`,
        })
        .from(usageEvents)
        .where(
          sql`${usageEvents.workspaceId} = ${DEFAULT_WORKSPACE_ID} and ${usageEvents.occurredAt} >= ${since}`,
        ),
      db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.workspaceId, DEFAULT_WORKSPACE_ID))
        .orderBy(desc(auditEvents.occurredAt))
        .limit(50),
    ]);

    return Response.json({
      windowHours: hours,
      runs: runSummary[0] ?? {},
      usage: usageSummary[0] ?? {},
      recentAudit,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to read telemetry";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      kind?: string;
      action?: string;
      target?: string;
      risk?: string;
      correlationId?: string;
      contentCaptured?: boolean;
      metadata?: Record<string, unknown>;
    };
    const action = payload.action?.trim();
    if (!action) {
      return Response.json({ error: "action is required" }, { status: 400 });
    }

    const actorEmail =
      request.headers.get("oai-authenticated-user-email") ?? "local-preview";
    const recordId = id("audit");
    const db = getDb();

    await db.insert(auditEvents).values({
      id: recordId,
      workspaceId: DEFAULT_WORKSPACE_ID,
      actorType: payload.kind === "ai_event" ? "agent" : "user",
      actorId: actorEmail,
      action,
      targetType: payload.target ? "ui_surface" : null,
      targetId: payload.target ?? null,
      riskLevel: payload.risk ?? "low",
      outcome: "recorded",
      correlationId: payload.correlationId ?? null,
      metadataJson: safeJson({
        ...payload.metadata,
        contentCaptured: payload.contentCaptured ?? false,
      }),
    });

    return Response.json({ id: recordId, status: "recorded" }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to record telemetry";
    return Response.json({ error: message }, { status: 500 });
  }
}
