import { routeAgentTask } from "../../../lib/agent-engine";
import { listSpecialistIntelligence, SPECIALIST_PROFILES } from "../../../lib/specialist-intelligence-engine";
import { actorFrom, requireOwner, routeError, WORKSPACE_ID } from "../_lib";

const toolFor = (domain: string, projectId?: string) => domain === "design" && projectId ? "analyze_design" : ["finance", "analytics"].includes(domain) ? "calculate_metrics" : domain === "knowledge" ? "search_knowledge" : "analyze_internal";

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    return Response.json(await listSpecialistIntelligence(WORKSPACE_ID));
  } catch (error) {
    return routeError(error, "Unable to load specialist intelligence");
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json().catch(() => ({}))) as { domain?: string; projectId?: string; clientId?: string; objective?: string; idempotencyKey?: string };
    const requested = payload.domain === "all" ? SPECIALIST_PROFILES : SPECIALIST_PROFILES.filter((profile) => profile.domain === payload.domain);
    if (!requested.length) return Response.json({ error: "Choose a valid specialist domain" }, { status: 400 });
    const rootKey = payload.idempotencyKey || crypto.randomUUID();
    const tasks = [];
    for (const profile of requested) {
      const task = await routeAgentTask({
        workspaceId: WORKSPACE_ID,
        taskType: `${profile.domain}_intelligence_review`,
        title: `${profile.label}: ${payload.objective?.trim() || "Review the current authorized state"}`.slice(0, 180),
        instructionSummary: (payload.objective?.trim() || profile.success).slice(0, 1000),
        requestedAction: toolFor(profile.domain, payload.projectId),
        projectId: payload.projectId || null,
        clientId: payload.clientId || null,
        requestedByType: "owner",
        requestedById: actorFrom(request),
        sourceType: "specialist_console",
        sourceId: rootKey,
        evidence: [{ source: "owner_specialist_request", domain: profile.domain }],
        actionPayload: { projectId: payload.projectId || undefined, clientId: payload.clientId || undefined, query: payload.objective?.trim() || profile.label },
        priority: 70,
        idempotencyKey: `specialist:${rootKey}:${profile.domain}`,
      });
      if (task) tasks.push(task);
    }
    return Response.json({ tasks, operations: await listSpecialistIntelligence(WORKSPACE_ID) }, { status: 201 });
  } catch (error) {
    return routeError(error, "Unable to run specialist intelligence");
  }
}
