import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  aiEvents,
  aiRuns,
  appointments,
  approvals,
  auditEvents,
  clientMessages,
  clients,
  healingCheckins,
  paymentRequests,
  projects,
  usageEvents,
} from "../../../db/schema";
import { actorFrom, makeId, requireOwner, routeError, WORKSPACE_ID } from "../_lib";
import { syncSocialConnections } from "../../../lib/social-sync";
import {
  buildMemoryContext,
  consolidateCaptureMemory,
  MEMORY_CONTEXT_POLICY_VERSION,
} from "../../../lib/memory-engine";

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
    const [projectRows, appointmentRows, approvalRows, messageRows, healingRows, paymentRows, clientRows] = await Promise.all([
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
      db.select().from(clientMessages).where(eq(clientMessages.workspaceId, WORKSPACE_ID)),
      db.select().from(healingCheckins).where(eq(healingCheckins.workspaceId, WORKSPACE_ID)),
      db.select().from(paymentRequests).where(eq(paymentRequests.workspaceId, WORKSPACE_ID)),
      db
        .select()
        .from(clients)
        .where(and(eq(clients.workspaceId, WORKSPACE_ID), isNull(clients.archivedAt))),
    ]);

    const operationalProjectIds = new Set(projectRows.map((item) => item.id));
    const activeClientIds = new Set(clientRows.map((item) => item.id));
    const now = Date.now();
    const pendingApprovals = approvalRows.filter(
      (item) => item.status === "pending" && (!item.projectId || operationalProjectIds.has(item.projectId)),
    );
    const upcoming = appointmentRows
      .filter((item) => new Date(item.startsAt).getTime() >= now && (!item.projectId || operationalProjectIds.has(item.projectId)))
      .sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
    const missingNextAction = projectRows.filter(
      (item) => item.status === "active" && !item.nextAction,
    );
    const unreadClientMessages = messageRows.filter(
      (item) =>
        item.senderType === "client" &&
        !item.readAt &&
        activeClientIds.has(item.clientId) &&
        (!item.projectId || operationalProjectIds.has(item.projectId)),
    );
    const healingAttention = healingRows.filter(
      (item) =>
        operationalProjectIds.has(item.projectId) &&
        (item.concernFlag || item.status === "submitted" || item.status === "needs_attention"),
    );
    const openPayments = paymentRows.filter(
      (item) =>
        operationalProjectIds.has(item.projectId) &&
        ["approved", "open", "failed"].includes(item.status),
    );
    await consolidateCaptureMemory(WORKSPACE_ID, db);
    const memoryContext = await buildMemoryContext(
      {
        workspaceId: WORKSPACE_ID,
        projectIds: projectRows.map((item) => item.id),
        clientIds: clientRows.map((item) => item.id),
        maxItems: 20,
        maxCharacters: 8_000,
      },
      db,
    );
    const priorities = [
      ...healingAttention.map((item) => ({
        type: "healing",
        id: item.id,
        title: item.concernFlag ? `Healing concern · day ${item.checkpointDay}` : `Healing check-in · day ${item.checkpointDay}`,
        detail: item.clientNotes || "Review the client's healing check-in",
        reason: item.concernFlag ? "A client reported a healing concern, so health-related follow-up takes priority." : "A submitted healing update is waiting for owner review.",
        evidence: `Project ${item.projectId} · submitted ${item.submittedAt || item.scheduledFor}`,
        score: item.concernFlag ? 100 : 95,
      })),
      ...unreadClientMessages.map((item) => ({
        type: "message",
        id: item.id,
        title: "Unread client message",
        detail: item.body,
        reason: "The client is waiting for a response and the message has not been marked read.",
        evidence: `${item.projectId ? `Project ${item.projectId}` : `Client ${item.clientId}`} · received ${item.createdAt}`,
        score: 90,
      })),
      ...pendingApprovals.map((item) => ({
        type: "approval",
        id: item.id,
        title: item.subject,
        detail: item.summary,
        reason: "This decision blocks the next client or project step and requires owner approval.",
        evidence: `${item.projectId ? `Project ${item.projectId}` : "Workspace"} · approval status pending`,
        score: 85,
      })),
      ...upcoming.map((item) => ({
        type: "appointment",
        id: item.id,
        title: `${item.appointmentType} appointment`,
        detail: item.startsAt,
        reason: "A scheduled commitment is approaching and should be prepared before lower-risk workflow cleanup.",
        evidence: `${item.projectId ? `Project ${item.projectId}` : "Workspace"} · starts ${item.startsAt}`,
        score: 80 - Math.min(15, Math.floor((new Date(item.startsAt).getTime() - now) / 86_400_000)),
      })),
      ...openPayments.map((item) => ({
        type: "payment",
        id: item.id,
        title: item.status === "failed" ? `Payment needs attention · ${item.title}` : `Payment outstanding · ${item.title}`,
        detail: `${(item.amountCents / 100).toLocaleString("en-US", { style: "currency", currency: item.currency.toUpperCase() })}${item.dueAt ? ` · due ${item.dueAt}` : ""}`,
        reason: item.status === "failed" ? "The last payment attempt failed and may require client follow-up." : "An approved client balance remains unpaid.",
        evidence: `Project ${item.projectId} · payment status ${item.status}`,
        score: item.status === "failed" ? 78 : 70,
      })),
      ...missingNextAction.map((item) => ({
        type: "project",
        id: item.id,
        title: item.title,
        detail: "Choose and schedule the next action",
        reason: "The project is active but has no recorded next action, which can allow work to stall.",
        evidence: `Project ${item.id} · active status · next action empty`,
        score: 60,
      })),
    ]
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 5)
      .map((item) => ({
        type: item.type,
        id: item.id,
        title: item.title,
        detail: item.detail,
        reason: item.reason,
        evidence: item.evidence,
      }));

    const summary =
      projectRows.length === 0
        ? "Your workspace is ready. Add your first client and project so the Chief of Staff can begin coordinating real work."
        : priorities.length === 0
          ? "Everything recorded is contained. There are no pending approvals, overdue commitments, or projects missing a next action."
          : `${priorities.length} item${priorities.length === 1 ? "" : "s"} deserve attention. The list is ordered by client safety, unanswered communication, approval dependency, scheduled commitment, payment state, and workflow completeness.`;
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
        contextPolicyVersion: MEMORY_CONTEXT_POLICY_VERSION,
        approvalPolicyVersion: "human-final-v1",
        riskLevel: "low",
        contentCapture: "metadata_only",
        reasoningSummary:
          "Ranked current client safety, unread communication, approvals, appointments, payments, and incomplete project next actions with explicit evidence.",
        recommendation: summary,
        evidenceJson: JSON.stringify({
          projects: projectRows.length,
          appointments: upcoming.length,
          pendingApprovals: pendingApprovals.length,
          unreadClientMessages: unreadClientMessages.length,
          healingAttention: healingAttention.length,
          openPayments: openPayments.length,
          socialSync,
          memoryIds: memoryContext.memoryIds,
          memoryAvailable: memoryContext.available,
          memoryOmitted: memoryContext.omitted,
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
      memoryContext: {
        policyVersion: memoryContext.policyVersion,
        included: memoryContext.items.length,
        available: memoryContext.available,
        omitted: memoryContext.omitted,
        highlights: memoryContext.items.slice(0, 5).map((item) => ({
          id: item.id,
          title: item.title,
          scopeType: item.scopeType,
          confidenceBps: item.confidenceBps,
          verificationStatus: item.verificationStatus,
        })),
      },
    });
  } catch (error) {
    return routeError(error, "Unable to generate briefing");
  }
}
