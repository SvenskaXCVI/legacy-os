import { getDb } from "../../../db";
import { appointments, auditEvents } from "../../../db/schema";
import { actorFrom, jsonError, makeId, WORKSPACE_ID } from "../_lib";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      clientId?: string;
      projectId?: string;
      appointmentType?: string;
      startsAt?: string;
      endsAt?: string;
      location?: string;
      notes?: string;
    };
    if (!payload.clientId || !payload.startsAt) {
      return jsonError("Client and start time are required");
    }
    const appointmentId = makeId("apt");
    const now = new Date().toISOString();
    const actor = actorFrom(request);
    const db = getDb();
    await db.batch([
      db.insert(appointments).values({
        id: appointmentId,
        workspaceId: WORKSPACE_ID,
        clientId: payload.clientId,
        projectId: payload.projectId || null,
        appointmentType: payload.appointmentType || "session",
        startsAt: payload.startsAt,
        endsAt: payload.endsAt || null,
        location: payload.location?.trim() || null,
        notes: payload.notes?.trim() || null,
        createdBy: actor,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(auditEvents).values({
        id: makeId("audit"),
        workspaceId: WORKSPACE_ID,
        actorType: "user",
        actorId: actor,
        action: "appointment.scheduled",
        targetType: "appointment",
        targetId: appointmentId,
        riskLevel: "medium",
        outcome: "succeeded",
        metadataJson: JSON.stringify({ startsAt: payload.startsAt }),
        occurredAt: now,
      }),
    ]);
    return Response.json(
      { id: appointmentId, status: "scheduled" },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to schedule appointment",
      500,
    );
  }
}
