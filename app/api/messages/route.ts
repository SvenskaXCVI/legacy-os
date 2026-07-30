import { getDb } from "../../../db";
import { auditEvents, clientMessages } from "../../../db/schema";
import { actorFrom, jsonError, makeId, requireOwner, WORKSPACE_ID } from "../_lib";

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
    return Response.json({ id: messageId, status: "sent" }, { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to send message",
      500,
    );
  }
}
