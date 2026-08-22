import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { approvals, authorityDecisions, toolDefinitions } from "../db/schema";

type Db = ReturnType<typeof getDb>;
export type AuthorityClass = "AUTO" | "AUTO_WITH_LOG" | "ASK" | "OWNER_ONLY" | "DENIED";

export const TOOL_AUTHORITY_POLICY_VERSION = "legacy-tool-authority-v2";

type ToolContract = {
  key: string;
  name: string;
  description: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  sideEffect: "read_only" | "internal_reversible" | "external_reversible" | "external_consequential" | "destructive";
  authority: AuthorityClass;
  retry: { maxAttempts: number; backoff: "none" | "exponential"; retryable: string[] };
  audit: { recordDecision: true; recordInputs: "hash_and_redacted_metadata"; recordOutcome: true };
  agents: string[];
  connector?: string;
};

const commonOutput = { type: "object", required: ["status", "summary"] };
const allInternalAgents = ["chief_of_staff", "client_manager", "design_director", "operations_manager", "scheduling_coordinator", "finance_manager", "content_producer", "knowledge_librarian", "analytics_advisor"];

export const TOOL_CATALOG: readonly ToolContract[] = [
  { key: "read_client", name: "Read client", description: "Read an authorized client record without changing it.", input: { type: "object", required: ["clientId"] }, output: commonOutput, sideEffect: "read_only", authority: "AUTO", retry: { maxAttempts: 2, backoff: "exponential", retryable: ["transient_database"] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: allInternalAgents },
  { key: "search_knowledge", name: "Search knowledge", description: "Retrieve scoped Legacy memory and evidence.", input: { type: "object", required: ["query"] }, output: commonOutput, sideEffect: "read_only", authority: "AUTO", retry: { maxAttempts: 2, backoff: "exponential", retryable: ["transient_database"] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: allInternalAgents },
  { key: "calculate_metrics", name: "Calculate metrics", description: "Calculate factual metrics from authorized workspace records.", input: { type: "object" }, output: commonOutput, sideEffect: "read_only", authority: "AUTO", retry: { maxAttempts: 2, backoff: "exponential", retryable: ["transient_database"] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: ["chief_of_staff", "finance_manager", "analytics_advisor", "operations_manager"] },
  { key: "classify_message", name: "Classify message", description: "Classify an inbound message inside its client and project scope.", input: { type: "object", required: ["clientId"] }, output: commonOutput, sideEffect: "internal_reversible", authority: "AUTO_WITH_LOG", retry: { maxAttempts: 3, backoff: "exponential", retryable: ["model_timeout", "transient_database"] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: ["chief_of_staff", "client_manager"] },
  { key: "analyze_internal", name: "Analyze internal state", description: "Analyze authorized Legacy records without an external side effect.", input: { type: "object" }, output: commonOutput, sideEffect: "internal_reversible", authority: "AUTO_WITH_LOG", retry: { maxAttempts: 3, backoff: "exponential", retryable: ["model_timeout", "transient_database"] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: allInternalAgents },
  { key: "analyze_design", name: "Analyze design", description: "Analyze an authorized project asset while preserving artistic authority.", input: { type: "object", required: ["projectId"] }, output: commonOutput, sideEffect: "internal_reversible", authority: "AUTO_WITH_LOG", retry: { maxAttempts: 2, backoff: "exponential", retryable: ["model_timeout"] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: ["chief_of_staff", "design_director"] },
  { key: "draft_internal", name: "Prepare internal draft", description: "Prepare a draft that remains internal until separately approved.", input: { type: "object" }, output: commonOutput, sideEffect: "internal_reversible", authority: "AUTO_WITH_LOG", retry: { maxAttempts: 3, backoff: "exponential", retryable: ["model_timeout"] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: allInternalAgents },
  { key: "create_internal_task", name: "Create internal task", description: "Create a reversible task in the Legacy workspace.", input: { type: "object", required: ["title"] }, output: commonOutput, sideEffect: "internal_reversible", authority: "AUTO_WITH_LOG", retry: { maxAttempts: 3, backoff: "exponential", retryable: ["transient_database"] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: ["chief_of_staff", "operations_manager"] },
  { key: "reprioritize_internal_work", name: "Reprioritize internal work", description: "Reorder reversible internal priorities from recorded evidence.", input: { type: "object" }, output: commonOutput, sideEffect: "internal_reversible", authority: "AUTO_WITH_LOG", retry: { maxAttempts: 2, backoff: "exponential", retryable: ["transient_database"] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: ["chief_of_staff", "operations_manager"] },
  { key: "draft_response", name: "Draft client response", description: "Prepare but do not send a client response.", input: { type: "object", required: ["clientId"] }, output: commonOutput, sideEffect: "internal_reversible", authority: "AUTO_WITH_LOG", retry: { maxAttempts: 3, backoff: "exponential", retryable: ["model_timeout"] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: ["chief_of_staff", "client_manager"] },
  { key: "sync_social_evidence", name: "Sync social evidence", description: "Read consented professional social metadata through the configured adapter.", input: { type: "object" }, output: commonOutput, sideEffect: "internal_reversible", authority: "AUTO_WITH_LOG", retry: { maxAttempts: 3, backoff: "exponential", retryable: ["provider_timeout", "rate_limit"] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: ["chief_of_staff", "analytics_advisor", "content_producer"], connector: "instagram" },
  { key: "send_client_message", name: "Send client message", description: "Deliver the exact approved message to the private client portal.", input: { type: "object", required: ["clientId", "messageBody"] }, output: commonOutput, sideEffect: "external_consequential", authority: "ASK", retry: { maxAttempts: 2, backoff: "exponential", retryable: ["provider_timeout"] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: ["chief_of_staff", "client_manager"], connector: "client_portal" },
  { key: "send_client_email", name: "Send client email", description: "Deliver the exact approved subject and body through the connected Gmail account.", input: { type: "object", required: ["clientId", "subject", "messageBody"] }, output: commonOutput, sideEffect: "external_consequential", authority: "ASK", retry: { maxAttempts: 1, backoff: "none", retryable: [] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: ["chief_of_staff", "client_manager"], connector: "gmail" },
  { key: "schedule_appointment", name: "Schedule appointment", description: "Create the exact approved appointment after conflict validation.", input: { type: "object", required: ["clientId", "startsAt"] }, output: commonOutput, sideEffect: "external_consequential", authority: "ASK", retry: { maxAttempts: 2, backoff: "exponential", retryable: ["provider_timeout"] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: ["chief_of_staff", "scheduling_coordinator"], connector: "studio_calendar" },
  { key: "reschedule_appointment", name: "Reschedule appointment", description: "Change a committed appointment time after owner approval.", input: { type: "object", required: ["appointmentId", "startsAt"] }, output: commonOutput, sideEffect: "external_consequential", authority: "ASK", retry: { maxAttempts: 1, backoff: "none", retryable: [] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: ["chief_of_staff", "scheduling_coordinator"] },
  { key: "publish_content", name: "Publish content", description: "Publish an approved content artifact through a supported provider.", input: { type: "object", required: ["contentId"] }, output: commonOutput, sideEffect: "external_consequential", authority: "ASK", retry: { maxAttempts: 1, backoff: "none", retryable: [] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: ["chief_of_staff", "content_producer"] },
  { key: "refund_payment", name: "Refund payment", description: "Request a money refund through the payment provider.", input: { type: "object", required: ["paymentId", "amountCents"] }, output: commonOutput, sideEffect: "external_consequential", authority: "ASK", retry: { maxAttempts: 1, backoff: "none", retryable: [] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: ["chief_of_staff", "finance_manager"] },
  { key: "change_price", name: "Change price", description: "Change client-visible project pricing after owner review.", input: { type: "object", required: ["projectId", "amountCents"] }, output: commonOutput, sideEffect: "external_consequential", authority: "ASK", retry: { maxAttempts: 1, backoff: "none", retryable: [] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: ["chief_of_staff", "finance_manager"] },
  { key: "delete_important_record", name: "Delete important record", description: "Delete a durable professional record.", input: { type: "object", required: ["recordId"] }, output: commonOutput, sideEffect: "destructive", authority: "ASK", retry: { maxAttempts: 1, backoff: "none", retryable: [] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: ["chief_of_staff", "operations_manager"] },
  { key: "final_artistic_approval", name: "Final artistic approval", description: "Record the artist's final creative judgment.", input: { type: "object", required: ["assetId"] }, output: commonOutput, sideEffect: "external_consequential", authority: "OWNER_ONLY", retry: { maxAttempts: 1, backoff: "none", retryable: [] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: [] },
  { key: "change_permissions", name: "Change permissions", description: "Change owner, team, or client authorization.", input: { type: "object" }, output: commonOutput, sideEffect: "external_consequential", authority: "OWNER_ONLY", retry: { maxAttempts: 1, backoff: "none", retryable: [] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: [] },
  { key: "charge_payment", name: "Charge payment", description: "Charge a payment method without a client-initiated hosted Checkout session.", input: { type: "object" }, output: commonOutput, sideEffect: "external_consequential", authority: "DENIED", retry: { maxAttempts: 0, backoff: "none", retryable: [] }, audit: { recordDecision: true, recordInputs: "hash_and_redacted_metadata", recordOutcome: true }, agents: [] },
] as const;

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function ensureToolRegistry(workspaceId: string, db: Db = getDb()) {
  const now = new Date().toISOString();
  for (const tool of TOOL_CATALOG) {
    await db.insert(toolDefinitions).values({
      id: `tool_${workspaceId}_${tool.key}`, workspaceId, toolKey: tool.key, displayName: tool.name,
      description: tool.description, inputSchemaJson: JSON.stringify(tool.input), outputSchemaJson: JSON.stringify(tool.output),
      sideEffectClass: tool.sideEffect, approvalClass: tool.authority, retryPolicyJson: JSON.stringify(tool.retry),
      auditBehaviorJson: JSON.stringify(tool.audit), allowedAgentsJson: JSON.stringify(tool.agents), connectorKey: tool.connector || null,
      enabled: true, status: "active", version: 1, policyVersion: TOOL_AUTHORITY_POLICY_VERSION, createdAt: now, updatedAt: now,
    }).onConflictDoUpdate({
      target: [toolDefinitions.workspaceId, toolDefinitions.toolKey],
      set: { displayName: tool.name, description: tool.description, inputSchemaJson: JSON.stringify(tool.input), outputSchemaJson: JSON.stringify(tool.output), sideEffectClass: tool.sideEffect, approvalClass: tool.authority, retryPolicyJson: JSON.stringify(tool.retry), auditBehaviorJson: JSON.stringify(tool.audit), allowedAgentsJson: JSON.stringify(tool.agents), connectorKey: tool.connector || null, policyVersion: TOOL_AUTHORITY_POLICY_VERSION, updatedAt: now },
    });
  }
}

export function toolKeyForTask(taskType: string, requestedAction?: string) {
  if (requestedAction?.trim()) return requestedAction.trim();
  const signal = taskType.toLowerCase();
  if (/message/.test(signal)) return "draft_response";
  if (/design/.test(signal)) return "analyze_design";
  if (/metric|outcome|analytics/.test(signal)) return "calculate_metrics";
  if (/knowledge|memory/.test(signal)) return "search_knowledge";
  return "analyze_internal";
}

export async function evaluateToolAuthority(input: { workspaceId: string; toolKey: string; agentKey?: string | null; actorType: "owner" | "client" | "agent" | "system"; actorId?: string | null; taskId?: string | null; approvalId?: string | null; correlationId: string; payload?: Record<string, unknown>; persist?: boolean }, db: Db = getDb()) {
  await ensureToolRegistry(input.workspaceId, db);
  const tool = await db.select().from(toolDefinitions).where(and(eq(toolDefinitions.workspaceId, input.workspaceId), eq(toolDefinitions.toolKey, input.toolKey))).get();
  let decision: "allowed" | "approval_required" | "owner_only" | "denied" = "denied";
  let reason = "Unregistered tools are denied by default.";
  if (tool && (!tool.enabled || tool.status !== "active")) reason = "This registered tool is disabled.";
  else if (tool) {
    const allowedAgents = JSON.parse(tool.allowedAgentsJson) as string[];
    if (input.actorType === "agent" && !allowedAgents.includes(input.agentKey || "")) reason = "This agent is not allowed to use the requested tool.";
    else if (tool.approvalClass === "DENIED") reason = "Policy explicitly denies this capability.";
    else if (tool.approvalClass === "OWNER_ONLY") {
      decision = input.actorType === "owner" ? "allowed" : "owner_only";
      reason = input.actorType === "owner" ? "This action is reserved for a direct owner operation." : "AI agents cannot exercise owner-only authority.";
    } else if (tool.approvalClass === "ASK") {
      const approval = input.approvalId ? await db.select().from(approvals).where(and(eq(approvals.id, input.approvalId), eq(approvals.workspaceId, input.workspaceId))).get() : null;
      decision = approval?.status === "approved" ? "allowed" : "approval_required";
      reason = approval?.status === "approved" ? "The exact action payload has owner approval." : "The run must pause until the owner approves the exact action.";
    } else {
      decision = "allowed";
      reason = tool.approvalClass === "AUTO" ? "Read-only policy permits automatic execution." : "Reversible internal work is allowed and must be logged.";
    }
  }
  const result = { tool, decision, reason, policyVersion: TOOL_AUTHORITY_POLICY_VERSION };
  if (input.persist !== false) {
    const now = new Date().toISOString();
    const values = { id: makeId("authority"), workspaceId: input.workspaceId, toolKey: input.toolKey, taskId: input.taskId ?? null, approvalId: input.approvalId ?? null, actorType: input.actorType, actorId: input.actorId ?? input.agentKey ?? null, authorityClass: tool?.approvalClass || "DENIED", decision, reason, inputHash: await sha256(JSON.stringify(input.payload || {})), correlationId: input.correlationId, policyVersion: TOOL_AUTHORITY_POLICY_VERSION, evaluatedAt: now, resolvedAt: decision === "approval_required" ? null : now };
    if (input.taskId) await db.insert(authorityDecisions).values(values).onConflictDoUpdate({ target: [authorityDecisions.workspaceId, authorityDecisions.taskId], set: { approvalId: input.approvalId ?? null, authorityClass: tool?.approvalClass || "DENIED", decision, reason, inputHash: values.inputHash, policyVersion: TOOL_AUTHORITY_POLICY_VERSION, evaluatedAt: now, resolvedAt: values.resolvedAt } });
    else await db.insert(authorityDecisions).values(values);
  }
  return result;
}

export async function assertToolExecutionAuthorized(input: Parameters<typeof evaluateToolAuthority>[0], db: Db = getDb()) {
  const result = await evaluateToolAuthority(input, db);
  if (result.decision !== "allowed") throw new Error(result.reason);
  return result.tool!;
}

export async function listToolAuthority(workspaceId: string, db: Db = getDb()) {
  await ensureToolRegistry(workspaceId, db);
  const [tools, decisions] = await Promise.all([
    db.select().from(toolDefinitions).where(eq(toolDefinitions.workspaceId, workspaceId)).orderBy(toolDefinitions.approvalClass, toolDefinitions.displayName),
    db.select().from(authorityDecisions).where(eq(authorityDecisions.workspaceId, workspaceId)).orderBy(desc(authorityDecisions.evaluatedAt)).limit(100),
  ]);
  return { tools, decisions, policyVersion: TOOL_AUTHORITY_POLICY_VERSION };
}
