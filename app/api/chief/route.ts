import { listChiefManagerOperations, resumeChiefManager, runChiefManager } from "../../../lib/chief-manager-engine";
import { actorFrom, requireOwner, routeError, WORKSPACE_ID } from "../_lib";

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    return Response.json(await listChiefManagerOperations(WORKSPACE_ID));
  } catch (error) {
    return routeError(error, "Unable to load Chief of Staff operations");
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json().catch(() => ({}))) as {
      action?: "run" | "resume";
      runId?: string;
      objective?: string;
      mode?: "operating_brief" | "command";
      projectId?: string;
      clientId?: string;
      requestedTool?: string;
      actionPayload?: Record<string, unknown>;
      idempotencyKey?: string;
    };
    if (payload.action === "resume") {
      if (!payload.runId) return Response.json({ error: "runId is required to resume the Chief" }, { status: 400 });
      return Response.json(await resumeChiefManager(WORKSPACE_ID, payload.runId));
    }
    if (payload.requestedTool === "send_client_message" && (!payload.clientId || !String(payload.actionPayload?.messageBody || "").trim())) return Response.json({ error: "Choose a client and provide the exact message before requesting approval" }, { status: 400 });
    if (payload.requestedTool === "schedule_appointment" && (!payload.clientId || !String(payload.actionPayload?.startsAt || "").trim())) return Response.json({ error: "Choose a client and exact appointment start time before requesting approval" }, { status: 400 });
    const result = await runChiefManager({
      workspaceId: WORKSPACE_ID,
      requestedBy: actorFrom(request),
      objective: payload.objective,
      mode: payload.mode || "command",
      projectId: payload.projectId || null,
      clientId: payload.clientId || null,
      requestedTool: payload.requestedTool || null,
      actionPayload: payload.actionPayload,
      idempotencyKey: payload.idempotencyKey || `chief:${crypto.randomUUID()}`,
    });
    return Response.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    return routeError(error, "Unable to run the Chief of Staff manager");
  }
}
