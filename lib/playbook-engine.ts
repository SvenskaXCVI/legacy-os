import { and, desc, eq, lte } from "drizzle-orm";
import { getDb } from "../db";
import {
  auditEvents,
  automationPlaybookRuns,
  automationPlaybooks,
  automationPlaybookSteps,
} from "../db/schema";
import { routeAgentTask } from "./agent-engine";

type Db = ReturnType<typeof getDb>;

export const PLAYBOOK_POLICY_VERSION = "tattoo-operations-playbooks-v1";

type PlaybookStep = {
  key: string;
  title: string;
  agentKey: string;
  taskType: string;
  instruction: string;
  priority: number;
  delayMinutes?: number;
};

type PlaybookDefinition = {
  key: string;
  name: string;
  description: string;
  triggers: string[];
  steps: PlaybookStep[];
};

export const PRODUCTION_PLAYBOOKS: PlaybookDefinition[] = [
  {
    key: "inquiry_triage", name: "Inquiry triage", description: "Qualify a new tattoo request and prepare an evidence-backed owner decision.", triggers: ["project_candidate_submitted"],
    steps: [
      { key: "qualify", title: "Qualify project request", agentKey: "client_manager", taskType: "client_inquiry_review", instruction: "Review the structured intake, identify missing information, and prepare a qualification summary without contacting the client.", priority: 90 },
      { key: "decision_brief", title: "Prepare owner intake decision", agentKey: "chief_of_staff", taskType: "inquiry_decision_brief", instruction: "Summarize fit, blockers, evidence, and the safest next owner decision.", priority: 88 },
    ],
  },
  {
    key: "project_launch", name: "Project launch", description: "Connect an approved request to design, operations, and deposit preparation.", triggers: ["project_candidate_approved", "project_created"],
    steps: [
      { key: "workflow", title: "Establish project workflow", agentKey: "operations_manager", taskType: "project_workflow_review", instruction: "Verify project scope, lifecycle state, missing evidence, and the next safe action.", priority: 82 },
      { key: "design", title: "Prepare design brief", agentKey: "design_director", taskType: "design_brief", instruction: "Organize the project concept, placement, style, references, constraints, and review requirements into a design brief.", priority: 80 },
      { key: "deposit", title: "Review deposit readiness", agentKey: "finance_manager", taskType: "payment_review", instruction: "Check whether budget, deposit requirements, and payment-request evidence are complete. Do not create a charge.", priority: 76 },
    ],
  },
  {
    key: "design_approval", name: "Design approval control", description: "Track exact design versions, decisions, revisions, and downstream readiness.", triggers: ["approval_requested", "approval_decided", "project_approval"],
    steps: [
      { key: "version_check", title: "Verify approval evidence", agentKey: "design_director", taskType: "version_review", instruction: "Verify that the decision references the exact immutable design version and identify any revision requirements.", priority: 88 },
      { key: "next_gate", title: "Evaluate next lifecycle gate", agentKey: "operations_manager", taskType: "workflow_check", instruction: "Determine the next evidence-backed lifecycle step without bypassing deposit, scheduling, or session requirements.", priority: 84 },
    ],
  },
  {
    key: "payment_to_booking", name: "Payment to booking", description: "Verify webhook-backed payment outcomes and prepare scheduling work.", triggers: ["payment_paid", "payment_partially_paid", "payment_failed"],
    steps: [
      { key: "settlement", title: "Review verified payment state", agentKey: "finance_manager", taskType: "payment_outcome_review", instruction: "Review the webhook-verified payment result, remaining balance, and any required owner attention.", priority: 92 },
      { key: "booking", title: "Prepare booking options", agentKey: "scheduling_coordinator", taskType: "schedule_plan", instruction: "If payment requirements are satisfied, prepare appointment options and conflicts for owner review. Do not schedule automatically.", priority: 78 },
    ],
  },
  {
    key: "appointment_preparation", name: "Appointment preparation", description: "Prepare the artist, project, and evidence for a scheduled commitment.", triggers: ["appointment_scheduled", "agent_appointment_scheduled", "tattoo_session_planned"],
    steps: [
      { key: "session_packet", title: "Prepare session packet", agentKey: "operations_manager", taskType: "session_prepare", instruction: "Check approval, design/stencil, client notes, placement, equipment, payment, and schedule evidence for the upcoming session.", priority: 86 },
      { key: "client_readiness", title: "Review client readiness", agentKey: "client_manager", taskType: "client_readiness_review", instruction: "Prepare a private checklist of any client-facing information that may need owner-approved communication.", priority: 74 },
    ],
  },
  {
    key: "session_to_healing", name: "Session to healing", description: "Turn completed session evidence into safe aftercare and healing follow-up work.", triggers: ["tattoo_session_completed"],
    steps: [
      { key: "session_outcome", title: "Capture session outcome", agentKey: "operations_manager", taskType: "session_outcome_review", instruction: "Summarize completed session evidence, duration, next session needs, and existing healing schedule without making medical claims.", priority: 94 },
      { key: "aftercare", title: "Prepare aftercare follow-up", agentKey: "client_manager", taskType: "aftercare_review", instruction: "Verify that the standard client-safe aftercare and scheduled healing checkpoints are ready for owner review.", priority: 90 },
      { key: "technique_memory", title: "Capture technique evidence", agentKey: "knowledge_librarian", taskType: "knowledge_review", instruction: "Identify session outcomes and technique observations eligible for scoped memory and later learning.", priority: 68 },
    ],
  },
  {
    key: "healing_review", name: "Healing review", description: "Prioritize submitted healing evidence and escalate concerns to the owner.", triggers: ["healing_checkin_submitted", "healing_checkin_reviewed"],
    steps: [
      { key: "triage", title: "Triage healing evidence", agentKey: "operations_manager", taskType: "healing_triage", instruction: "Review the submitted checkpoint and concern flag, prioritize owner attention, and avoid diagnosis or medical treatment advice.", priority: 100 },
      { key: "relationship", title: "Prepare client follow-up context", agentKey: "client_manager", taskType: "healing_follow_up_review", instruction: "Prepare the project history and client-safe context needed for an owner response.", priority: 92 },
    ],
  },
  {
    key: "completion_learning", name: "Completion and learning", description: "Measure outcomes, preserve lessons, and prepare consent-aware portfolio work.", triggers: ["project_completed"],
    steps: [
      { key: "outcomes", title: "Measure project outcomes", agentKey: "analytics_advisor", taskType: "outcome_analysis", instruction: "Evaluate operational, financial, healing, and engagement outcomes using saved evidence and confidence rules.", priority: 90 },
      { key: "knowledge", title: "Consolidate project lessons", agentKey: "knowledge_librarian", taskType: "project_knowledge_review", instruction: "Convert eligible completed-project evidence into scoped, versioned memory without overwriting history.", priority: 88 },
      { key: "content", title: "Review portfolio readiness", agentKey: "content_producer", taskType: "content_brief", instruction: "Check asset rights and client consent, then prepare a content brief. Do not publish.", priority: 72 },
    ],
  },
  {
    key: "daily_studio_brief", name: "Daily studio brief", description: "Coordinate priorities, client attention, schedule readiness, and financial follow-up.", triggers: ["scheduled_daily_brief", "manual_daily_brief"],
    steps: [
      { key: "priorities", title: "Prioritize the studio day", agentKey: "chief_of_staff", taskType: "daily_prioritization", instruction: "Rank live safety, client communication, approvals, appointments, payments, and stalled projects with evidence.", priority: 100 },
      { key: "operations", title: "Review operational blockers", agentKey: "operations_manager", taskType: "daily_workflow_review", instruction: "Identify projects missing evidence, next actions, or session preparation.", priority: 88 },
      { key: "clients", title: "Review client attention", agentKey: "client_manager", taskType: "daily_client_review", instruction: "Identify unanswered or time-sensitive client needs and prepare draft-only next actions.", priority: 86 },
      { key: "finances", title: "Review payment attention", agentKey: "finance_manager", taskType: "daily_payment_review", instruction: "Identify deposits, balances, failures, and due payment requests requiring owner attention.", priority: 80 },
    ],
  },
];

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export async function ensurePlaybookRegistry(workspaceId: string, db: Db = getDb()) {
  const now = new Date().toISOString();
  for (const playbook of PRODUCTION_PLAYBOOKS) {
    await db.insert(automationPlaybooks).values({
      id: `playbook_${workspaceId}_${playbook.key}`, workspaceId, playbookKey: playbook.key,
      displayName: playbook.name, description: playbook.description, triggerEventsJson: JSON.stringify(playbook.triggers),
      stepsJson: JSON.stringify(playbook.steps), autonomyMode: "safe_auto", enabled: true, status: "active",
      version: 1, policyVersion: PLAYBOOK_POLICY_VERSION, createdAt: now, updatedAt: now,
    }).onConflictDoUpdate({
      target: [automationPlaybooks.workspaceId, automationPlaybooks.playbookKey],
      set: { displayName: playbook.name, description: playbook.description, triggerEventsJson: JSON.stringify(playbook.triggers), stepsJson: JSON.stringify(playbook.steps), policyVersion: PLAYBOOK_POLICY_VERSION, updatedAt: now },
    });
  }
}

async function executePlaybookStep(input: {
  workspaceId: string; runId: string; playbookKey: string; step: PlaybookStep; sequence: number;
  sourceCaptureId?: string | null; sourceEventType: string; projectId?: string | null; clientId?: string | null;
}, db: Db) {
  const scheduledFor = new Date(Date.now() + (input.step.delayMinutes || 0) * 60_000).toISOString();
  const stepId = makeId("playbook_step");
  await db.insert(automationPlaybookSteps).values({
    id: stepId, workspaceId: input.workspaceId, runId: input.runId, sequence: input.sequence,
    stepKey: input.step.key, title: input.step.title, agentKey: input.step.agentKey, actionType: "analyze_internal",
    approvalRequired: false, status: input.step.delayMinutes ? "scheduled" : "queued", scheduledFor,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
  if (input.step.delayMinutes) return;
  const startedAt = new Date().toISOString();
  await db.update(automationPlaybookSteps).set({ status: "running", startedAt, updatedAt: startedAt }).where(eq(automationPlaybookSteps.id, stepId));
  try {
    const task = await routeAgentTask({
      workspaceId: input.workspaceId, taskType: input.step.taskType, title: input.step.title,
      instructionSummary: input.step.instruction, requestedAction: "analyze_internal", projectId: input.projectId ?? null,
      clientId: input.clientId ?? null, requestedByType: "system", requestedById: input.playbookKey,
      sourceType: "automation_playbook", sourceId: input.sourceCaptureId || input.runId,
      evidence: [{ captureId: input.sourceCaptureId || null, eventType: input.sourceEventType, playbookRunId: input.runId }],
      priority: input.step.priority, riskLevel: "low", idempotencyKey: `playbook:${input.runId}:${input.step.key}`,
    }, db);
    const completedAt = new Date().toISOString();
    await db.update(automationPlaybookSteps).set({ taskId: task?.id ?? null, status: task?.status === "succeeded" ? "succeeded" : task?.status || "queued", resultSummary: task?.resultSummary || "Specialist task routed.", completedAt: task?.status === "succeeded" ? completedAt : null, updatedAt: completedAt }).where(eq(automationPlaybookSteps.id, stepId));
  } catch (error) {
    const completedAt = new Date().toISOString();
    await db.update(automationPlaybookSteps).set({ status: "failed", errorSummary: error instanceof Error ? error.message : "Playbook step failed", completedAt, updatedAt: completedAt }).where(eq(automationPlaybookSteps.id, stepId));
  }
}

export async function runPlaybook(input: {
  workspaceId: string; playbookKey: string; sourceEventType: string; sourceCaptureId?: string | null;
  projectId?: string | null; clientId?: string | null; idempotencyKey: string;
}, db: Db = getDb()) {
  await ensurePlaybookRegistry(input.workspaceId, db);
  const existing = await db.select().from(automationPlaybookRuns).where(and(eq(automationPlaybookRuns.workspaceId, input.workspaceId), eq(automationPlaybookRuns.idempotencyKey, input.idempotencyKey))).get();
  if (existing) return existing;
  const definitionRow = await db.select().from(automationPlaybooks).where(and(eq(automationPlaybooks.workspaceId, input.workspaceId), eq(automationPlaybooks.playbookKey, input.playbookKey))).get();
  if (!definitionRow || !definitionRow.enabled || definitionRow.status !== "active") return null;
  const definition = PRODUCTION_PLAYBOOKS.find((item) => item.key === input.playbookKey);
  if (!definition) throw new Error("Playbook definition not found");
  const now = new Date().toISOString();
  const runId = makeId("playbook_run");
  const correlationId = crypto.randomUUID();
  await db.batch([
    db.insert(automationPlaybookRuns).values({ id: runId, workspaceId: input.workspaceId, playbookKey: input.playbookKey, sourceCaptureId: input.sourceCaptureId ?? null, sourceEventType: input.sourceEventType, projectId: input.projectId ?? null, clientId: input.clientId ?? null, correlationId, idempotencyKey: input.idempotencyKey, status: "running", totalSteps: definition.steps.length, startedAt: now, createdAt: now, updatedAt: now }),
    db.update(automationPlaybooks).set({ lastTriggeredAt: now, updatedAt: now }).where(eq(automationPlaybooks.id, definitionRow.id)),
    db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: input.workspaceId, actorType: "system", actorId: "playbook-engine", action: "playbook.run_started", targetType: "playbook_run", targetId: runId, riskLevel: "low", outcome: "running", correlationId, metadataJson: JSON.stringify({ playbookKey: input.playbookKey, sourceEventType: input.sourceEventType, sourceCaptureId: input.sourceCaptureId || null }), occurredAt: now }),
  ]);
  for (const [index, step] of definition.steps.entries()) await executePlaybookStep({ ...input, runId, step, sequence: index + 1 }, db);
  return finalizePlaybookRun(runId, input.workspaceId, db);
}

async function finalizePlaybookRun(runId: string, workspaceId: string, db: Db) {
  const steps = await db.select().from(automationPlaybookSteps).where(eq(automationPlaybookSteps.runId, runId));
  const completedSteps = steps.filter((step) => step.status === "succeeded").length;
  const heldSteps = steps.filter((step) => ["held_for_approval", "scheduled", "queued", "running"].includes(step.status)).length;
  const failedSteps = steps.filter((step) => step.status === "failed").length;
  const status = failedSteps ? "needs_attention" : heldSteps ? "in_progress" : "succeeded";
  const completedAt = status === "succeeded" || status === "needs_attention" ? new Date().toISOString() : null;
  const summary = `${completedSteps} of ${steps.length} steps completed${heldSteps ? `; ${heldSteps} scheduled or waiting` : ""}${failedSteps ? `; ${failedSteps} need attention` : ""}.`;
  await db.update(automationPlaybookRuns).set({ status, completedSteps, heldSteps, failedSteps, summary, completedAt, updatedAt: new Date().toISOString() }).where(and(eq(automationPlaybookRuns.id, runId), eq(automationPlaybookRuns.workspaceId, workspaceId)));
  return db.select().from(automationPlaybookRuns).where(eq(automationPlaybookRuns.id, runId)).get();
}

export async function runPlaybooksForCapture(input: {
  workspaceId: string; captureId: string; eventType: string; projectId?: string | null; clientId?: string | null;
}, db: Db = getDb()) {
  await ensurePlaybookRegistry(input.workspaceId, db);
  const enabledRows = await db.select().from(automationPlaybooks).where(and(eq(automationPlaybooks.workspaceId, input.workspaceId), eq(automationPlaybooks.enabled, true), eq(automationPlaybooks.status, "active")));
  const matches = enabledRows.filter((row) => (JSON.parse(row.triggerEventsJson) as string[]).includes(input.eventType));
  const runs = [];
  for (const match of matches) {
    const run = await runPlaybook({ workspaceId: input.workspaceId, playbookKey: match.playbookKey, sourceEventType: input.eventType, sourceCaptureId: input.captureId, projectId: input.projectId ?? null, clientId: input.clientId ?? null, idempotencyKey: `capture:${input.captureId}:${match.playbookKey}` }, db);
    if (run) runs.push(run);
  }
  return runs;
}

export async function processDuePlaybookSteps(workspaceId: string, db: Db = getDb()) {
  const due = await db.select().from(automationPlaybookSteps).where(and(eq(automationPlaybookSteps.workspaceId, workspaceId), eq(automationPlaybookSteps.status, "scheduled"), lte(automationPlaybookSteps.scheduledFor, new Date().toISOString()))).limit(25);
  const touchedRuns = new Set<string>();
  for (const row of due) {
    const run = await db.select().from(automationPlaybookRuns).where(eq(automationPlaybookRuns.id, row.runId)).get();
    const definition = PRODUCTION_PLAYBOOKS.find((item) => item.key === run?.playbookKey);
    const step = definition?.steps.find((item) => item.key === row.stepKey);
    if (!run || !step) continue;
    await db.update(automationPlaybookSteps).set({ status: "cancelled", resultSummary: "Superseded by due-step execution record.", completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(automationPlaybookSteps.id, row.id));
    await executePlaybookStep({ workspaceId, runId: row.runId, playbookKey: run.playbookKey, step: { ...step, delayMinutes: 0 }, sequence: row.sequence + 1000, sourceCaptureId: run.sourceCaptureId, sourceEventType: run.sourceEventType, projectId: run.projectId, clientId: run.clientId }, db);
    touchedRuns.add(row.runId);
  }
  for (const runId of touchedRuns) await finalizePlaybookRun(runId, workspaceId, db);
  return { processed: due.length, runsUpdated: touchedRuns.size };
}

export async function listPlaybookOperations(workspaceId: string, db: Db = getDb()) {
  await ensurePlaybookRegistry(workspaceId, db);
  await processDuePlaybookSteps(workspaceId, db);
  const [playbooks, runs, steps] = await Promise.all([
    db.select().from(automationPlaybooks).where(eq(automationPlaybooks.workspaceId, workspaceId)).orderBy(automationPlaybooks.displayName),
    db.select().from(automationPlaybookRuns).where(eq(automationPlaybookRuns.workspaceId, workspaceId)).orderBy(desc(automationPlaybookRuns.createdAt)).limit(100),
    db.select().from(automationPlaybookSteps).where(eq(automationPlaybookSteps.workspaceId, workspaceId)).orderBy(desc(automationPlaybookSteps.createdAt)).limit(250),
  ]);
  return { playbooks, runs, steps, policyVersion: PLAYBOOK_POLICY_VERSION };
}
