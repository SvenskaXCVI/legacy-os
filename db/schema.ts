import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamp = (name: string) =>
  text(name).notNull().default(sql`CURRENT_TIMESTAMP`);

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  domainType: text("domain_type").notNull().default("tattoo"),
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  aiContentCapture: text("ai_content_capture").notNull().default("metadata_only"),
  retentionDays: integer("retention_days").notNull().default(90),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role").notNull().default("owner"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("users_workspace_email_uq").on(table.workspaceId, table.email),
  ],
);

export const clients = sqliteTable(
  "clients",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    preferredChannel: text("preferred_channel"),
    status: text("status").notNull().default("active"),
    consentStatus: text("consent_status").notNull().default("unknown"),
    notes: text("notes"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
    archivedAt: text("archived_at"),
  },
  (table) => [
    index("clients_workspace_idx").on(table.workspaceId),
    index("clients_email_idx").on(table.email),
    index("clients_phone_idx").on(table.phone),
  ],
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    clientId: text("client_id").references(() => clients.id),
    title: text("title").notNull(),
    projectType: text("project_type").notNull().default("tattoo"),
    lifecyclePhase: text("lifecycle_phase").notNull().default("lead"),
    status: text("status").notNull().default("active"),
    priority: text("priority").notNull().default("normal"),
    placement: text("placement"),
    sizeDescription: text("size_description"),
    styleTagsJson: text("style_tags_json").notNull().default("[]"),
    budgetMinCents: integer("budget_min_cents"),
    budgetMaxCents: integer("budget_max_cents"),
    targetDate: text("target_date"),
    nextAction: text("next_action"),
    nextActionAt: text("next_action_at"),
    summary: text("summary"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
    archivedAt: text("archived_at"),
  },
  (table) => [
    index("projects_workspace_phase_idx").on(
      table.workspaceId,
      table.lifecyclePhase,
    ),
    index("projects_client_idx").on(table.clientId),
    index("projects_next_action_idx").on(table.nextActionAt),
  ],
);

export const assets = sqliteTable(
  "assets",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    projectId: text("project_id").references(() => projects.id),
    clientId: text("client_id").references(() => clients.id),
    storageKey: text("storage_key").notNull(),
    originalName: text("original_name").notNull(),
    mediaType: text("media_type").notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    sha256: text("sha256").notNull(),
    sourceType: text("source_type").notNull(),
    sourceUrl: text("source_url"),
    version: integer("version").notNull().default(1),
    extractionStatus: text("extraction_status").notNull().default("pending"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at"),
    deletedAt: text("deleted_at"),
  },
  (table) => [
    uniqueIndex("assets_storage_key_uq").on(table.storageKey),
    index("assets_project_idx").on(table.projectId),
    index("assets_hash_idx").on(table.sha256),
  ],
);

export const knowledgeItems = sqliteTable(
  "knowledge_items",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    projectId: text("project_id").references(() => projects.id),
    sourceAssetId: text("source_asset_id").references(() => assets.id),
    itemType: text("item_type").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    summary: text("summary"),
    tagsJson: text("tags_json").notNull().default("[]"),
    confidenceBps: integer("confidence_bps"),
    verificationStatus: text("verification_status").notNull().default("unverified"),
    visibility: text("visibility").notNull().default("workspace"),
    validFrom: text("valid_from"),
    validTo: text("valid_to"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("knowledge_workspace_type_idx").on(table.workspaceId, table.itemType),
    index("knowledge_project_idx").on(table.projectId),
    uniqueIndex("knowledge_content_hash_uq").on(
      table.workspaceId,
      table.contentHash,
    ),
  ],
);

export const knowledgeEdges = sqliteTable(
  "knowledge_edges",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    fromItemId: text("from_item_id")
      .notNull()
      .references(() => knowledgeItems.id),
    toItemId: text("to_item_id")
      .notNull()
      .references(() => knowledgeItems.id),
    relationship: text("relationship").notNull(),
    weightBps: integer("weight_bps").notNull().default(5000),
    evidenceJson: text("evidence_json").notNull().default("[]"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    uniqueIndex("knowledge_edge_uq").on(
      table.fromItemId,
      table.toItemId,
      table.relationship,
    ),
    index("knowledge_edges_workspace_idx").on(table.workspaceId),
  ],
);

export const approvals = sqliteTable(
  "approvals",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    projectId: text("project_id").references(() => projects.id),
    requestedByType: text("requested_by_type").notNull(),
    requestedById: text("requested_by_id"),
    category: text("category").notNull(),
    actionType: text("action_type").notNull(),
    subject: text("subject").notNull(),
    summary: text("summary").notNull(),
    payloadHash: text("payload_hash").notNull(),
    payloadRedactedJson: text("payload_redacted_json").notNull().default("{}"),
    evidenceJson: text("evidence_json").notNull().default("[]"),
    riskLevel: text("risk_level").notNull(),
    reversibility: text("reversibility").notNull(),
    confidenceBps: integer("confidence_bps"),
    status: text("status").notNull().default("pending"),
    decisionBy: text("decision_by"),
    decisionReason: text("decision_reason"),
    decidedAt: text("decided_at"),
    expiresAt: text("expires_at"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("approvals_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    index("approvals_project_idx").on(table.projectId),
  ],
);

export const aiRuns = sqliteTable(
  "ai_runs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    projectId: text("project_id").references(() => projects.id),
    parentRunId: text("parent_run_id"),
    correlationId: text("correlation_id").notNull(),
    agentName: text("agent_name").notNull(),
    purpose: text("purpose").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    contextPolicyVersion: text("context_policy_version").notNull(),
    approvalPolicyVersion: text("approval_policy_version").notNull(),
    riskLevel: text("risk_level").notNull(),
    contentCapture: text("content_capture").notNull().default("metadata_only"),
    inputHash: text("input_hash"),
    reasoningSummary: text("reasoning_summary"),
    recommendation: text("recommendation"),
    evidenceJson: text("evidence_json").notNull().default("[]"),
    confidenceBps: integer("confidence_bps"),
    status: text("status").notNull().default("queued"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    latencyMs: integer("latency_ms"),
    errorCode: text("error_code"),
    errorSummary: text("error_summary"),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    uniqueIndex("ai_runs_correlation_uq").on(
      table.workspaceId,
      table.correlationId,
    ),
    index("ai_runs_workspace_status_idx").on(table.workspaceId, table.status),
    index("ai_runs_project_idx").on(table.projectId),
    index("ai_runs_agent_created_idx").on(table.agentName, table.createdAt),
  ],
);

export const aiEvents = sqliteTable(
  "ai_events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    runId: text("run_id")
      .notNull()
      .references(() => aiRuns.id),
    sequence: integer("sequence").notNull(),
    eventType: text("event_type").notNull(),
    status: text("status").notNull(),
    summary: text("summary").notNull(),
    metadataJson: text("metadata_json").notNull().default("{}"),
    occurredAt: timestamp("occurred_at"),
  },
  (table) => [
    uniqueIndex("ai_events_run_sequence_uq").on(table.runId, table.sequence),
    index("ai_events_workspace_type_idx").on(
      table.workspaceId,
      table.eventType,
    ),
  ],
);

export const toolCalls = sqliteTable(
  "tool_calls",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    runId: text("run_id")
      .notNull()
      .references(() => aiRuns.id),
    approvalId: text("approval_id").references(() => approvals.id),
    toolName: text("tool_name").notNull(),
    operation: text("operation").notNull(),
    destination: text("destination"),
    parametersHash: text("parameters_hash"),
    parametersRedactedJson: text("parameters_redacted_json").notNull().default("{}"),
    resultSummary: text("result_summary"),
    externalSideEffect: integer("external_side_effect", { mode: "boolean" })
      .notNull()
      .default(false),
    status: text("status").notNull(),
    latencyMs: integer("latency_ms"),
    startedAt: timestamp("started_at"),
    completedAt: text("completed_at"),
  },
  (table) => [
    index("tool_calls_run_idx").on(table.runId),
    index("tool_calls_side_effect_idx").on(
      table.workspaceId,
      table.externalSideEffect,
    ),
  ],
);

export const usageEvents = sqliteTable(
  "usage_events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    runId: text("run_id").references(() => aiRuns.id),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cachedInputTokens: integer("cached_input_tokens").notNull().default(0),
    reasoningTokens: integer("reasoning_tokens").notNull().default(0),
    estimatedCostMicros: integer("estimated_cost_micros").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    pricingVersion: text("pricing_version"),
    occurredAt: timestamp("occurred_at"),
  },
  (table) => [
    index("usage_workspace_occurred_idx").on(
      table.workspaceId,
      table.occurredAt,
    ),
    index("usage_run_idx").on(table.runId),
  ],
);

export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    riskLevel: text("risk_level").notNull().default("low"),
    outcome: text("outcome").notNull(),
    correlationId: text("correlation_id"),
    ipHash: text("ip_hash"),
    userAgentHash: text("user_agent_hash"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    occurredAt: timestamp("occurred_at"),
  },
  (table) => [
    index("audit_workspace_occurred_idx").on(
      table.workspaceId,
      table.occurredAt,
    ),
    index("audit_target_idx").on(table.targetType, table.targetId),
    index("audit_correlation_idx").on(table.correlationId),
  ],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    userId: text("user_id").references(() => users.id),
    projectId: text("project_id").references(() => projects.id),
    severity: text("severity").notNull(),
    category: text("category").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    actionUrl: text("action_url"),
    dedupeKey: text("dedupe_key"),
    status: text("status").notNull().default("unread"),
    deliverAfter: text("deliver_after"),
    readAt: text("read_at"),
    dismissedAt: text("dismissed_at"),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    index("notifications_user_status_idx").on(table.userId, table.status),
    uniqueIndex("notifications_dedupe_uq").on(
      table.workspaceId,
      table.dedupeKey,
    ),
  ],
);

export const portalInvitations = sqliteTable(
  "portal_invitations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id),
    tokenHash: text("token_hash").notNull(),
    tokenHint: text("token_hint").notNull(),
    status: text("status").notNull().default("active"),
    expiresAt: text("expires_at").notNull(),
    lastUsedAt: text("last_used_at"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    uniqueIndex("portal_invitations_token_uq").on(table.tokenHash),
    index("portal_invitations_client_idx").on(table.clientId, table.status),
  ],
);

export const appointments = sqliteTable(
  "appointments",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    clientId: text("client_id").references(() => clients.id),
    projectId: text("project_id").references(() => projects.id),
    appointmentType: text("appointment_type").notNull().default("session"),
    startsAt: text("starts_at").notNull(),
    endsAt: text("ends_at"),
    status: text("status").notNull().default("scheduled"),
    location: text("location"),
    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("appointments_workspace_start_idx").on(
      table.workspaceId,
      table.startsAt,
    ),
    index("appointments_client_idx").on(table.clientId),
    index("appointments_project_idx").on(table.projectId),
  ],
);

export const clientMessages = sqliteTable(
  "client_messages",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id),
    projectId: text("project_id").references(() => projects.id),
    senderType: text("sender_type").notNull(),
    senderId: text("sender_id"),
    body: text("body").notNull(),
    status: text("status").notNull().default("sent"),
    readAt: text("read_at"),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    index("client_messages_client_created_idx").on(
      table.clientId,
      table.createdAt,
    ),
    index("client_messages_project_idx").on(table.projectId),
  ],
);

export const projectUpdates = sqliteTable(
  "project_updates",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    title: text("title").notNull(),
    body: text("body").notNull(),
    visibility: text("visibility").notNull().default("client"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    index("project_updates_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
  ],
);
