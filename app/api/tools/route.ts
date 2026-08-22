import { evaluateToolAuthority, listToolAuthority } from "../../../lib/tool-authority-engine";
import { actorFrom, requireOwner, routeError, WORKSPACE_ID } from "../_lib";

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    return Response.json(await listToolAuthority(WORKSPACE_ID));
  } catch (error) {
    return routeError(error, "Unable to load tool and authority registry");
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as { toolKey?: string; agentKey?: string; input?: Record<string, unknown> };
    if (!payload.toolKey?.trim()) return Response.json({ error: "toolKey is required" }, { status: 400 });
    const evaluation = await evaluateToolAuthority({
      workspaceId: WORKSPACE_ID,
      toolKey: payload.toolKey.trim(),
      agentKey: payload.agentKey || null,
      actorType: payload.agentKey ? "agent" : "owner",
      actorId: payload.agentKey || actorFrom(request),
      correlationId: crypto.randomUUID(),
      payload: payload.input,
    });
    return Response.json({
      toolKey: payload.toolKey,
      authorityClass: evaluation.tool?.approvalClass || "DENIED",
      decision: evaluation.decision,
      reason: evaluation.reason,
      policyVersion: evaluation.policyVersion,
      dryRun: true,
    });
  } catch (error) {
    return routeError(error, "Unable to evaluate tool authority");
  }
}
