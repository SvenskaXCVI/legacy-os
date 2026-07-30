import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  auditEvents,
  clients,
  portalInvitations,
} from "../../../../db/schema";
import {
  actorFrom,
  jsonError,
  makeId,
  requireOwner,
  routeError,
  sha256,
  WORKSPACE_ID,
} from "../../_lib";

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as { clientId?: string };
    if (!payload.clientId) return jsonError("clientId is required");
    const db = getDb();
    const client = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, payload.clientId))
      .get();
    if (!client) return jsonError("Client not found", 404);

    const token = `${crypto.randomUUID().replaceAll("-", "")}${crypto
      .randomUUID()
      .replaceAll("-", "")}`;
    const tokenHash = await sha256(token);
    const inviteId = makeId("invite");
    const actor = actorFrom(request);
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + 30);

    await db.batch([
      db
        .update(portalInvitations)
        .set({ status: "revoked" })
        .where(eq(portalInvitations.clientId, payload.clientId)),
      db.insert(portalInvitations).values({
        id: inviteId,
        workspaceId: WORKSPACE_ID,
        clientId: payload.clientId,
        tokenHash,
        tokenHint: token.slice(-6),
        status: "active",
        expiresAt: expires.toISOString(),
        createdBy: actor,
        createdAt: now.toISOString(),
      }),
      db.insert(auditEvents).values({
        id: makeId("audit"),
        workspaceId: WORKSPACE_ID,
        actorType: "user",
        actorId: actor,
        action: "portal.invitation_created",
        targetType: "client",
        targetId: payload.clientId,
        riskLevel: "medium",
        outcome: "succeeded",
        metadataJson: JSON.stringify({ expiresAt: expires.toISOString() }),
        occurredAt: now.toISOString(),
      }),
    ]);

    const portalUrl = `${new URL(request.url).origin}/?portal=${token}`;
    return Response.json(
      {
        id: inviteId,
        token,
        portalUrl,
        expiresAt: expires.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    return routeError(error, "Unable to create portal access");
  }
}
