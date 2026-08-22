import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../db";
import {
  aiEvents, aiRuns, appointments, approvals, auditEvents,
  chiefManagerRuns, chiefManagerSteps, clientMessages, clients, healingCheckins,
  paymentRequests, projects, toolCalls, usageEvents,
} from "../db/schema";
import { executeAgentTask, routeAgentTask } from "./agent-engine";
import { buildMemoryContext, consolidateCaptureMemory, MEMORY_CONTEXT_POLICY_VERSION } from "./memory-engine";
import { runStructuredModel } from "./model-adapter";
import { TOOL_AUTHORITY_POLICY_VERSION, TOOL_CATALOG } from "./tool-authority-engine";

type Db = ReturnType<typeof getDb>;
export const CHIEF_MANAGER_PLAN_VERSION = "chief-manager-plan-v1";

type PlannedStep = {
  title: string;
  purpose: string;
  toolKey: string;
  projectId: string | null;
  clientId: string | null;
  priority: number;
  evidenceRefs: string[];
};

type ChiefPlan = { summary: string; confidenceBps: number; steps: PlannedStep[] };

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function operatingContext(workspaceId: string, projectId: string | null, clientId: string | null, db: Db) {
  const [projectRows, clientRows, appointmentRows, approvalRows, messageRows, healingRows, paymentRows] = await Promise.all([
    db.select().from(projects).where(and(eq(projects.workspaceId, workspaceId), eq(projects.isTest, false), isNull(projects.archivedAt))),
    db.select().from(clients).where(and(eq(clients.workspaceId, workspaceId), isNull(clients.archivedAt))),
    db.select().from(appointments).where(eq(appointments.workspaceId, workspaceId)),
    db.select().from(approvals).where(eq(approvals.workspaceId, workspaceId)),
    db.select().from(clientMessages).where(eq(clientMessages.workspaceId, workspaceId)),
    db.select().from(healingCheckins).where(eq(healingCheckins.workspaceId, workspaceId)),
    db.select().from(paymentRequests).where(eq(paymentRequests.workspaceId, workspaceId)),
  ]);
  const projectSet = new Set(projectRows.map((row) => row.id));
  const clientSet = new Set(clientRows.map((row) => row.id));
  if (projectId && !projectSet.has(projectId)) throw new Error("Chief project scope is not available in this workspace");
  if (clientId && !clientSet.has(clientId)) throw new Error("Chief client scope is not available in this workspace");
  if (projectId && clientId && projectRows.find((row) => row.id === projectId)?.clientId !== clientId) throw new Error("Chief project scope does not belong to the selected client");
  await consolidateCaptureMemory(workspaceId, db);
  const memory = await buildMemoryContext({ workspaceId, projectIds: projectId ? [projectId] : projectRows.map((row) => row.id), clientIds: clientId ? [clientId] : clientRows.map((row) => row.id), maxItems: 16, maxCharacters: 6_000 }, db);
  const now = Date.now();
  const pendingApprovals = approvalRows.filter((row) => row.status === "pending" && (!row.projectId || projectSet.has(row.projectId)));
  const unreadMessages = messageRows.filter((row) => row.senderType === "client" && !row.readAt && clientSet.has(row.clientId) && (!row.projectId || projectSet.has(row.projectId)));
  const upcoming = appointmentRows.filter((row) => new Date(row.startsAt).getTime() >= now && new Date(row.startsAt).getTime() <= now + 48 * 60 * 60_000 && (!row.projectId || projectSet.has(row.projectId)));
  const healingAttention = healingRows.filter((row) => projectSet.has(row.projectId) && (row.concernFlag || ["submitted", "needs_attention"].includes(row.status)));
  const paymentAttention = paymentRows.filter((row) => projectSet.has(row.projectId) && ["open", "approved", "failed"].includes(row.status));
  const missingNextAction = projectRows.filter((row) => row.status === "active" && !row.nextAction);
  return { projectRows, clientRows, memory, pendingApprovals, unreadMessages, upcoming, healingAttention, paymentAttention, missingNextAction, projectSet, clientSet };
}

function deterministicPlan(context: Awaited<ReturnType<typeof operatingContext>>): ChiefPlan {
  const steps: PlannedStep[] = [];
  for (const item of context.healingAttention.slice(0, 2)) steps.push({ title: "Review healing attention", purpose: item.concernFlag ? "Evaluate the recorded healing concern and prepare an owner review summary without medical diagnosis or client contact." : "Review the submitted healing checkpoint and identify the next internal action.", toolKey: "analyze_internal", projectId: item.projectId, clientId: item.clientId, priority: item.concernFlag ? 100 : 92, evidenceRefs: [`healing:${item.id}`, `project:${item.projectId}`] });
  for (const item of context.unreadMessages.slice(0, 2)) steps.push({ title: "Prepare client response draft", purpose: "Classify the unread client message and prepare an internal response draft. Do not send it.", toolKey: "draft_response", projectId: item.projectId, clientId: item.clientId, priority: 88, evidenceRefs: [`message:${item.id}`, `client:${item.clientId}`] });
  for (const item of context.pendingApprovals.slice(0, 2)) steps.push({ title: "Explain approval dependency", purpose: "Summarize what this pending approval blocks and what evidence the owner should review.", toolKey: "analyze_internal", projectId: item.projectId, clientId: null, priority: 84, evidenceRefs: [`approval:${item.id}`] });
  for (const item of context.upcoming.slice(0, 2)) steps.push({ title: "Prepare upcoming appointment", purpose: "Review internal project readiness and identify preparation gaps before the scheduled commitment.", toolKey: "create_internal_task", projectId: item.projectId, clientId: item.clientId, priority: 80, evidenceRefs: [`appointment:${item.id}`] });
  for (const item of context.paymentAttention.slice(0, 2)) steps.push({ title: "Review payment state", purpose: "Summarize the recorded payment state and identify an internal next step without charging, refunding, or contacting the client.", toolKey: "analyze_internal", projectId: item.projectId, clientId: item.clientId, priority: item.status === "failed" ? 78 : 66, evidenceRefs: [`payment:${item.id}`] });
  for (const item of context.missingNextAction.slice(0, 2)) steps.push({ title: "Resolve missing project action", purpose: "Review the project lifecycle and recommend the next internal action from recorded evidence.", toolKey: "analyze_internal", projectId: item.id, clientId: item.clientId, priority: 60, evidenceRefs: [`project:${item.id}`] });
  const selected = steps.sort((a, b) => b.priority - a.priority).slice(0, 5);
  return { summary: selected.length ? `The Chief found ${selected.length} evidence-backed action${selected.length === 1 ? "" : "s"} and delegated them within current authority.` : "The current operating state is contained; no new specialist delegation is required.", confidenceBps: selected.length ? 9000 : 10000, steps: selected };
}

function structuredSchema(toolKeys: string[]) {
  return { type: "object", additionalProperties: false, required: ["summary", "confidenceBps", "steps"], properties: { summary: { type: "string", maxLength: 600 }, confidenceBps: { type: "integer", minimum: 0, maximum: 10000 }, steps: { type: "array", maxItems: 5, items: { type: "object", additionalProperties: false, required: ["title", "purpose", "toolKey", "projectId", "clientId", "priority", "evidenceRefs"], properties: { title: { type: "string", maxLength: 180 }, purpose: { type: "string", maxLength: 800 }, toolKey: { type: "string", enum: toolKeys }, projectId: { type: ["string", "null"] }, clientId: { type: ["string", "null"] }, priority: { type: "integer", minimum: 0, maximum: 100 }, evidenceRefs: { type: "array", maxItems: 8, items: { type: "string" } } } } } } };
}

function traceStatus(taskStatus: string) {
  if (taskStatus === "held_for_approval") return "awaiting_approval";
  if (taskStatus === "ready_for_connector") return "awaiting_execution";
  return taskStatus;
}

export async function runChiefManager(input: { workspaceId: string; requestedBy: string; objective?: string; mode?: "operating_brief" | "command"; projectId?: string | null; clientId?: string | null; requestedTool?: string | null; actionPayload?: Record<string, unknown>; idempotencyKey: string }, db: Db = getDb()) {
  const existing = await db.select().from(chiefManagerRuns).where(and(eq(chiefManagerRuns.workspaceId, input.workspaceId), eq(chiefManagerRuns.idempotencyKey, input.idempotencyKey))).get();
  if (existing) return { run: existing, steps: await db.select().from(chiefManagerSteps).where(eq(chiefManagerSteps.managerRunId, existing.id)).orderBy(chiefManagerSteps.sequence), idempotent: true };
  const started = new Date();
  const runId = makeId("chief_run");
  const aiRunId = makeId("run");
  const correlationId = crypto.randomUUID();
  const objective = input.objective?.trim() || "Review the current operating state, prioritize evidence-backed work, and delegate only what Legacy is authorized to do.";
  const context = await operatingContext(input.workspaceId, input.projectId || null, input.clientId || null, db);
  const contextRefs = [...context.projectRows.map((row) => `project:${row.id}`), ...context.memory.memoryIds.map((id) => `memory:${id}`)].slice(0, 100);
  const facts = { activeProjects: context.projectRows.length, activeClients: context.clientRows.length, pendingApprovals: context.pendingApprovals.length, unreadClientMessages: context.unreadMessages.length, appointmentsWithin48Hours: context.upcoming.length, healingAttention: context.healingAttention.length, paymentAttention: context.paymentAttention.length, projectsMissingNextAction: context.missingNextAction.length };
  await db.batch([
    db.insert(aiRuns).values({ id: aiRunId, workspaceId: input.workspaceId, projectId: input.projectId || null, correlationId, agentName: "Chief of Staff Manager", purpose: objective, provider: "Legacy OS", model: "planning", promptVersion: CHIEF_MANAGER_PLAN_VERSION, contextPolicyVersion: MEMORY_CONTEXT_POLICY_VERSION, approvalPolicyVersion: TOOL_AUTHORITY_POLICY_VERSION, riskLevel: "medium", contentCapture: "metadata_only", evidenceJson: JSON.stringify({ facts, contextRefs }), status: "running", startedAt: started.toISOString(), createdAt: started.toISOString() }),
    db.insert(chiefManagerRuns).values({ id: runId, workspaceId: input.workspaceId, aiRunId, projectId: input.projectId || null, clientId: input.clientId || null, requestedBy: input.requestedBy, objective, mode: input.mode || "command", status: "planning", provider: "Legacy OS", model: "planning", planVersion: CHIEF_MANAGER_PLAN_VERSION, contextPolicyVersion: MEMORY_CONTEXT_POLICY_VERSION, authorityPolicyVersion: TOOL_AUTHORITY_POLICY_VERSION, contextRefsJson: JSON.stringify(contextRefs), evidenceJson: JSON.stringify(facts), correlationId, idempotencyKey: input.idempotencyKey, startedAt: started.toISOString(), createdAt: started.toISOString(), updatedAt: started.toISOString() }),
    db.insert(aiEvents).values({ id: makeId("evt"), workspaceId: input.workspaceId, runId: aiRunId, sequence: 1, eventType: "chief.context_built", status: "succeeded", summary: "The Chief built a metadata-only operating context from authorized Legacy state.", metadataJson: JSON.stringify({ factCount: Object.keys(facts).length, memoryCount: context.memory.memoryIds.length }), occurredAt: started.toISOString() }),
  ]);

  let plan = deterministicPlan(context);
  let provider = "Legacy OS";
  let model = "deterministic-chief-planner-v1";
  let inputTokens = 0;
  let outputTokens = 0;
  const internalToolKeys = TOOL_CATALOG.filter((tool) => ["AUTO", "AUTO_WITH_LOG"].includes(tool.authority)).map((tool) => tool.key);
  if (input.requestedTool && input.requestedTool !== "analyze_internal") {
    plan = { summary: "The Chief prepared the requested action and routed it to the authority boundary.", confidenceBps: 10000, steps: [{ title: objective.slice(0, 180), purpose: objective.slice(0, 800), toolKey: input.requestedTool, projectId: input.projectId || null, clientId: input.clientId || null, priority: 90, evidenceRefs: contextRefs.slice(0, 8) }] };
  } else {
    try {
      const result = await runStructuredModel<ChiefPlan>({ purpose: "Produce a bounded Chief of Staff delegation plan.", system: "You are the Legacy OS Chief planning adapter. Use only the supplied factual counts, entity IDs, memory titles, objective, and allowed internal tool keys. Never invent records or numbers. Never select an external, financial, publishing, scheduling, permission, destructive, or client-contact action. Return at most five evidence-backed steps. Legacy OS will independently validate every step and remains the system of record and authority.", context: { objective, facts, projectIds: context.projectRows.map((row) => row.id), clientIds: context.clientRows.map((row) => row.id), memory: context.memory.items.map((item) => ({ id: item.id, title: item.title, scopeType: item.scopeType, confidenceBps: item.confidenceBps })), allowedInternalTools: internalToolKeys }, schemaName: "legacy_chief_plan", schema: structuredSchema(internalToolKeys) });
      if (result.usedExternalModel && result.data && Array.isArray(result.data.steps)) { plan = result.data; provider = result.provider; model = result.model; inputTokens = result.inputTokens; outputTokens = result.outputTokens; }
    } catch {
      plan = deterministicPlan(context);
    }
  }

  const validProjectIds = context.projectSet;
  const validClientIds = context.clientSet;
  const validatedSteps = plan.steps.filter((step) => TOOL_CATALOG.some((tool) => tool.key === step.toolKey) && (!step.projectId || validProjectIds.has(step.projectId)) && (!step.clientId || validClientIds.has(step.clientId))).slice(0, 5);
  const recordedSteps: Array<typeof chiefManagerSteps.$inferSelect> = [];
  for (const [index, step] of validatedSteps.entries()) {
    try {
      const task = await routeAgentTask({ workspaceId: input.workspaceId, taskType: `chief_${step.toolKey}`, title: step.title, instructionSummary: step.purpose, requestedAction: step.toolKey, projectId: step.projectId, clientId: step.clientId, parentRunId: aiRunId, requestedByType: "agent", requestedById: "chief_of_staff", sourceType: "chief_manager_run", sourceId: runId, evidence: step.evidenceRefs.map((ref) => ({ ref })), actionPayload: input.requestedTool === step.toolKey ? input.actionPayload : {}, priority: step.priority, idempotencyKey: `${runId}:step:${index + 1}` }, db);
      if (!task) continue;
      const now = new Date().toISOString();
      const stepId = makeId("chief_step");
      await db.batch([
        db.insert(chiefManagerSteps).values({ id: stepId, workspaceId: input.workspaceId, managerRunId: runId, sequence: index + 1, agentKey: task.agentKey, title: step.title, purpose: step.purpose, toolKey: step.toolKey, taskId: task.id, approvalId: task.approvalId, status: traceStatus(task.status), evidenceJson: JSON.stringify(step.evidenceRefs), resultSummary: task.resultSummary, errorSummary: task.errorSummary, startedAt: now, completedAt: task.completedAt, createdAt: now, updatedAt: now }),
        db.insert(toolCalls).values({ id: makeId("tool"), workspaceId: input.workspaceId, runId: aiRunId, approvalId: task.approvalId, toolName: step.toolKey, operation: "delegate_specialist", destination: task.agentKey, parametersHash: await sha256(JSON.stringify({ projectId: step.projectId, clientId: step.clientId, evidenceRefs: step.evidenceRefs, inputFields: Object.keys(input.actionPayload || {}).sort() })), parametersRedactedJson: JSON.stringify({ projectId: step.projectId, clientId: step.clientId, evidenceRefs: step.evidenceRefs, contentCaptured: false }), resultSummary: task.resultSummary || `Delegated to ${task.agentKey}.`, externalSideEffect: task.approvalRequired, status: traceStatus(task.status), startedAt: now, completedAt: task.completedAt }),
        db.insert(aiEvents).values({ id: makeId("evt"), workspaceId: input.workspaceId, runId: aiRunId, sequence: index + 2, eventType: "chief.specialist_delegated", status: traceStatus(task.status), summary: `${step.title} routed to ${task.agentKey}.`, metadataJson: JSON.stringify({ taskId: task.id, toolKey: step.toolKey, approvalId: task.approvalId }), occurredAt: now }),
      ]);
      const recorded = await db.select().from(chiefManagerSteps).where(eq(chiefManagerSteps.id, stepId)).get();
      if (recorded) recordedSteps.push(recorded);
    } catch (error) {
      const now = new Date().toISOString();
      const message = error instanceof Error ? error.message : "Chief delegation failed";
      const stepId = makeId("chief_step");
      await db.insert(chiefManagerSteps).values({ id: stepId, workspaceId: input.workspaceId, managerRunId: runId, sequence: index + 1, agentKey: "chief_of_staff", title: step.title, purpose: step.purpose, toolKey: step.toolKey, status: "denied", evidenceJson: JSON.stringify(step.evidenceRefs), errorSummary: message, startedAt: now, completedAt: now, createdAt: now, updatedAt: now });
      const recorded = await db.select().from(chiefManagerSteps).where(eq(chiefManagerSteps.id, stepId)).get();
      if (recorded) recordedSteps.push(recorded);
    }
  }
  const status = recordedSteps.some((step) => step.status === "awaiting_approval") ? "awaiting_approval" : recordedSteps.some((step) => ["failed", "denied"].includes(step.status)) ? "needs_attention" : "completed";
  const completedAt = new Date().toISOString();
  const nextAction = status === "awaiting_approval" ? "Review the exact pending owner approval." : status === "needs_attention" ? "Review the denied or failed delegation." : "No owner action is required for this run.";
  await db.batch([
    db.update(chiefManagerRuns).set({ status, provider, model, planJson: JSON.stringify({ ...plan, steps: validatedSteps }), summary: plan.summary, nextAction, confidenceBps: Math.max(0, Math.min(10000, Number(plan.confidenceBps || 0))), completedAt: status === "completed" ? completedAt : null, updatedAt: completedAt }).where(eq(chiefManagerRuns.id, runId)),
    db.update(aiRuns).set({ provider, model, reasoningSummary: `The Chief built ${validatedSteps.length} validated delegation step${validatedSteps.length === 1 ? "" : "s"}; each passed through the Legacy tool and authority registry.`, recommendation: plan.summary, confidenceBps: Math.max(0, Math.min(10000, Number(plan.confidenceBps || 0))), status: status === "awaiting_approval" ? "approval_held" : status === "completed" ? "succeeded" : "failed", completedAt: status === "completed" ? completedAt : null, latencyMs: Date.now() - started.getTime() }).where(eq(aiRuns.id, aiRunId)),
    db.insert(usageEvents).values({ id: makeId("usage"), workspaceId: input.workspaceId, runId: aiRunId, provider, model, inputTokens, outputTokens, occurredAt: completedAt }),
    db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: input.workspaceId, actorType: "agent", actorId: "chief_of_staff", action: "chief.manager_run", targetType: "chief_manager_run", targetId: runId, riskLevel: "medium", outcome: status, correlationId, metadataJson: JSON.stringify({ requestedBy: input.requestedBy, stepCount: recordedSteps.length, provider, contentCaptured: false }), occurredAt: completedAt }),
  ]);
  return { run: await db.select().from(chiefManagerRuns).where(eq(chiefManagerRuns.id, runId)).get(), steps: recordedSteps, idempotent: false };
}

export async function resumeChiefManager(workspaceId: string, managerRunId: string, db: Db = getDb()) {
  const run = await db.select().from(chiefManagerRuns).where(and(eq(chiefManagerRuns.id, managerRunId), eq(chiefManagerRuns.workspaceId, workspaceId))).get();
  if (!run) throw new Error("Chief manager run not found");
  const steps = await db.select().from(chiefManagerSteps).where(eq(chiefManagerSteps.managerRunId, run.id)).orderBy(chiefManagerSteps.sequence);
  for (const step of steps) {
    if (!step.taskId) continue;
    const task = await executeAgentTask(step.taskId, workspaceId, db).catch(() => null);
    if (!task) continue;
    await db.update(chiefManagerSteps).set({ status: traceStatus(task.status), resultSummary: task.resultSummary, errorSummary: task.errorSummary, completedAt: task.completedAt, updatedAt: new Date().toISOString() }).where(eq(chiefManagerSteps.id, step.id));
  }
  const refreshed = await db.select().from(chiefManagerSteps).where(eq(chiefManagerSteps.managerRunId, run.id)).orderBy(chiefManagerSteps.sequence);
  const status = refreshed.some((step) => step.status === "awaiting_approval") ? "awaiting_approval" : refreshed.some((step) => step.status === "awaiting_execution") ? "awaiting_execution" : refreshed.some((step) => ["failed", "denied"].includes(step.status)) ? "needs_attention" : "completed";
  const now = new Date().toISOString();
  const nextAction = status === "awaiting_approval" ? "Review the exact pending owner approval." : status === "awaiting_execution" ? "The approved action is ready at its connector boundary." : status === "completed" ? "All delegated work is complete." : "Review the failed or denied step.";
  await db.batch([
    db.update(chiefManagerRuns).set({ status, nextAction, completedAt: status === "completed" ? now : null, updatedAt: now }).where(eq(chiefManagerRuns.id, run.id)),
    db.update(aiRuns).set({ status: status === "completed" ? "succeeded" : status === "awaiting_approval" || status === "awaiting_execution" ? "approval_held" : "failed", completedAt: status === "completed" ? now : null }).where(eq(aiRuns.id, run.aiRunId)),
    db.insert(aiEvents).values({ id: makeId("evt"), workspaceId, runId: run.aiRunId, sequence: refreshed.length + 2, eventType: "chief.run_resumed", status, summary: nextAction, metadataJson: JSON.stringify({ managerRunId: run.id }), occurredAt: now }),
  ]);
  return { run: await db.select().from(chiefManagerRuns).where(eq(chiefManagerRuns.id, run.id)).get(), steps: refreshed };
}

export async function listChiefManagerOperations(workspaceId: string, db: Db = getDb()) {
  const runs = await db.select().from(chiefManagerRuns).where(eq(chiefManagerRuns.workspaceId, workspaceId)).orderBy(desc(chiefManagerRuns.createdAt)).limit(30);
  const steps = await db.select().from(chiefManagerSteps).where(eq(chiefManagerSteps.workspaceId, workspaceId)).orderBy(desc(chiefManagerSteps.createdAt)).limit(150);
  return { runs, steps, planVersion: CHIEF_MANAGER_PLAN_VERSION, contextPolicyVersion: MEMORY_CONTEXT_POLICY_VERSION, authorityPolicyVersion: TOOL_AUTHORITY_POLICY_VERSION };
}
