import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { captureEvents } from "../db/schema";
import { publishRealtimeCapture } from "./realtime-engine";

type Db = ReturnType<typeof getDb>;

export type UniversalCaptureInput = {
  workspaceId: string;
  projectId?: string | null;
  clientId?: string | null;
  actorType: "owner" | "client" | "agent" | "system" | "external";
  actorId?: string | null;
  channel: "owner" | "client" | "system" | "external";
  eventType: string;
  sourceType: string;
  sourceId?: string | null;
  title: string;
  summary?: string | null;
  metadata?: Record<string, unknown>;
  contentPolicy?: "metadata_only" | "redacted_summary" | "explicit_owner_note";
  consentGrantId?: string | null;
  correlationId?: string | null;
  idempotencyKey?: string;
  occurredAt?: string;
};

const makeId = () => `capture_${crypto.randomUUID()}`;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeMetadata(value: Record<string, unknown> | undefined) {
  return Object.fromEntries(
    Object.entries(value ?? {}).filter(([, item]) =>
      item == null || ["string", "number", "boolean"].includes(typeof item) ||
      Array.isArray(item) || (typeof item === "object" && item !== null),
    ),
  );
}

export async function captureUniversalEvent(
  input: UniversalCaptureInput,
  db: Db = getDb(),
) {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const summary = input.summary?.trim() || null;
  const sourceIdentity = input.sourceId || input.correlationId || occurredAt;
  const idempotencyKey =
    input.idempotencyKey ||
    `${input.channel}:${input.eventType}:${input.sourceType}:${sourceIdentity}`;
  const id = makeId();
  const contentPolicy = input.contentPolicy ?? "metadata_only";
  const contentHash = summary ? await sha256(summary) : null;
  const storedSummary =
    contentPolicy === "explicit_owner_note"
      ? summary?.slice(0, 4_000) || null
      : contentPolicy === "redacted_summary"
        ? summary?.slice(0, 500) || null
        : null;

  const inserted = await db
    .insert(captureEvents)
    .values({
      id,
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      clientId: input.clientId ?? null,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      channel: input.channel,
      eventType: input.eventType,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      title: input.title.trim().slice(0, 240),
      summary: storedSummary,
      contentPolicy,
      contentHash,
      metadataJson: JSON.stringify({
        ...safeMetadata(input.metadata),
        summaryPresent: Boolean(summary),
        summaryCharacters: summary?.length ?? 0,
      }),
      consentGrantId: input.consentGrantId ?? null,
      correlationId: input.correlationId ?? null,
      idempotencyKey,
      status: "normalized",
      occurredAt,
      capturedAt: new Date().toISOString(),
    })
    .onConflictDoNothing()
    .returning({ id: captureEvents.id })
    .get();

  if (inserted?.id) {
    await publishRealtimeCapture({
      workspaceId: input.workspaceId,
      captureId: inserted.id,
      clientId: input.clientId ?? null,
      projectId: input.projectId ?? null,
      eventType: input.eventType,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      title: input.title.trim(),
      changedFields: Object.keys(safeMetadata(input.metadata)),
      correlationId: input.correlationId ?? null,
    }, db);
  }
  return inserted?.id ?? null;
}

export async function backfillAuditCaptureEvents(
  workspaceId: string,
  events: Array<{
    id: string;
    actorType: string;
    actorId: string | null;
    action: string;
    targetType: string | null;
    targetId: string | null;
    riskLevel: string;
    outcome: string;
    correlationId: string | null;
    occurredAt: string;
  }>,
  db: Db = getDb(),
) {
  if (!events.length) return;
  const existing = await db
    .select({ sourceId: captureEvents.sourceId })
    .from(captureEvents)
    .where(
      and(
        eq(captureEvents.workspaceId, workspaceId),
        eq(captureEvents.sourceType, "audit_event"),
        inArray(captureEvents.sourceId, events.map((event) => event.id)),
      ),
    );
  const capturedIds = new Set(existing.map((row) => row.sourceId));
  for (const event of events.filter((item) => !capturedIds.has(item.id))) {
    const channel = event.actorType === "client"
      ? "client"
      : event.actorType === "owner" || event.actorType === "user"
        ? "owner"
        : event.actorType === "external"
          ? "external"
          : "system";
    await captureUniversalEvent(
      {
        workspaceId,
        projectId: event.targetType === "project" ? event.targetId : null,
        clientId: event.targetType === "client" ? event.targetId : null,
        actorType: channel === "owner" ? "owner" : channel,
        actorId: event.actorId,
        channel,
        eventType: event.action,
        sourceType: "audit_event",
        sourceId: event.id,
        title: event.action.replaceAll(".", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
        metadata: {
          riskLevel: event.riskLevel,
          outcome: event.outcome,
          targetType: event.targetType,
          targetId: event.targetId,
          historicalNormalization: true,
        },
        correlationId: event.correlationId,
        idempotencyKey: `audit:${event.id}`,
        occurredAt: event.occurredAt,
      },
      db,
    );
  }
}
