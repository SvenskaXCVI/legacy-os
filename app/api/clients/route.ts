import { getDb } from "../../../db";
import { auditEvents, clients } from "../../../db/schema";
import { captureAutomationSignal } from "../../../lib/automation-engine";
import { actorFrom, jsonError, makeId, requireOwner, routeError, WORKSPACE_ID } from "../_lib";

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      preferredChannel?: string;
      notes?: string;
    };
    if (!payload.firstName?.trim() || !payload.lastName?.trim()) {
      return jsonError("First and last name are required");
    }
    const clientId = makeId("cli");
    const actor = actorFrom(request);
    const now = new Date().toISOString();
    const db = getDb();
    await db.batch([
      db.insert(clients).values({
        id: clientId,
        workspaceId: WORKSPACE_ID,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        email: payload.email?.trim() || null,
        phone: payload.phone?.trim() || null,
        preferredChannel: payload.preferredChannel || "email",
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
