import { actorFrom, jsonError, requireOwner, WORKSPACE_ID } from "../../_lib";
import { executeConnectorAction } from "../../../../lib/connector-engine";

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json().catch(() => ({}))) as {
      connectionId?: string;
    };
    const execution = await executeConnectorAction({
      workspaceId: WORKSPACE_ID,
      connectorKey: "instagram",
      actionType: "sync_social_evidence",
      actorType: "owner",
      actorId: actorFrom(request),
      payload: { connectionId: payload.connectionId ?? null },
      idempotencyKey: `manual-social-sync:${payload.connectionId || "all"}:${new Date().toISOString().slice(0, 16)}`,
    });
    if (execution?.status === "failed") return Response.json({ error: execution.errorSummary || "Social synchronization failed", execution }, { status: 422 });
    return Response.json({ execution });
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonError(
      error instanceof Error
        ? error.message
        : "Unable to synchronize social evidence",
      500,
    );
  }
}
