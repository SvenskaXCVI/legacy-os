import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { captureEvents, memoryRecords } from "../db/schema";

type Db = ReturnType<typeof getDb>;

export const MEMORY_CONTEXT_POLICY_VERSION = "scoped-memory-v1";

const makeId = () => `memory_${crypto.randomUUID()}`;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function parseObject(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parseIds(value: string) {
  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}

function keyPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

function memoryClassification(eventType: string, explicitOwnerNote: boolean) {
  if (explicitOwnerNote) return "owner_note";
  if (eventType.includes("approval") || eventType.includes("decision")) return "decision";
  if (
    eventType.includes("completed") ||
    eventType.includes("settled") ||
    eventType.includes("paid") ||
    eventType.includes("healing") ||
    eventType === "social_media_observed"
  ) return "outcome";
  if (eventType.includes("preference") || eventType.includes("constraint")) return "preference";
  return null;
}

function confidenceFor(channel: string, explicitOwnerNote: boolean) {
  if (explicitOwnerNote) return 9500;
  if (channel === "owner") return 9000;
  if (channel === "client") return 8500;
  if (channel === "external") return 7000;
  return 7800;
}

function scopeFor(capture: {
  projectId: string | null;
  clientId: string | null;
}) {
  if (capture.projectId) return { scopeType: "project", scopeKey: `project:${capture.projectId}` };
  if (capture.clientId) return { scopeType: "client", scopeKey: `client:${capture.clientId}` };
  return { scopeType: "workspace", scopeKey: "workspace" };
}

export async function consolidateCaptureMemory(
  workspaceId: string,
  db: Db = getDb(),
) {
  const captures = await db
    .select()
    .from(captureEvents)
    .where(
      and(
        eq(captureEvents.workspaceId, workspaceId),
        eq(captureEvents.status, "normalized"),
      ),
    )
    .orderBy(captureEvents.occurredAt)
    .limit(200);

  let created = 0;
  let reinforced = 0;
  let superseded = 0;
  let ignored = 0;

  for (const capture of captures) {
    const explicitOwnerNote = capture.contentPolicy === "explicit_owner_note";
    const memoryType = memoryClassification(capture.eventType, explicitOwnerNote);
    if (!memoryType) {
      await db.update(captureEvents).set({ status: "not_memory" }).where(eq(captureEvents.id, capture.id));
      ignored += 1;
      continue;
    }

    const scope = scopeFor(capture);
    const memoryKey = explicitOwnerNote
      ? `owner-note:${keyPart(capture.title)}`
      : `${memoryType}:${keyPart(capture.eventType)}`;
    const metadata = parseObject(capture.metadataJson);
    const content = explicitOwnerNote && capture.summary
      ? capture.summary
      : `${capture.title}. Source: ${capture.sourceType}${capture.sourceId ? ` ${capture.sourceId}` : ""}. Evidence metadata: ${JSON.stringify(metadata)}.`;
    const contentHash = await sha256(`${scope.scopeKey}:${memoryKey}:${content}`);
    const now = new Date().toISOString();
    const existing = await db
      .select()
      .from(memoryRecords)
      .where(
        and(
          eq(memoryRecords.workspaceId, workspaceId),
          eq(memoryRecords.scopeKey, scope.scopeKey),
          eq(memoryRecords.memoryKey, memoryKey),
          eq(memoryRecords.status, "active"),
        ),
      )
      .orderBy(desc(memoryRecords.version))
      .get();

    if (existing?.contentHash === contentHash) {
      const sources = [...new Set([...parseIds(existing.sourceCaptureIdsJson), capture.id])];
      await db
        .update(memoryRecords)
        .set({
          sourceCaptureIdsJson: JSON.stringify(sources),
          confidenceBps: Math.min(9900, Math.max(existing.confidenceBps, confidenceFor(capture.channel, explicitOwnerNote)) + 100),
          lastReinforcedAt: now,
          updatedAt: now,
        })
        .where(eq(memoryRecords.id, existing.id));
      reinforced += 1;
    } else {
      const id = makeId();
      const version = (existing?.version ?? 0) + 1;
      if (existing) {
        await db
          .update(memoryRecords)
          .set({ status: "superseded", validTo: now, updatedAt: now })
          .where(eq(memoryRecords.id, existing.id));
        superseded += 1;
      }
      await db.insert(memoryRecords).values({
        id,
        workspaceId,
        projectId: capture.projectId,
        clientId: capture.clientId,
        scopeType: scope.scopeType,
        scopeKey: scope.scopeKey,
        memoryKey,
        memoryType,
        title: capture.title,
        content,
        contentHash,
        sourceCaptureIdsJson: JSON.stringify([capture.id]),
        confidenceBps: confidenceFor(capture.channel, explicitOwnerNote),
        sensitivity: capture.clientId ? "client_private" : "internal",
        verificationStatus: explicitOwnerNote ? "owner_asserted" : "system_derived",
        status: "active",
        version,
        supersedesMemoryId: existing?.id ?? null,
        validFrom: now,
        lastReinforcedAt: now,
        createdBy: explicitOwnerNote ? "owner" : "memory-agent",
        createdAt: now,
        updatedAt: now,
      });
      created += 1;
    }
    await db.update(captureEvents).set({ status: "remembered" }).where(eq(captureEvents.id, capture.id));
  }

  return { evaluated: captures.length, created, reinforced, superseded, ignored };
}

export async function buildMemoryContext(
  input: {
    workspaceId: string;
    projectId?: string | null;
    clientId?: string | null;
    projectIds?: string[];
    clientIds?: string[];
    maxItems?: number;
    maxCharacters?: number;
  },
  db: Db = getDb(),
) {
  const scopeKeys = [
    "workspace",
    ...(input.clientId ? [`client:${input.clientId}`] : []),
    ...(input.projectId ? [`project:${input.projectId}`] : []),
    ...(input.clientIds ?? []).map((id) => `client:${id}`),
    ...(input.projectIds ?? []).map((id) => `project:${id}`),
  ];
  const rows = await db
    .select()
    .from(memoryRecords)
    .where(
      and(
        eq(memoryRecords.workspaceId, input.workspaceId),
        eq(memoryRecords.status, "active"),
        inArray(memoryRecords.scopeKey, scopeKeys),
      ),
    );
  const ranked = rows.sort((left, right) => {
    const scopeWeight = (value: string) => value.startsWith("project:") ? 3 : value.startsWith("client:") ? 2 : 1;
    const verificationWeight = (value: string) => value === "owner_verified" ? 3 : value === "owner_asserted" ? 2 : 1;
    return (
      scopeWeight(right.scopeKey) - scopeWeight(left.scopeKey) ||
      verificationWeight(right.verificationStatus) - verificationWeight(left.verificationStatus) ||
      right.confidenceBps - left.confidenceBps ||
      right.lastReinforcedAt.localeCompare(left.lastReinforcedAt)
    );
  });

  const maxItems = Math.min(Math.max(input.maxItems ?? 12, 1), 30);
  const maxCharacters = Math.min(Math.max(input.maxCharacters ?? 6_000, 500), 12_000);
  const selected: typeof ranked = [];
  let characters = 0;
  for (const memory of ranked) {
    const size = memory.title.length + memory.content.length;
    if (selected.length >= maxItems || characters + size > maxCharacters) continue;
    selected.push(memory);
    characters += size;
  }

  return {
    policyVersion: MEMORY_CONTEXT_POLICY_VERSION,
    scope: {
      workspaceId: input.workspaceId,
      clientId: input.clientId ?? null,
      projectId: input.projectId ?? null,
      clientCount: input.clientIds?.length ?? (input.clientId ? 1 : 0),
      projectCount: input.projectIds?.length ?? (input.projectId ? 1 : 0),
    },
    memoryIds: selected.map((memory) => memory.id),
    items: selected.map((memory) => ({
      id: memory.id,
      scopeType: memory.scopeType,
      memoryType: memory.memoryType,
      title: memory.title,
      content: memory.content,
      confidenceBps: memory.confidenceBps,
      verificationStatus: memory.verificationStatus,
      sourceCaptureIds: parseIds(memory.sourceCaptureIdsJson),
    })),
    characters,
    available: rows.length,
    omitted: Math.max(0, rows.length - selected.length),
  };
}
