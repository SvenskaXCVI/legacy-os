import {
  executeConnectorAction,
  listConnectorOperations,
} from "../../../lib/connector-engine";
import {
  actorFrom,
  requireOwner,
  routeError,
  WORKSPACE_ID,
} from "../_lib";

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    return Response.json(await listConnectorOperations(WORKSPACE_ID));
  } catch (error) {
    return routeError(error, "Unable to load connector operations");
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as {
      taskId?: string;
      connectorKey?: string;
      actionType?: string;
      actionPayload?: Record<string, unknown>;
      idempotencyKey?: string;
    };
    if (!payload.taskId && !payload.actionType) {
      return Response.json({ error: "A task or connector action is required" }, { status: 400 });
    }
    const execution = await executeConnectorAction({
      workspaceId: WORKSPACE_ID,
      taskId: payload.taskId || null,
      connectorKey: payload.connectorKey,
      actionType: payload.actionType,
      payload: payload.actionPayload,
      actorType: "owner",
      actorId: actorFrom(request),
      idempotencyKey: payload.idempotencyKey || `owner:${payload.taskId || payload.actionType}:${crypto.randomUUID()}`,
    });
    if (execution?.status === "failed") return Response.json({ error: execution.errorSummary || "Connector execution failed", execution }, { status: 422 });
    return Response.json({ execution });
  } catch (error) {
    return routeError(error, "Unable to execute connector action");
  }
}
