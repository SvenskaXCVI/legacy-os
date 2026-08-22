import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  aiEvents,
  aiRuns,
  appointments,
  approvals,
  auditEvents,
  projects,
  usageEvents,
} from "../../../db/schema";
import { actorFrom, makeId, requireOwner, routeError, WORKSPACE_ID } from "../_lib";
import { syncSocialConnections } from "../../../lib/social-sync";

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const db = getDb();
    const startedAt = new Date();
    const socialSync = await syncSocialConnections(WORKSPACE_ID).catch(() => ({
      connectionsSynced: 0,
      mediaObserved: 0,
      projectMatches: 0,
    }));
    const [projectRows, appointmentRows, approvalRows] = await Promise.all([
      db
        .select()
        .from(projects)
        .where(and(eq(projects.workspaceId, WORKSPACE_ID), eq(projects.isTest, false), isNull(projects.archivedAt))),
      db
        .select()
        .from(appointments)
        .where(eq(appointments.workspaceId, WORKSPACE_ID)),
      db
        .select()
        .from(approvals)
        .where(eq(approvals.workspaceId, WORKSPACE_ID)),
    ]);

    const operationalProjectIds = new Set(projectRows.map((item) => item.id));
    const pendingApprovals = approvalRows.filter(
      (item) => item.status === "pending" && (!item.projectId || operationalProjectIds.has(item.projectId)),
    );
    const now = Date.now();
    const upcoming = appointmentRows
      .filter((item) => new Date(item.startsAt).getTime() >= now && (!item.projectId || operationalProjectIds.has(item.projectId)))
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    const missingNextAction = projectRows.filter(
      (item) => item.status === "active" && !item.nextAction,
    );
    const priorities = [
      ...pendingApprovals.slice(0, 3).map((item) => ({
        type: "approval",
        id: item.id,
        title: item.subject,
        detail: item.summary,
      })),
      ...upcoming.slice(0, 3).map((item) => ({
        type: "appointment",
        id: item.id,
        title: `${item.appointmentType} appointment`,
        detail: item.startsAt,
      })),
      ...missingNextAction.slice(0, 3).map((item) => ({
        type: "project",
        id: item.id,
        title: item.title,
        detail: "Choose and schedule the next action",
      })),
    ].slice(0, 5);

    const summary =
      projectRows.length === 0
        ? "Your workspace is ready. Add your first client and project so the Chief of Staff can begin coordinating real work."
        : priorities.length === 0
          ? "Everything recorded is contained. There are no pending approvals, overdue commitments, or projects missing a next action."
          : `${priorities.length} item${priorities.length === 1 ? "" : "s"} deserve attention. The list is ordered by approval dependency, scheduled commitment, and workflow completeness.`;
    const completedAt = new Date();
    const runId = makeId("run");
    const correlationId = crypto.randomUUID();
    const actor = actorFrom(request);
    const latencyMs = completedAt.getTime() - startedAt.getTime();

    await db.batch([
      db.insert(aiRuns).values({
        id: runId,
        workspaceId: WORKSPACE_ID,
        correlationId,
        agentName: "Chief of Staff",
        purpose: "Workspace prioritization",
        provider: "Legacy OS",
        model: "policy-planner-v1",
        promptVersion: "briefing-v1",
        contextPolicyVersion: "workspace-metadata-v1",
        approvalPolicyVersion: "human-final-v1",
        riskLevel: "low",
        contentCapture: "metadata_only",
        reasoningSummary:
          "Ranked pending approvals, upcoming appointments, and incomplete project next actions.",
        recommendation: summary,
        evidenceJson: JSON.stringify({
          projects: projectRows.length,
          appointments: upcoming.length,
          pendingApprovals: pendingApprovals.length,
          socialSync,
        }),
        confidenceBps: 10000,
        status: "succeeded",
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        latencyMs,
        createdAt: startedAt.toISOString(),
      }),
      db.insert(aiEvents).values({
        id: makeId("evt"),
        workspaceId: WORKSPACE_ID,
        runId,
        sequence: 1,
        eventType: "recommendation.created",
        status: "succeeded",
        summary: "Daily briefing priorities calculated from current workspace state.",
        metadataJson: JSON.stringify({ itemCount: priorities.length }),
        occurredAt: completedAt.toISOString(),
      }),
      db.insert(usageEvents).values({
        id: makeId("usage"),
        workspaceId: WORKSPACE_ID,
        runId,
        provider: "Legacy OS",
        model: "policy-planner-v1",
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostMicros: 0,
        pricingVersion: "local-rules",
        occurredAt: completedAt.toISOString(),
      }),
      db.insert(auditEvents).values({
        id: makeId("audit"),
        workspaceId: WORKSPACE_ID,
        actorType: "agent",
        actorId: "chief-of-staff",
        action: "briefing.generated",
        targetType: "workspace",
        targetId: WORKSPACE_ID,
        riskLevel: "low",
        outcome: "succeeded",
        correlationId,
        metadataJson: JSON.stringify({
          requestedBy: actor,
          contentCaptured: false,
        }),
        occurredAt: completedAt.toISOString(),
      }),
    ]);

    return Response.json({
      runId,
      summary,
      priorities,
      confidence: 100,
      generatedAt: completedAt.toISOString(),
    });
  } catch (error) {
    return routeError(error, "Unable to generate briefing");
  }
}
