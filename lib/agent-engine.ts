import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import {
  agentDefinitions,
  agentHandoffs,
  agentTasks,
  aiEvents,
  aiRuns,
  approvals,
  auditEvents,
  specialistEvaluations,
  usageEvents,
} from "../db/schema";
import { buildMemoryContext, MEMORY_CONTEXT_POLICY_VERSION } from "./memory-engine";
import { evaluateSpecialistTask, SPECIALIST_INTELLIGENCE_POLICY_VERSION, SPECIALIST_PROFILES } from "./specialist-intelligence-engine";
import {
  assertToolExecutionAuthorized,
  evaluateToolAuthority,
  toolKeyForTask,
} from "./tool-authority-engine";

type Db = ReturnType<typeof getDb>;

export const AGENT_POLICY_VERSION = "legacy-staff-v1";
export const AGENT_HANDOFF_CONTRACT_VERSION = "bounded-handoff-v1";

export const LEGACY_STAFF = [
  { key: "chief_of_staff", name: "Chief of Staff", role: "Orchestrator", purpose: "Prioritizes work, delegates bounded tasks, and keeps approval boundaries visible.", capabilities: ["triage", "delegate", "brief", "coordinate"], scopes: ["workspace", "project", "client"] },
  { key: "client_manager", name: "Client Manager", role: "Client experience", purpose: "Qualifies requests and prepares clear, approval-gated client follow-up.", capabilities: ["qualify", "draft_follow_up", "summarize_messages"], scopes: ["client", "project"] },
  { key: "design_director", name: "Design Director", role: "Creative planning", purpose: "Organizes references, design requirements, versions, and review readiness.", capabilities: ["classify_assets", "design_brief", "version_review"], scopes: ["project"] },
  { key: "operations_manager", name: "Operations Manager", role: "Workflow control", purpose: "Tracks lifecycle requirements, blockers, sessions, and operational next steps.", capabilities: ["workflow_check", "session_prepare", "blocker_detection"], scopes: ["workspace", "project"] },
  { key: "scheduling_coordinator", name: "Scheduling Coordinator", role: "Calendar planning", purpose: "Prepares appointment options and detects scheduling conflicts.", capabilities: ["schedule_plan", "conflict_check", "reminder_prepare"], scopes: ["workspace", "project", "client"] },
  { key: "finance_manager", name: "Finance Manager", role: "Payment operations", purpose: "Tracks deposits, balances, payment evidence, and owner-approved financial actions.", capabilities: ["payment_review", "balance_summary", "invoice_prepare"], scopes: ["workspace", "project", "client"] },
  { key: "content_producer", name: "Content Producer", role: "Content workflow", purpose: "Prepares rights- and consent-aware content candidates without publishing automatically.", capabilities: ["content_brief", "caption_draft", "rights_check"], scopes: ["project", "client"] },
  { key: "knowledge_librarian", name: "Knowledge Librarian", role: "Memory stewardship", purpose: "Consolidates, scopes, verifies, and retrieves durable workspace memory.", capabilities: ["memory_consolidation", "context_build", "knowledge_link"], scopes: ["workspace", "project", "client"] },
  { key: "analytics_advisor", name: "Analytics Advisor", role: "Evidence and outcomes", purpose: "Evaluates patterns, confidence, outcomes, and evidence-backed recommendations.", capabilities: ["pattern_review", "outcome_measurement", "recommendation"], scopes: ["workspace", "project"] },
] as const;

type AgentKey = (typeof LEGACY_STAFF)[number]["key"];

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function ensureAgentRegistry(workspaceId: string, db: Db = getDb()) {
  const now = new Date().toISOString();
  for (const agent of LEGACY_STAFF) {
    await db.insert(agentDefinitions).values({
      id: `agent_${workspaceId}_${agent.key}`,
      workspaceId,
      agentKey: agent.key,
      displayName: agent.name,
      role: agent.role,
      purpose: agent.purpose,
      capabilitiesJson: JSON.stringify(agent.capabilities),
      allowedScopesJson: JSON.stringify(agent.scopes),
      autonomyPolicy: agent.key === "chief_of_staff" ? "orchestrate_internal" : "bounded_internal",
      status: "active",
      policyVersion: AGENT_POLICY_VERSION,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [agentDefinitions.workspaceId, agentDefinitions.agentKey],
      set: {
        displayName: agent.name,
        role: agent.role,
        purpose: agent.purpose,
        capabilitiesJson: JSON.stringify(agent.capabilities),
        allowedScopesJson: JSON.stringify(agent.scopes),
        policyVersion: AGENT_POLICY_VERSION,
        updatedAt: now,
      },
    });
  }
}

function chooseAgent(input: { taskType: string; category?: string; title?: string }): AgentKey {
  const signal = `${input.taskType} ${input.category || ""} ${input.title || ""}`.toLowerCase();
  if (/client|inquiry|message|intake|follow.?up|response/.test(signal)) return "client_manager";
  if (/design|reference|stencil|asset|creative/.test(signal)) return "design_director";
  if (/appointment|schedule|calendar|reminder/.test(signal)) return "scheduling_coordinator";
  if (/payment|deposit|invoice|refund|finance|balance/.test(signal)) return "finance_manager";
  if (/content|caption|publish|social|portfolio|reel/.test(signal)) return "content_producer";
  if (/memory|knowledge|lesson|note|context/.test(signal)) return "knowledge_librarian";
  if (/pattern|analytics|outcome|metric|learning/.test(signal)) return "analytics_advisor";
  if (/project|session|healing|workflow|lifecycle|operation/.test(signal)) return "operations_manager";
  return "chief_of_staff";
}

function authorityTaskPolicy(tool: { approvalClass: string; sideEffectClass: string }) {
  const approvalRequired = tool.approvalClass === "ASK";
  const riskLevel = tool.sideEffectClass === "destructive" ? "critical" : tool.sideEffectClass.startsWith("external") ? "high" : tool.sideEffectClass === "internal_reversible" ? "medium" : "low";
  return {
    approvalRequired,
    autonomyLevel: approvalRequired ? "owner_approval" : "internal_auto",
    riskLevel,
    reversibility: tool.sideEffectClass.startsWith("external") || tool.sideEffectClass === "destructive" ? "externally_effective" : "reversible",
  };
}

export type RouteAgentTaskInput = {
  workspaceId: string;
  taskType: string;
  title: string;
  instructionSummary: string;
  category?: string;
  requestedAction?: string;
  projectId?: string | null;
  clientId?: string | null;
  parentTaskId?: string | null;
  parentRunId?: string | null;
  requestedByType?: "owner" | "client" | "agent" | "system";
  requestedById?: string | null;
  sourceType?: string;
  sourceId?: string | null;
  evidence?: unknown[];
  actionPayload?: Record<string, unknown>;
  riskLevel?: "low" | "medium" | "high" | "critical";
  priority?: number;
  idempotencyKey?: string;
};

export async function routeAgentTask(input: RouteAgentTaskInput, db: Db = getDb()) {
  await ensureAgentRegistry(input.workspaceId, db);
  const now = new Date().toISOString();
  const agentKey = chooseAgent(input);
  const toolKey = toolKeyForTask(input.taskType, input.requestedAction);
  const correlationId = crypto.randomUUID();
  const authority = await evaluateToolAuthority({ workspaceId: input.workspaceId, toolKey, agentKey, actorType: "agent", actorId: agentKey, correlationId, payload: input.actionPayload, persist: false }, db);
  if (!authority.tool || ["denied", "owner_only"].includes(authority.decision)) throw new Error(authority.reason);
  const policy = authorityTaskPolicy(authority.tool);
  const idempotencyKey = input.idempotencyKey || await sha256([
    AGENT_POLICY_VERSION,
    input.taskType,
    input.sourceType || "manual",
    input.sourceId || "none",
    input.projectId || "workspace",
    input.clientId || "none",
  ].join(":"));
  const existing = await db.select().from(agentTasks).where(and(
    eq(agentTasks.workspaceId, input.workspaceId),
    eq(agentTasks.idempotencyKey, idempotencyKey),
  )).get();
  if (existing) return existing;

  const memoryContext = await buildMemoryContext({
    workspaceId: input.workspaceId,
    projectIds: input.projectId ? [input.projectId] : [],
    clientIds: input.clientId ? [input.clientId] : [],
    maxItems: 12,
    maxCharacters: 4_000,
  }, db);
  const taskId = makeId("agent_task");
  let approvalId: string | null = null;
  if (policy.approvalRequired) {
    approvalId = makeId("approval");
    await db.insert(approvals).values({
      id: approvalId,
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      audience: "owner",
      requestedByType: "agent",
      requestedById: agentKey,
      category: "agent_action",
      actionType: toolKey,
      subject: input.title,
      summary: input.instructionSummary,
      payloadHash: await sha256(JSON.stringify({ taskId, toolKey, payload: input.actionPayload || {} })),
      payloadRedactedJson: JSON.stringify({ taskId, agentKey, toolKey, inputFields: Object.keys(input.actionPayload || {}).sort() }),
      evidenceJson: JSON.stringify([...(input.evidence || []), ...memoryContext.memoryIds.map((id) => ({ memoryId: id }))]),
      riskLevel: policy.riskLevel,
      reversibility: policy.reversibility,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  }
  await db.batch([
    db.insert(agentTasks).values({
      id: taskId,
      workspaceId: input.workspaceId,
      agentKey,
      parentTaskId: input.parentTaskId ?? null,
      parentRunId: input.parentRunId ?? null,
      projectId: input.projectId ?? null,
      clientId: input.clientId ?? null,
      requestedByType: input.requestedByType || "system",
      requestedById: input.requestedById ?? null,
      taskType: input.taskType,
      toolKey,
      title: input.title,
      instructionSummary: input.instructionSummary,
      scopeJson: JSON.stringify({ workspaceId: input.workspaceId, projectId: input.projectId ?? null, clientId: input.clientId ?? null }),
      actionPayloadJson: JSON.stringify(input.actionPayload || {}),
      evidenceJson: JSON.stringify(input.evidence || []),
      contextMemoryIdsJson: JSON.stringify(memoryContext.memoryIds),
      riskLevel: policy.riskLevel,
      reversibility: policy.reversibility,
      autonomyLevel: policy.autonomyLevel,
      approvalRequired: policy.approvalRequired,
      approvalId,
      status: policy.approvalRequired ? "held_for_approval" : "queued",
      priority: input.priority ?? 50,
      correlationId,
      idempotencyKey,
      scheduledFor: now,
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(agentHandoffs).values({
      id: makeId("handoff"),
      workspaceId: input.workspaceId,
      taskId,
      fromAgentKey: "chief_of_staff",
      toAgentKey: agentKey,
      reason: `Routed by ${AGENT_POLICY_VERSION} from ${input.taskType}.`,
      contractVersion: AGENT_HANDOFF_CONTRACT_VERSION,
      inputRefsJson: JSON.stringify({ sourceType: input.sourceType || "manual", sourceId: input.sourceId || null, memoryIds: memoryContext.memoryIds }),
      status: "accepted",
      occurredAt: now,
    }),
    db.insert(auditEvents).values({
      id: makeId("audit"), workspaceId: input.workspaceId, actorType: "agent", actorId: "chief_of_staff",
      action: "agent.task_routed", targetType: "agent_task", targetId: taskId, riskLevel: policy.riskLevel,
      outcome: policy.approvalRequired ? "held_for_approval" : "queued", correlationId,
      metadataJson: JSON.stringify({ agentKey, taskType: input.taskType, toolKey, approvalId, authorityClass: authority.tool.approvalClass, contextCount: memoryContext.memoryIds.length }), occurredAt: now,
    }),
  ]);
  await evaluateToolAuthority({ workspaceId: input.workspaceId, toolKey, agentKey, actorType: "agent", actorId: agentKey, taskId, approvalId, correlationId, payload: input.actionPayload }, db);
  if (!policy.approvalRequired) await executeAgentTask(taskId, input.workspaceId, db);
  return db.select().from(agentTasks).where(eq(agentTasks.id, taskId)).get();
}

export async function executeAgentTask(taskId: string, workspaceId: string, db: Db = getDb()) {
  const task = await db.select().from(agentTasks).where(and(eq(agentTasks.id, taskId), eq(agentTasks.workspaceId, workspaceId))).get();
  if (!task) throw new Error("Agent task not found");
  if (["succeeded", "cancelled"].includes(task.status)) return task;
  const taskApproval = task.approvalId ? await db.select().from(approvals).where(eq(approvals.id, task.approvalId)).get() : null;
  const executionToolKey = taskApproval?.actionType || task.toolKey;
  await assertToolExecutionAuthorized({ workspaceId, toolKey: executionToolKey, agentKey: task.agentKey, actorType: "agent", actorId: task.agentKey, taskId: task.id, approvalId: task.approvalId, correlationId: task.correlationId, payload: JSON.parse(task.actionPayloadJson) as Record<string, unknown> }, db);
  if (task.approvalRequired) {
    const approval = taskApproval;
    if (!approval || approval.status === "pending") throw new Error("Owner approval is required before this task can continue");
    if (approval.status !== "approved") {
      await db.update(agentTasks).set({ status: "cancelled", resultSummary: `Stopped after owner decision: ${approval.status}.`, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(agentTasks.id, task.id));
      return db.select().from(agentTasks).where(eq(agentTasks.id, task.id)).get();
    }
    const now = new Date().toISOString();
    await db.update(agentTasks).set({ status: "ready_for_connector", resultSummary: "Owner approved this externally effective action. It remains queued at the connector boundary until the required service is configured and invoked.", completedAt: now, updatedAt: now }).where(eq(agentTasks.id, task.id));
    await db.insert(auditEvents).values({ id: makeId("audit"), workspaceId, actorType: "agent", actorId: task.agentKey, action: "agent.task_connector_ready", targetType: "agent_task", targetId: task.id, riskLevel: task.riskLevel, outcome: "approval_verified_no_external_side_effect", correlationId: task.correlationId, metadataJson: JSON.stringify({ approvalId: task.approvalId }), occurredAt: now });
    return db.select().from(agentTasks).where(eq(agentTasks.id, task.id)).get();
  }

  const startedAt = new Date();
  await db.update(agentTasks).set({ status: "running", attempts: task.attempts + 1, startedAt: startedAt.toISOString(), errorSummary: null, updatedAt: startedAt.toISOString() }).where(eq(agentTasks.id, task.id));
  const agent = LEGACY_STAFF.find((item) => item.key === task.agentKey) || LEGACY_STAFF[0];
  const contextIds = JSON.parse(task.contextMemoryIdsJson) as string[];
  const runId = makeId("run");
  const specialist = SPECIALIST_PROFILES.some((profile) => profile.agentKey === task.agentKey) ? await evaluateSpecialistTask(task, db) : null;
  const resultSummary = specialist
    ? `${specialist.summary}${specialist.recommendations[0] ? ` Next safe action: ${specialist.recommendations[0].title}.` : ""}`
    : `${agent.name} completed the bounded internal task: ${task.instructionSummary} Evidence and ${contextIds.length} scoped memory item${contextIds.length === 1 ? "" : "s"} were reviewed; no external action was taken.`;
  const completedAt = new Date();
  const commonStatements = [
    db.update(agentTasks).set({ status: "succeeded", resultSummary, completedAt: completedAt.toISOString(), updatedAt: completedAt.toISOString() }).where(eq(agentTasks.id, task.id)),
    db.insert(aiRuns).values({
      id: runId, workspaceId, projectId: task.projectId, parentRunId: task.parentRunId, correlationId: task.correlationId, agentName: agent.name,
      purpose: task.taskType, provider: specialist?.provider || "Legacy OS", model: specialist?.model || "model-agnostic-policy-worker-v1", promptVersion: specialist ? SPECIALIST_INTELLIGENCE_POLICY_VERSION : "agent-task-v1",
      contextPolicyVersion: MEMORY_CONTEXT_POLICY_VERSION, approvalPolicyVersion: "human-final-v1", riskLevel: task.riskLevel,
      contentCapture: "metadata_only", reasoningSummary: specialist ? `${agent.name} evaluated deterministic domain facts, then accepted only evidence-valid structured interpretation.` : `Executed only within the task scope assigned by ${AGENT_POLICY_VERSION}.`,
      recommendation: resultSummary, evidenceJson: JSON.stringify({ taskId: task.id, memoryIds: contextIds, specialistEvidenceRefs: specialist?.evidenceRefs || [] }), confidenceBps: specialist?.confidenceBps || 9000,
      status: "succeeded", startedAt: startedAt.toISOString(), completedAt: completedAt.toISOString(), latencyMs: completedAt.getTime() - startedAt.getTime(), createdAt: startedAt.toISOString(),
    }),
    db.insert(aiEvents).values({ id: makeId("evt"), workspaceId, runId, sequence: 1, eventType: "agent.task_completed", status: "succeeded", summary: resultSummary, metadataJson: JSON.stringify({ taskId: task.id, agentKey: task.agentKey }), occurredAt: completedAt.toISOString() }),
    db.insert(auditEvents).values({ id: makeId("audit"), workspaceId, actorType: "agent", actorId: task.agentKey, action: "agent.task_completed", targetType: "agent_task", targetId: task.id, riskLevel: task.riskLevel, outcome: "succeeded_internal_only", correlationId: task.correlationId, metadataJson: JSON.stringify({ runId, contextMemoryIds: contextIds }), occurredAt: completedAt.toISOString() }),
  ] as const;
  if (specialist) {
    await db.batch([
      ...commonStatements,
      db.insert(specialistEvaluations).values({ id: makeId("specialist"), workspaceId, taskId: task.id, aiRunId: runId, agentKey: task.agentKey, domain: specialist.domain, capabilityKey: specialist.capabilityKey, projectId: task.projectId, clientId: task.clientId, status: "completed", provider: specialist.provider, model: specialist.model, policyVersion: SPECIALIST_INTELLIGENCE_POLICY_VERSION, summary: specialist.summary, factsJson: JSON.stringify(specialist.facts), findingsJson: JSON.stringify(specialist.findings), recommendationsJson: JSON.stringify(specialist.recommendations), evidenceJson: JSON.stringify(specialist.evidenceRefs), limitationsJson: JSON.stringify(specialist.limitations), confidenceBps: specialist.confidenceBps, inputTokens: specialist.inputTokens, outputTokens: specialist.outputTokens, createdAt: completedAt.toISOString() }),
      db.insert(usageEvents).values({ id: makeId("usage"), workspaceId, runId, provider: specialist.provider, model: specialist.model, inputTokens: specialist.inputTokens, outputTokens: specialist.outputTokens, cachedInputTokens: specialist.cachedInputTokens, reasoningTokens: specialist.reasoningTokens, pricingVersion: specialist.provider === "Legacy OS" ? "local-rules" : "provider-invoice-required", occurredAt: completedAt.toISOString() }),
    ]);
  } else await db.batch(commonStatements);
  return db.select().from(agentTasks).where(eq(agentTasks.id, task.id)).get();
}

export async function listAgentOperations(workspaceId: string, db: Db = getDb()) {
  await ensureAgentRegistry(workspaceId, db);
  const [agents, tasks, handoffs] = await Promise.all([
    db.select().from(agentDefinitions).where(eq(agentDefinitions.workspaceId, workspaceId)).orderBy(agentDefinitions.displayName),
    db.select().from(agentTasks).where(eq(agentTasks.workspaceId, workspaceId)).orderBy(desc(agentTasks.createdAt)).limit(100),
    db.select().from(agentHandoffs).where(eq(agentHandoffs.workspaceId, workspaceId)).orderBy(desc(agentHandoffs.occurredAt)).limit(100),
  ]);
  return { agents, tasks, handoffs, policyVersion: AGENT_POLICY_VERSION, contractVersion: AGENT_HANDOFF_CONTRACT_VERSION };
}
