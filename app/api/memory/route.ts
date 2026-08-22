import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditEvents, memoryRecords } from "../../../db/schema";
import {
  buildMemoryContext,
  consolidateCaptureMemory,
} from "../../../lib/memory-engine";
import {
  actorFrom,
  makeId,
  requireOwner,
  routeError,
  WORKSPACE_ID,
} from "../_lib";

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    const db = getDb();
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const clientId = url.searchParams.get("clientId");
    const [records, context] = await Promise.all([
      db
        .select()
        .from(memoryRecords)
        .where(eq(memoryRecords.workspaceId, WORKSPACE_ID))
        .orderBy(desc(memoryRecords.updatedAt))
        .limit(200),
      buildMemoryContext({ workspaceId: WORKSPACE_ID, projectId, clientId }, db),
    ]);
    return Response.json({ records, context });
  } catch (error) {
    return routeError(error, "Unable to load memory");
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const db = getDb();
    const result = await consolidateCaptureMemory(WORKSPACE_ID, db);
    const context = await buildMemoryContext({ workspaceId: WORKSPACE_ID }, db);
    return Response.json({ ...result, context });
  } catch (error) {
    return routeError(error, "Unable to consolidate memory");
  }
}

export async function PATCH(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as {
      id?: string;
      action?: "verify" | "revoke";
      reason?: string;
    };
    if (!payload.id || !["verify", "revoke"].includes(payload.action || "")) {
      return Response.json({ error: "Memory and action are required" }, { status: 400 });
    }
    if (payload.action === "revoke" && !payload.reason?.trim()) {
      return Response.json({ error: "A reason is required to revoke memory" }, { status: 400 });
    }
    const db = getDb();
    const memory = await db
      .select()
      .from(memoryRecords)
      .where(and(eq(memoryRecords.workspaceId, WORKSPACE_ID), eq(memoryRecords.id, payload.id)))
      .get();
    if (!memory) return Response.json({ error: "Memory was not found" }, { status: 404 });
    const now = new Date().toISOString();
    await db.batch([
      db
        .update(memoryRecords)
        .set(payload.action === "verify"
          ? { verificationStatus: "owner_verified", updatedAt: now }
          : { status: "revoked", validTo: now, updatedAt: now })
        .where(eq(memoryRecords.id, memory.id)),
      db.insert(auditEvents).values({
        id: makeId("audit"),
        workspaceId: WORKSPACE_ID,
        actorType: "owner",
        actorId: actorFrom(request),
        action: `memory.${payload.action}`,
        targetType: "memory",
        targetId: memory.id,
        riskLevel: payload.action === "revoke" ? "medium" : "low",
        outcome: "succeeded",
        metadataJson: JSON.stringify({ reason: payload.reason?.trim() || null }),
        occurredAt: now,
      }),
    ]);
    return Response.json({ id: memory.id, status: payload.action === "verify" ? "active" : "revoked" });
  } catch (error) {
    return routeError(error, "Unable to update memory");
  }
}
