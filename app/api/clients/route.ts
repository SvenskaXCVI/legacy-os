import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditEvents, clients, projects } from "../../../db/schema";
import { captureAutomationSignal } from "../../../lib/automation-engine";
import { actorFrom, jsonError, makeId, requireOwner, routeError, WORKSPACE_ID } from "../_lib";

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      displayName?: string;
      preferredName?: string;
      email?: string;
      phone?: string;
      instagramHandle?: string;
      tiktokHandle?: string;
      preferredChannel?: string;
      notes?: string;
    };
    const displayName =
      payload.displayName?.trim() ||
      [payload.firstName?.trim(), payload.lastName?.trim()]
        .filter(Boolean)
        .join(" ");
    if (!displayName) {
      return jsonError("A client display name is required");
    }
    const nameParts = displayName.split(/\s+/).filter(Boolean);
    const firstName = payload.firstName?.trim() || nameParts[0] || "Client";
    const lastName = payload.lastName?.trim() || nameParts.slice(1).join(" ");
    const cleanHandle = (value?: string) =>
      value?.trim().replace(/^@/, "").toLowerCase() || null;
    const clientId = makeId("cli");
    const actor = actorFrom(request);
    const now = new Date().toISOString();
    const db = getDb();
    await db.batch([
      db.insert(clients).values({
        id: clientId,
        workspaceId: WORKSPACE_ID,
        firstName,
        lastName,
        displayName,
        preferredName: payload.preferredName?.trim() || null,
        email: payload.email?.trim() || null,
        phone: payload.phone?.trim() || null,
        instagramHandle: cleanHandle(payload.instagramHandle),
        tiktokHandle: cleanHandle(payload.tiktokHandle),
        preferredChannel: payload.preferredChannel || "email",
        sourceType: "owner_entry",
        identityStatus:
          payload.email?.trim() || payload.phone?.trim() ? "contactable" : "partial",
        notes: payload.notes?.trim() || null,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(auditEvents).values({
        id: makeId("audit"),
        workspaceId: WORKSPACE_ID,
        actorType: "user",
        actorId: actor,
        action: "client.created",
        targetType: "client",
        targetId: clientId,
        riskLevel: "low",
        outcome: "succeeded",
        metadataJson: "{}",
        occurredAt: now,
      }),
    ]);
    await captureAutomationSignal(
      {
        workspaceId: WORKSPACE_ID,
        eventType: "client_created",
        sourceType: "client",
        sourceId: clientId,
        clientId,
        category: "inquiry",
        signalKey: "client.inquiry_created",
        value: {
          preferredChannel: payload.preferredChannel || "email",
          hasEmail: Boolean(payload.email?.trim()),
          hasPhone: Boolean(payload.phone?.trim()),
          hasInstagram: Boolean(cleanHandle(payload.instagramHandle)),
        },
        priority: 80,
      },
      db,
    );
    return Response.json({ id: clientId, status: "created" }, { status: 201 });
  } catch (error) {
    return routeError(error, "Unable to create client");
  }
}

export async function PATCH(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as {
      id?: string;
      action?: "archive" | "restore";
      reason?: string;
    };
    if (!payload.id || !["archive", "restore"].includes(payload.action || "")) {
      return jsonError("Client and valid archive action are required");
    }
    const db = getDb();
    const client = await db.select().from(clients).where(and(eq(clients.id, payload.id), eq(clients.workspaceId, WORKSPACE_ID))).get();
    if (!client) return jsonError("Client not found", 404);
    if (payload.action === "archive") {
      const activeProject = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.clientId, client.id), eq(projects.workspaceId, WORKSPACE_ID), eq(projects.status, "active"), isNull(projects.archivedAt))).get();
      if (activeProject) return jsonError("Archive or complete this client's active projects first", 409);
    }
    const now = new Date().toISOString();
    const actor = actorFrom(request);
    const archived = payload.action === "archive";
    await db.batch([
      db.update(clients).set({ status: archived ? "archived" : "active", archivedAt: archived ? now : null, updatedAt: now }).where(eq(clients.id, client.id)),
      db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "user", actorId: actor, action: archived ? "client.archived" : "client.restored", targetType: "client", targetId: client.id, riskLevel: "medium", outcome: "succeeded", metadataJson: JSON.stringify({ reason: payload.reason?.trim() || null, softDelete: archived }), occurredAt: now }),
    ]);
    return Response.json({ id: client.id, status: archived ? "archived" : "active" });
  } catch (error) {
    return routeError(error, "Unable to update client record");
  }
}
