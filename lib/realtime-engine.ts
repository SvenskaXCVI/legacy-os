import { and, asc, desc, eq, gt } from "drizzle-orm";
import { getDb } from "../db";
import { realtimeEvents } from "../db/schema";

type Db = ReturnType<typeof getDb>;

const CLIENT_VISIBLE_EVENTS = [
  /^client_/, /^project_/, /^approval_/, /^appointment_/, /^payment_/,
  /^tattoo_session_/, /^healing_/, /^content_/, /^design_/, /^message_/,
];

function clientCanSee(eventType: string) {
  return CLIENT_VISIBLE_EVENTS.some((pattern) => pattern.test(eventType));
}

export async function publishRealtimeCapture(input: {
  workspaceId: string;
  captureId: string;
  clientId?: string | null;
  projectId?: string | null;
  eventType: string;
  sourceType: string;
  sourceId?: string | null;
  title: string;
  changedFields?: string[];
  correlationId?: string | null;
}, db: Db = getDb()) {
  const now = new Date().toISOString();
  const ownerId = `realtime_${crypto.randomUUID()}`;
  await db.insert(realtimeEvents).values({
    id: ownerId,
    workspaceId: input.workspaceId,
    audience: "owner",
    clientId: input.clientId ?? null,
    projectId: input.projectId ?? null,
    eventType: input.eventType,
    entityType: input.sourceType,
    entityId: input.sourceId ?? null,
    title: input.title.slice(0, 240),
    changedFieldsJson: JSON.stringify(input.changedFields ?? []),
    correlationId: input.correlationId ?? null,
    idempotencyKey: `capture:${input.captureId}:owner`,
    createdAt: now,
  }).onConflictDoNothing();

  if (input.clientId && clientCanSee(input.eventType)) {
    await db.insert(realtimeEvents).values({
      id: `realtime_${crypto.randomUUID()}`,
      workspaceId: input.workspaceId,
      audience: "client",
      clientId: input.clientId,
      projectId: input.projectId ?? null,
      eventType: input.eventType,
      entityType: input.sourceType,
      entityId: input.sourceId ?? null,
      title: "Your Legacy project has an update",
      changedFieldsJson: JSON.stringify(input.changedFields ?? []),
      correlationId: input.correlationId ?? null,
      idempotencyKey: `capture:${input.captureId}:client:${input.clientId}`,
      createdAt: now,
    }).onConflictDoNothing();
  }
}

export async function realtimeBatch(input: {
  workspaceId: string;
  audience: "owner" | "client";
  clientId?: string | null;
  after: number;
  limit?: number;
}, db: Db = getDb()) {
  const audienceScope = input.audience === "client"
    ? and(eq(realtimeEvents.audience, "client"), eq(realtimeEvents.clientId, input.clientId || ""))
    : eq(realtimeEvents.audience, "owner");
  return db.select().from(realtimeEvents).where(and(
    eq(realtimeEvents.workspaceId, input.workspaceId),
    audienceScope,
    gt(realtimeEvents.sequence, Math.max(0, input.after)),
  )).orderBy(asc(realtimeEvents.sequence)).limit(Math.max(1, Math.min(input.limit || 50, 100)));
}

export async function latestRealtimeCursor(input: {
  workspaceId: string;
  audience: "owner" | "client";
  clientId?: string | null;
}, db: Db = getDb()) {
  const audienceScope = input.audience === "client"
    ? and(eq(realtimeEvents.audience, "client"), eq(realtimeEvents.clientId, input.clientId || ""))
    : eq(realtimeEvents.audience, "owner");
  const row = await db.select({ sequence: realtimeEvents.sequence }).from(realtimeEvents).where(and(eq(realtimeEvents.workspaceId, input.workspaceId), audienceScope)).orderBy(desc(realtimeEvents.sequence)).limit(1).get();
  return row?.sequence || 0;
}
