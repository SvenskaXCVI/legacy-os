import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  appointments,
  auditEvents,
  clients,
  projects,
} from "../../../db/schema";
import { captureAutomationSignal } from "../../../lib/automation-engine";
import { actorFrom, jsonError, makeId, requireOwner, routeError, WORKSPACE_ID } from "../_lib";

export async function POST(request: Request) {
  try {
    await requireOwner(request);
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
    const client = await db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(
          eq(clients.id, payload.clientId),
          eq(clients.workspaceId, WORKSPACE_ID),
        ),
      )
      .get();
    if (!client) return jsonError("Client not found", 404);
    if (payload.projectId) {
      const project = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, payload.projectId),
            eq(projects.workspaceId, WORKSPACE_ID),
            eq(projects.clientId, payload.clientId),
          ),
        )
        .get();
      if (!project) return jsonError("Project not found for this client", 404);
    }
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
    const startsAt = new Date(payload.startsAt);
    const endsAt = payload.endsAt ? new Date(payload.endsAt) : null;
    await captureAutomationSignal(
      {
        workspaceId: WORKSPACE_ID,
        eventType: "appointment_scheduled",
        sourceType: "appointment",
        sourceId: appointmentId,
        projectId: payload.projectId || null,
        clientId: payload.clientId,
        category: "scheduling",
        signalKey: `appointment.${payload.appointmentType || "session"}`,
        value: {
          appointmentType: payload.appointmentType || "session",
          startsAt: payload.startsAt,
          durationMinutes:
            endsAt && !Number.isNaN(startsAt.getTime())
              ? Math.max(
                  0,
                  Math.round(
                    (endsAt.getTime() - startsAt.getTime()) / 60_000,
                  ),
                )
              : null,
          hasLocation: Boolean(payload.location?.trim()),
        },
        priority: 75,
      },
      db,
    );
    return Response.json(
      { id: appointmentId, status: "scheduled" },
      { status: 201 },
    );
  } catch (error) {
    return routeError(error, "Unable to schedule appointment");
  }
}
