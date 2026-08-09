import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  auditEvents,
  clientMessages,
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
      body?: string;
    };
    if (!payload.clientId || !payload.body?.trim()) {
      return jsonError("Client and message are required");
    }
    const messageId = makeId("msg");
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
      db.insert(clientMessages).values({
        id: messageId,
        workspaceId: WORKSPACE_ID,
        clientId: payload.clientId,
        projectId: payload.projectId || null,
        senderType: "owner",
        senderId: actor,
        body: payload.body.trim(),
        status: "sent",
        createdAt: now,
      }),
      db.insert(auditEvents).values({
        id: makeId("audit"),
        workspaceId: WORKSPACE_ID,
        actorType: "user",
        actorId: actor,
        action: "client_message.sent",
        targetType: "client",
        targetId: payload.clientId,
        riskLevel: "medium",
        outcome: "succeeded",
        metadataJson: JSON.stringify({ contentCaptured: false }),
        occurredAt: now,
      }),
    ]);
    await captureAutomationSignal(
      {
        workspaceId: WORKSPACE_ID,
        eventType: "owner_message_sent",
        sourceType: "message",
        sourceId: messageId,
        projectId: payload.projectId || null,
        clientId: payload.clientId,
        category: "communication",
        signalKey: "communication.owner_message",
        value: {
          direction: "outbound",
          characterCount: payload.body.trim().length,
          contentCaptured: false,
        },
        priority: 55,
      },
      db,
    );
    return Response.json({ id: messageId, status: "sent" }, { status: 201 });
  } catch (error) {
    return routeError(error, "Unable to send message");
  }
}
