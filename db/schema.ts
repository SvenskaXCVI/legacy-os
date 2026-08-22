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
  automationStatus: text("automation_status").notNull().default("active"),
  automationMode: text("automation_mode").notNull().default("safe_auto"),
  lastAutomationAt: text("last_automation_at"),
  lastBriefingAt: text("last_briefing_at"),
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
    authSubject: text("auth_subject"),
    authProvider: text("auth_provider").notNull().default("workspace"),
    clientId: text("client_id"),
    emailVerifiedAt: text("email_verified_at"),
    mfaRequired: integer("mfa_required", { mode: "boolean" })
      .notNull()
      .default(true),
    lastLoginAt: text("last_login_at"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("users_workspace_email_uq").on(table.workspaceId, table.email),
    uniqueIndex("users_auth_subject_uq").on(table.authSubject),
    index("users_client_idx").on(table.clientId),
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
    displayName: text("display_name"),
    preferredName: text("preferred_name"),
    email: text("email"),
    phone: text("phone"),
    instagramHandle: text("instagram_handle"),
    tiktokHandle: text("tiktok_handle"),
    preferredChannel: text("preferred_channel"),
    sourceType: text("source_type").notNull().default("owner_entry"),
    identityStatus: text("identity_status").notNull().default("partial"),
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
    clientSummary: text("client_summary"),
    requestKey: text("request_key"),
    isTest: integer("is_test", { mode: "boolean" }).notNull().default(false),
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
    uniqueIndex("projects_workspace_request_key_uq").on(
      table.workspaceId,
      table.requestKey,
    ),
  ],
);

export const paymentCustomers = sqliteTable(
  "payment_customers",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    clientId: text("client_id").notNull().references(() => clients.id),
    provider: text("provider").notNull().default("stripe"),
    externalCustomerId: text("external_customer_id").notNull(),
    emailAtLink: text("email_at_link"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("payment_customers_workspace_client_provider_uq").on(
      table.workspaceId,
      table.clientId,
      table.provider,
    ),
    uniqueIndex("payment_customers_external_uq").on(table.externalCustomerId),
  ],
);

export const paymentRequests = sqliteTable(
  "payment_requests",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    projectId: text("project_id").notNull().references(() => projects.id),
    clientId: text("client_id").notNull().references(() => clients.id),
    kind: text("kind").notNull().default("deposit"),
    title: text("title").notNull(),
    description: text("description"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    status: text("status").notNull().default("draft"),
    amountPaidCents: integer("amount_paid_cents").notNull().default(0),
    amountRefundedCents: integer("amount_refunded_cents").notNull().default(0),
    dueAt: text("due_at"),
    requestKey: text("request_key").notNull(),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    checkoutUrl: text("checkout_url"),
    checkoutExpiresAt: text("checkout_expires_at"),
    checkoutAttempt: integer("checkout_attempt").notNull().default(0),
    approvedBy: text("approved_by"),
    approvedAt: text("approved_at"),
    paidAt: text("paid_at"),
    refundedAt: text("refunded_at"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("payment_requests_workspace_key_uq").on(table.workspaceId, table.requestKey),
    uniqueIndex("payment_requests_checkout_session_uq").on(table.stripeCheckoutSessionId),
    index("payment_requests_workspace_status_idx").on(table.workspaceId, table.status),
    index("payment_requests_client_status_idx").on(table.clientId, table.status),
    index("payment_requests_project_idx").on(table.projectId),
    index("payment_requests_intent_idx").on(table.stripePaymentIntentId),
  ],
);

export const paymentEvents = sqliteTable(
  "payment_events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    paymentRequestId: text("payment_request_id").references(() => paymentRequests.id),
    provider: text("provider").notNull().default("stripe"),
    externalEventId: text("external_event_id").notNull(),
    eventType: text("event_type").notNull(),
    externalObjectId: text("external_object_id"),
    status: text("status").notNull().default("received"),
    amountCents: integer("amount_cents"),
    currency: text("currency"),
    payloadDigest: text("payload_digest").notNull(),
    error: text("error"),
    processedAt: text("processed_at"),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    uniqueIndex("payment_events_external_uq").on(table.externalEventId),
    index("payment_events_request_idx").on(table.paymentRequestId),
    index("payment_events_status_idx").on(table.workspaceId, table.status),
  ],
);

export const projectCandidates = sqliteTable(
  "project_candidates",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id").notNull(),
    requestedTitle: text("requested_title").notNull(),
    placement: text("placement"),
    sizeDescription: text("size_description"),
    styleTagsJson: text("style_tags_json").notNull().default("[]"),
    concept: text("concept").notNull(),
    referencesSummary: text("references_summary"),
    constraints: text("constraints"),
    budgetMinCents: integer("budget_min_cents"),
    budgetMaxCents: integer("budget_max_cents"),
    targetDate: text("target_date"),
    status: text("status").notNull().default("pending_review"),
    confidenceBps: integer("confidence_bps").notNull().default(0),
    extractionMethod: text("extraction_method")
      .notNull()
      .default("legacy-intake-v1"),
    evidenceJson: text("evidence_json").notNull().default("[]"),
    proposedProjectId: text("proposed_project_id").references(() => projects.id),
    clientResponse: text("client_response"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: text("reviewed_at"),
    submittedAt: text("submitted_at").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("project_candidates_workspace_source_uq").on(
      table.workspaceId,
      table.sourceType,
      table.sourceId,
    ),
    index("project_candidates_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    index("project_candidates_client_idx").on(table.clientId),
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
    versionGroupId: text("version_group_id"),
    parentAssetId: text("parent_asset_id"),
    assetRole: text("asset_role").notNull().default("unspecified"),
    visibility: text("visibility").notNull().default("internal"),
    rightsStatus: text("rights_status").notNull().default("unknown"),
    consentStatus: text("consent_status").notNull().default("not_required"),
    contentEligible: integer("content_eligible", { mode: "boolean" })
      .notNull()
      .default(false),
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
    index("assets_project_visibility_idx").on(table.projectId, table.visibility),
    index("assets_version_group_idx").on(table.versionGroupId, table.version),
    index("assets_project_role_idx").on(table.projectId, table.assetRole),
    index("assets_content_eligible_idx").on(
      table.workspaceId,
      table.contentEligible,
    ),
  ],
);

export const assetAnalyses = sqliteTable(
  "asset_analyses",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    projectId: text("project_id").notNull().references(() => projects.id),
    assetId: text("asset_id").notNull().references(() => assets.id),
    assetSha256: text("asset_sha256").notNull(),
    assetVersion: integer("asset_version").notNull(),
    analysisVersion: text("analysis_version").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    status: text("status").notNull(),
    summary: text("summary").notNull(),
    observationsJson: text("observations_json").notNull().default("[]"),
    evidenceJson: text("evidence_json").notNull().default("[]"),
    confidenceBps: integer("confidence_bps").notNull().default(0),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    index("asset_analyses_asset_idx").on(table.assetId, table.createdAt),
    index("asset_analyses_project_idx").on(table.projectId, table.createdAt),
    uniqueIndex("asset_analyses_asset_hash_version_uq").on(
      table.assetId,
      table.assetSha256,
      table.analysisVersion,
    ),
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
    assetId: text("asset_id").references(() => assets.id),
    assetSha256: text("asset_sha256"),
    assetVersion: integer("asset_version"),
    audience: text("audience").notNull().default("owner"),
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
    index("approvals_asset_idx").on(table.assetId),
    index("approvals_project_audience_idx").on(
      table.projectId,
      table.audience,
    ),
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

export const captureEvents = sqliteTable(
  "capture_events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    projectId: text("project_id").references(() => projects.id),
    clientId: text("client_id").references(() => clients.id),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id"),
    channel: text("channel").notNull(),
    eventType: text("event_type").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id"),
    title: text("title").notNull(),
    summary: text("summary"),
    contentPolicy: text("content_policy").notNull().default("metadata_only"),
    contentHash: text("content_hash"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    consentGrantId: text("consent_grant_id"),
    correlationId: text("correlation_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull().default("normalized"),
    occurredAt: text("occurred_at").notNull(),
    capturedAt: timestamp("captured_at"),
  },
  (table) => [
    uniqueIndex("capture_events_workspace_idempotency_uq").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
    index("capture_events_workspace_occurred_idx").on(
      table.workspaceId,
      table.occurredAt,
    ),
    index("capture_events_project_idx").on(table.projectId),
    index("capture_events_client_idx").on(table.clientId),
    index("capture_events_status_idx").on(table.workspaceId, table.status),
  ],
);

export const realtimeEvents = sqliteTable(
  "realtime_events",
  {
    sequence: integer("sequence").primaryKey({ autoIncrement: true }),
    id: text("id").notNull().unique(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    audience: text("audience").notNull(),
    clientId: text("client_id").references(() => clients.id),
    projectId: text("project_id").references(() => projects.id),
    eventType: text("event_type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    title: text("title").notNull(),
    changedFieldsJson: text("changed_fields_json").notNull().default("[]"),
    correlationId: text("correlation_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    uniqueIndex("realtime_events_workspace_idempotency_uq").on(table.workspaceId, table.idempotencyKey),
    index("realtime_events_owner_cursor_idx").on(table.workspaceId, table.audience, table.sequence),
    index("realtime_events_client_cursor_idx").on(table.workspaceId, table.clientId, table.audience, table.sequence),
  ],
);

export const memoryRecords = sqliteTable(
  "memory_records",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    projectId: text("project_id").references(() => projects.id),
    clientId: text("client_id").references(() => clients.id),
    scopeType: text("scope_type").notNull(),
    scopeKey: text("scope_key").notNull(),
    memoryKey: text("memory_key").notNull(),
    memoryType: text("memory_type").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    contentHash: text("content_hash").notNull(),
    sourceCaptureIdsJson: text("source_capture_ids_json").notNull().default("[]"),
    confidenceBps: integer("confidence_bps").notNull().default(7000),
    sensitivity: text("sensitivity").notNull().default("internal"),
    verificationStatus: text("verification_status").notNull().default("system_derived"),
    status: text("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
    supersedesMemoryId: text("supersedes_memory_id"),
    validFrom: text("valid_from").notNull(),
    validTo: text("valid_to"),
    lastReinforcedAt: text("last_reinforced_at").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("memory_records_scope_key_version_uq").on(
      table.workspaceId,
      table.scopeKey,
      table.memoryKey,
      table.version,
    ),
    index("memory_records_scope_status_idx").on(
      table.workspaceId,
      table.scopeKey,
      table.status,
    ),
    index("memory_records_project_idx").on(table.projectId, table.status),
    index("memory_records_client_idx").on(table.clientId, table.status),
    index("memory_records_confidence_idx").on(
      table.workspaceId,
      table.status,
      table.confidenceBps,
    ),
  ],
);

export const agentDefinitions = sqliteTable(
  "agent_definitions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    agentKey: text("agent_key").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role").notNull(),
    purpose: text("purpose").notNull(),
    capabilitiesJson: text("capabilities_json").notNull().default("[]"),
    allowedScopesJson: text("allowed_scopes_json").notNull().default("[]"),
    autonomyPolicy: text("autonomy_policy").notNull().default("internal_only"),
    status: text("status").notNull().default("active"),
    policyVersion: text("policy_version").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("agent_definitions_workspace_key_uq").on(
      table.workspaceId,
      table.agentKey,
    ),
    index("agent_definitions_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
  ],
);

export const toolDefinitions = sqliteTable(
  "tool_definitions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    toolKey: text("tool_key").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description").notNull(),
    inputSchemaJson: text("input_schema_json").notNull().default("{}"),
    outputSchemaJson: text("output_schema_json").notNull().default("{}"),
    sideEffectClass: text("side_effect_class").notNull(),
    approvalClass: text("approval_class").notNull(),
    retryPolicyJson: text("retry_policy_json").notNull().default("{}"),
    auditBehaviorJson: text("audit_behavior_json").notNull().default("{}"),
    allowedAgentsJson: text("allowed_agents_json").notNull().default("[]"),
    connectorKey: text("connector_key"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    status: text("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
    policyVersion: text("policy_version").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("tool_definitions_workspace_key_uq").on(table.workspaceId, table.toolKey),
    index("tool_definitions_workspace_authority_idx").on(table.workspaceId, table.approvalClass, table.status),
  ],
);

export const agentTasks = sqliteTable(
  "agent_tasks",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    agentKey: text("agent_key").notNull(),
    parentTaskId: text("parent_task_id"),
    parentRunId: text("parent_run_id").references(() => aiRuns.id),
    projectId: text("project_id").references(() => projects.id),
    clientId: text("client_id").references(() => clients.id),
    requestedByType: text("requested_by_type").notNull(),
    requestedById: text("requested_by_id"),
    taskType: text("task_type").notNull(),
    toolKey: text("tool_key").notNull().default("analyze_internal"),
    title: text("title").notNull(),
    instructionSummary: text("instruction_summary").notNull(),
    scopeJson: text("scope_json").notNull().default("{}"),
    actionPayloadJson: text("action_payload_json").notNull().default("{}"),
    evidenceJson: text("evidence_json").notNull().default("[]"),
    contextMemoryIdsJson: text("context_memory_ids_json").notNull().default("[]"),
    riskLevel: text("risk_level").notNull().default("low"),
    reversibility: text("reversibility").notNull().default("reversible"),
    autonomyLevel: text("autonomy_level").notNull().default("internal_auto"),
    approvalRequired: integer("approval_required", { mode: "boolean" })
      .notNull()
      .default(false),
    approvalId: text("approval_id").references(() => approvals.id),
    status: text("status").notNull().default("queued"),
    priority: integer("priority").notNull().default(50),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    correlationId: text("correlation_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    resultSummary: text("result_summary"),
    errorSummary: text("error_summary"),
    scheduledFor: text("scheduled_for").notNull(),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("agent_tasks_workspace_idempotency_uq").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
    index("agent_tasks_queue_idx").on(
      table.workspaceId,
      table.status,
      table.priority,
      table.scheduledFor,
    ),
    index("agent_tasks_agent_status_idx").on(table.agentKey, table.status),
    index("agent_tasks_project_idx").on(table.projectId, table.status),
    index("agent_tasks_client_idx").on(table.clientId, table.status),
    index("agent_tasks_approval_idx").on(table.approvalId),
    index("agent_tasks_parent_run_idx").on(table.parentRunId, table.createdAt),
  ],
);

export const authorityDecisions = sqliteTable(
  "authority_decisions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    toolKey: text("tool_key").notNull(),
    taskId: text("task_id").references(() => agentTasks.id),
    approvalId: text("approval_id").references(() => approvals.id),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id"),
    authorityClass: text("authority_class").notNull(),
    decision: text("decision").notNull(),
    reason: text("reason").notNull(),
    inputHash: text("input_hash").notNull(),
    correlationId: text("correlation_id").notNull(),
    policyVersion: text("policy_version").notNull(),
    evaluatedAt: timestamp("evaluated_at"),
    resolvedAt: text("resolved_at"),
  },
  (table) => [
    uniqueIndex("authority_decisions_workspace_task_uq").on(table.workspaceId, table.taskId),
    index("authority_decisions_workspace_decision_idx").on(table.workspaceId, table.decision, table.evaluatedAt),
    index("authority_decisions_tool_idx").on(table.toolKey, table.evaluatedAt),
    index("authority_decisions_approval_idx").on(table.approvalId),
  ],
);

export const chiefManagerRuns = sqliteTable(
  "chief_manager_runs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    aiRunId: text("ai_run_id").notNull().references(() => aiRuns.id),
    projectId: text("project_id").references(() => projects.id),
    clientId: text("client_id").references(() => clients.id),
    requestedBy: text("requested_by").notNull(),
    objective: text("objective").notNull(),
    mode: text("mode").notNull().default("command"),
    status: text("status").notNull().default("planning"),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    planVersion: text("plan_version").notNull(),
    contextPolicyVersion: text("context_policy_version").notNull(),
    authorityPolicyVersion: text("authority_policy_version").notNull(),
    planJson: text("plan_json").notNull().default("{}"),
    contextRefsJson: text("context_refs_json").notNull().default("[]"),
    evidenceJson: text("evidence_json").notNull().default("[]"),
    summary: text("summary"),
    nextAction: text("next_action"),
    confidenceBps: integer("confidence_bps"),
    correlationId: text("correlation_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("chief_manager_runs_workspace_idempotency_uq").on(table.workspaceId, table.idempotencyKey),
    uniqueIndex("chief_manager_runs_ai_run_uq").on(table.aiRunId),
    index("chief_manager_runs_workspace_status_idx").on(table.workspaceId, table.status, table.createdAt),
    index("chief_manager_runs_project_idx").on(table.projectId, table.createdAt),
  ],
);

export const chiefManagerSteps = sqliteTable(
  "chief_manager_steps",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    managerRunId: text("manager_run_id").notNull().references(() => chiefManagerRuns.id),
    sequence: integer("sequence").notNull(),
    agentKey: text("agent_key").notNull(),
    title: text("title").notNull(),
    purpose: text("purpose").notNull(),
    toolKey: text("tool_key").notNull(),
    taskId: text("task_id").references(() => agentTasks.id),
    approvalId: text("approval_id").references(() => approvals.id),
    status: text("status").notNull().default("planned"),
    evidenceJson: text("evidence_json").notNull().default("[]"),
    resultSummary: text("result_summary"),
    errorSummary: text("error_summary"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("chief_manager_steps_run_sequence_uq").on(table.managerRunId, table.sequence),
    index("chief_manager_steps_workspace_status_idx").on(table.workspaceId, table.status, table.createdAt),
    index("chief_manager_steps_task_idx").on(table.taskId),
    index("chief_manager_steps_approval_idx").on(table.approvalId),
  ],
);

export const specialistEvaluations = sqliteTable(
  "specialist_evaluations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    taskId: text("task_id").notNull().references(() => agentTasks.id),
    aiRunId: text("ai_run_id").notNull().references(() => aiRuns.id),
    agentKey: text("agent_key").notNull(),
    domain: text("domain").notNull(),
    capabilityKey: text("capability_key").notNull(),
    projectId: text("project_id").references(() => projects.id),
    clientId: text("client_id").references(() => clients.id),
    status: text("status").notNull().default("completed"),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    policyVersion: text("policy_version").notNull(),
    summary: text("summary").notNull(),
    factsJson: text("facts_json").notNull().default("{}"),
    findingsJson: text("findings_json").notNull().default("[]"),
    recommendationsJson: text("recommendations_json").notNull().default("[]"),
    evidenceJson: text("evidence_json").notNull().default("[]"),
    limitationsJson: text("limitations_json").notNull().default("[]"),
    confidenceBps: integer("confidence_bps").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    uniqueIndex("specialist_evaluations_task_uq").on(table.taskId),
    uniqueIndex("specialist_evaluations_ai_run_uq").on(table.aiRunId),
    index("specialist_evaluations_workspace_domain_idx").on(table.workspaceId, table.domain, table.createdAt),
    index("specialist_evaluations_project_idx").on(table.projectId, table.createdAt),
    index("specialist_evaluations_client_idx").on(table.clientId, table.createdAt),
  ],
);

export const agentHandoffs = sqliteTable(
  "agent_handoffs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    taskId: text("task_id")
      .notNull()
      .references(() => agentTasks.id),
    fromAgentKey: text("from_agent_key").notNull(),
    toAgentKey: text("to_agent_key").notNull(),
    reason: text("reason").notNull(),
    contractVersion: text("contract_version").notNull(),
    inputRefsJson: text("input_refs_json").notNull().default("[]"),
    outputRefsJson: text("output_refs_json").notNull().default("[]"),
    status: text("status").notNull().default("accepted"),
    occurredAt: timestamp("occurred_at"),
  },
  (table) => [
    index("agent_handoffs_task_idx").on(table.taskId, table.occurredAt),
    index("agent_handoffs_workspace_agent_idx").on(
      table.workspaceId,
      table.toAgentKey,
      table.occurredAt,
    ),
  ],
);

export const connectorDefinitions = sqliteTable(
  "connector_definitions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    connectorKey: text("connector_key").notNull(),
    displayName: text("display_name").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    capabilitiesJson: text("capabilities_json").notNull().default("[]"),
    credentialState: text("credential_state").notNull().default("not_required"),
    status: text("status").notNull().default("available"),
    healthStatus: text("health_status").notNull().default("unknown"),
    lastCheckedAt: text("last_checked_at"),
    lastSuccessAt: text("last_success_at"),
    lastErrorSummary: text("last_error_summary"),
    policyVersion: text("policy_version").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("connector_definitions_workspace_key_uq").on(table.workspaceId, table.connectorKey),
    index("connector_definitions_workspace_status_idx").on(table.workspaceId, table.status, table.healthStatus),
  ],
);

export const connectorExecutions = sqliteTable(
  "connector_executions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    connectorKey: text("connector_key").notNull(),
    taskId: text("task_id").references(() => agentTasks.id),
    approvalId: text("approval_id").references(() => approvals.id),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id"),
    actionType: text("action_type").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    requestRedactedJson: text("request_redacted_json").notNull().default("{}"),
    externalReference: text("external_reference"),
    resultSummary: text("result_summary"),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    errorCode: text("error_code"),
    errorSummary: text("error_summary"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("connector_executions_workspace_idempotency_uq").on(table.workspaceId, table.idempotencyKey),
    index("connector_executions_workspace_status_idx").on(table.workspaceId, table.status, table.createdAt),
    index("connector_executions_task_idx").on(table.taskId, table.createdAt),
    index("connector_executions_connector_idx").on(table.connectorKey, table.createdAt),
  ],
);

export const connectorAccounts = sqliteTable(
  "connector_accounts",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    connectorKey: text("connector_key").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id"),
    accountEmail: text("account_email"),
    displayName: text("display_name"),
    encryptedCredentialJson: text("encrypted_credential_json").notNull(),
    grantedScopesJson: text("granted_scopes_json").notNull().default("[]"),
    tokenExpiresAt: text("token_expires_at"),
    status: text("status").notNull().default("connected"),
    lastRefreshedAt: text("last_refreshed_at"),
    lastValidatedAt: text("last_validated_at"),
    lastErrorSummary: text("last_error_summary"),
    connectedBy: text("connected_by"),
    connectedAt: text("connected_at").notNull(),
    revokedAt: text("revoked_at"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("connector_accounts_workspace_key_uq").on(table.workspaceId, table.connectorKey),
    index("connector_accounts_workspace_status_idx").on(table.workspaceId, table.status, table.updatedAt),
    index("connector_accounts_provider_account_idx").on(table.provider, table.providerAccountId),
  ],
);

export const connectorOauthStates = sqliteTable(
  "connector_oauth_states",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    connectorKey: text("connector_key").notNull(),
    nonceHash: text("nonce_hash").notNull(),
    requestedBy: text("requested_by"),
    expiresAt: text("expires_at").notNull(),
    consumedAt: text("consumed_at"),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    uniqueIndex("connector_oauth_states_nonce_uq").on(table.nonceHash),
    index("connector_oauth_states_workspace_expiry_idx").on(table.workspaceId, table.expiresAt),
  ],
);

export const automationPlaybooks = sqliteTable(
  "automation_playbooks",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    playbookKey: text("playbook_key").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description").notNull(),
    triggerEventsJson: text("trigger_events_json").notNull().default("[]"),
    stepsJson: text("steps_json").notNull().default("[]"),
    autonomyMode: text("autonomy_mode").notNull().default("safe_auto"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    status: text("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
    policyVersion: text("policy_version").notNull(),
    lastTriggeredAt: text("last_triggered_at"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("automation_playbooks_workspace_key_uq").on(table.workspaceId, table.playbookKey),
    index("automation_playbooks_workspace_enabled_idx").on(table.workspaceId, table.enabled, table.status),
  ],
);

export const automationPlaybookRuns = sqliteTable(
  "automation_playbook_runs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    playbookKey: text("playbook_key").notNull(),
    sourceCaptureId: text("source_capture_id").references(() => captureEvents.id),
    sourceEventType: text("source_event_type").notNull(),
    projectId: text("project_id").references(() => projects.id),
    clientId: text("client_id").references(() => clients.id),
    correlationId: text("correlation_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull().default("running"),
    totalSteps: integer("total_steps").notNull().default(0),
    completedSteps: integer("completed_steps").notNull().default(0),
    heldSteps: integer("held_steps").notNull().default(0),
    failedSteps: integer("failed_steps").notNull().default(0),
    summary: text("summary"),
    errorSummary: text("error_summary"),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("automation_playbook_runs_workspace_idempotency_uq").on(table.workspaceId, table.idempotencyKey),
    index("automation_playbook_runs_workspace_status_idx").on(table.workspaceId, table.status, table.createdAt),
    index("automation_playbook_runs_project_idx").on(table.projectId, table.createdAt),
    index("automation_playbook_runs_source_idx").on(table.sourceCaptureId),
  ],
);

export const automationPlaybookSteps = sqliteTable(
  "automation_playbook_steps",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    runId: text("run_id")
      .notNull()
      .references(() => automationPlaybookRuns.id),
    sequence: integer("sequence").notNull(),
    stepKey: text("step_key").notNull(),
    title: text("title").notNull(),
    agentKey: text("agent_key").notNull(),
    taskId: text("task_id").references(() => agentTasks.id),
    actionType: text("action_type").notNull(),
    approvalRequired: integer("approval_required", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull().default("queued"),
    resultSummary: text("result_summary"),
    errorSummary: text("error_summary"),
    scheduledFor: text("scheduled_for").notNull(),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("automation_playbook_steps_run_sequence_uq").on(table.runId, table.sequence),
    index("automation_playbook_steps_workspace_status_idx").on(table.workspaceId, table.status, table.scheduledFor),
    index("automation_playbook_steps_task_idx").on(table.taskId),
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

export const schedulingProfiles = sqliteTable(
  "scheduling_profiles",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    defaultPrepMinutes: integer("default_prep_minutes").notNull().default(60),
    defaultTravelMinutes: integer("default_travel_minutes").notNull().default(0),
    defaultBufferBeforeMinutes: integer("default_buffer_before_minutes").notNull().default(30),
    defaultBufferAfterMinutes: integer("default_buffer_after_minutes").notNull().default(30),
    maximumTattooMinutesPerDay: integer("maximum_tattoo_minutes_per_day").notNull().default(480),
    maximumHighEnergySessionsPerDay: integer("maximum_high_energy_sessions_per_day").notNull().default(1),
    minimumBookableMinutes: integer("minimum_bookable_minutes").notNull().default(120),
    weeklyRevenueTargetCents: integer("weekly_revenue_target_cents").notNull().default(0),
    policyVersion: text("policy_version").notNull(),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [uniqueIndex("scheduling_profiles_workspace_uq").on(table.workspaceId)],
);

export const projectScheduleRequirements = sqliteTable(
  "project_schedule_requirements",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    projectId: text("project_id").notNull().references(() => projects.id),
    estimatedSessionMinutes: integer("estimated_session_minutes").notNull(),
    prepMinutes: integer("prep_minutes"),
    travelMinutes: integer("travel_minutes"),
    bufferBeforeMinutes: integer("buffer_before_minutes"),
    bufferAfterMinutes: integer("buffer_after_minutes"),
    energyDemand: text("energy_demand").notNull().default("high"),
    minimumRevenueCents: integer("minimum_revenue_cents").notNull().default(0),
    earliestStart: text("earliest_start"),
    latestEnd: text("latest_end"),
    location: text("location"),
    notes: text("notes"),
    status: text("status").notNull().default("active"),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("project_schedule_requirements_project_uq").on(table.projectId),
    index("project_schedule_requirements_workspace_status_idx").on(table.workspaceId, table.status),
  ],
);

export const availabilityWindows = sqliteTable(
  "availability_windows",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    title: text("title").notNull(),
    startsAt: text("starts_at").notNull(),
    endsAt: text("ends_at").notNull(),
    windowType: text("window_type").notNull().default("tattoo"),
    status: text("status").notNull().default("open"),
    energyCapacity: text("energy_capacity").notNull().default("high"),
    location: text("location"),
    notes: text("notes"),
    source: text("source").notNull().default("owner"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("availability_windows_workspace_status_start_idx").on(table.workspaceId, table.status, table.startsAt),
  ],
);

export const scheduleEvaluationRuns = sqliteTable(
  "schedule_evaluation_runs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    status: text("status").notNull().default("completed"),
    windowsEvaluated: integer("windows_evaluated").notNull().default(0),
    projectsEvaluated: integer("projects_evaluated").notNull().default(0),
    readyProjects: integer("ready_projects").notNull().default(0),
    opportunitiesCreated: integer("opportunities_created").notNull().default(0),
    conflictsDetected: integer("conflicts_detected").notNull().default(0),
    projectedRevenueCents: integer("projected_revenue_cents").notNull().default(0),
    summary: text("summary").notNull(),
    policyVersion: text("policy_version").notNull(),
    evidenceJson: text("evidence_json").notNull().default("[]"),
    initiatedBy: text("initiated_by"),
    createdAt: timestamp("created_at"),
    completedAt: text("completed_at").notNull(),
  },
  (table) => [index("schedule_evaluation_runs_workspace_created_idx").on(table.workspaceId, table.createdAt)],
);

export const scheduleOpportunities = sqliteTable(
  "schedule_opportunities",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    runId: text("run_id").notNull().references(() => scheduleEvaluationRuns.id),
    windowId: text("window_id").notNull().references(() => availabilityWindows.id),
    projectId: text("project_id").notNull().references(() => projects.id),
    clientId: text("client_id").notNull().references(() => clients.id),
    suggestedStartsAt: text("suggested_starts_at").notNull(),
    suggestedEndsAt: text("suggested_ends_at").notNull(),
    reservedFrom: text("reserved_from").notNull(),
    reservedUntil: text("reserved_until").notNull(),
    readinessBps: integer("readiness_bps").notNull(),
    fitBps: integer("fit_bps").notNull(),
    projectedRevenueCents: integer("projected_revenue_cents").notNull().default(0),
    energyDemand: text("energy_demand").notNull(),
    rationale: text("rationale").notNull(),
    evidenceJson: text("evidence_json").notNull().default("[]"),
    status: text("status").notNull().default("proposed"),
    approvalRequired: integer("approval_required", { mode: "boolean" }).notNull().default(true),
    taskId: text("task_id").references(() => agentTasks.id),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("schedule_opportunities_run_window_project_uq").on(table.runId, table.windowId, table.projectId),
    index("schedule_opportunities_workspace_status_idx").on(table.workspaceId, table.status, table.suggestedStartsAt),
    index("schedule_opportunities_run_idx").on(table.runId),
  ],
);

export const tattooSessions = sqliteTable(
  "tattoo_sessions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    projectId: text("project_id").notNull().references(() => projects.id),
    clientId: text("client_id").notNull().references(() => clients.id),
    appointmentId: text("appointment_id").references(() => appointments.id),
    sessionNumber: integer("session_number").notNull().default(1),
    status: text("status").notNull().default("planned"),
    startedAt: text("started_at"),
    endedAt: text("ended_at"),
    designAssetId: text("design_asset_id").references(() => assets.id),
    stencilAssetId: text("stencil_asset_id").references(() => assets.id),
    placementSnapshot: text("placement_snapshot"),
    needleSetup: text("needle_setup"),
    inkSetup: text("ink_setup"),
    techniqueNotes: text("technique_notes"),
    clientVisibleSummary: text("client_visible_summary"),
    durationMinutes: integer("duration_minutes"),
    requestKey: text("request_key"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("tattoo_sessions_workspace_request_key_uq").on(table.workspaceId, table.requestKey),
    index("tattoo_sessions_project_number_idx").on(table.projectId, table.sessionNumber),
    index("tattoo_sessions_client_status_idx").on(table.clientId, table.status),
  ],
);

export const healingCheckins = sqliteTable(
  "healing_checkins",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    projectId: text("project_id").notNull().references(() => projects.id),
    clientId: text("client_id").notNull().references(() => clients.id),
    sessionId: text("session_id").notNull().references(() => tattooSessions.id),
    checkpointDay: integer("checkpoint_day").notNull(),
    scheduledFor: text("scheduled_for").notNull(),
    status: text("status").notNull().default("due"),
    clientNotes: text("client_notes"),
    studioNotes: text("studio_notes"),
    progressRating: integer("progress_rating"),
    concernFlag: integer("concern_flag", { mode: "boolean" }).notNull().default(false),
    ownerResponse: text("owner_response"),
    submittedAt: text("submitted_at"),
    reviewedAt: text("reviewed_at"),
    requestKey: text("request_key"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("healing_checkins_workspace_request_key_uq").on(table.workspaceId, table.requestKey),
    index("healing_checkins_project_schedule_idx").on(table.projectId, table.scheduledFor),
    index("healing_checkins_client_status_idx").on(table.clientId, table.status),
  ],
);

export const sessionCraftRecords = sqliteTable(
  "session_craft_records",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    sessionId: text("session_id").notNull().references(() => tattooSessions.id),
    projectId: text("project_id").notNull().references(() => projects.id),
    clientId: text("client_id").notNull().references(() => clients.id),
    machineName: text("machine_name"),
    machineType: text("machine_type"),
    needleGroupingsJson: text("needle_groupings_json").notNull().default("[]"),
    inkWashJson: text("ink_wash_json").notNull().default("[]"),
    voltageMinMv: integer("voltage_min_mv"),
    voltageMaxMv: integer("voltage_max_mv"),
    techniquesJson: text("techniques_json").notNull().default("[]"),
    bodyArea: text("body_area"),
    skinResponse: text("skin_response"),
    clientResponse: text("client_response"),
    freshOutcomeRating: integer("fresh_outcome_rating"),
    ownerAssessment: text("owner_assessment"),
    freshAssetIdsJson: text("fresh_asset_ids_json").notNull().default("[]"),
    completenessBps: integer("completeness_bps").notNull().default(0),
    recordedBy: text("recorded_by"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("session_craft_records_session_uq").on(table.sessionId),
    index("session_craft_records_workspace_quality_idx").on(table.workspaceId, table.completenessBps),
    index("session_craft_records_project_idx").on(table.projectId),
  ],
);

export const healingAssessments = sqliteTable(
  "healing_assessments",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    checkinId: text("checkin_id").notNull().references(() => healingCheckins.id),
    sessionId: text("session_id").notNull().references(() => tattooSessions.id),
    projectId: text("project_id").notNull().references(() => projects.id),
    clientId: text("client_id").notNull().references(() => clients.id),
    healingPhase: text("healing_phase").notNull(),
    retentionRating: integer("retention_rating"),
    saturationRating: integer("saturation_rating"),
    lineQualityRating: integer("line_quality_rating"),
    smoothnessRating: integer("smoothness_rating"),
    healedOutcomeRating: integer("healed_outcome_rating").notNull(),
    touchupRequired: integer("touchup_required", { mode: "boolean" }).notNull().default(false),
    ownerAssessment: text("owner_assessment").notNull(),
    clientFeedbackSummary: text("client_feedback_summary"),
    photoAssetIdsJson: text("photo_asset_ids_json").notNull().default("[]"),
    assessedBy: text("assessed_by"),
    assessedAt: text("assessed_at").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("healing_assessments_checkin_uq").on(table.checkinId),
    index("healing_assessments_workspace_phase_idx").on(table.workspaceId, table.healingPhase),
    index("healing_assessments_session_idx").on(table.sessionId),
    index("healing_assessments_project_idx").on(table.projectId),
  ],
);

export const craftAnalysisRuns = sqliteTable(
  "craft_analysis_runs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    status: text("status").notNull().default("completed"),
    eligibleSessions: integer("eligible_sessions").notNull().default(0),
    combinationsEvaluated: integer("combinations_evaluated").notNull().default(0),
    candidatePatterns: integer("candidate_patterns").notNull().default(0),
    promotedPatterns: integer("promoted_patterns").notNull().default(0),
    summary: text("summary").notNull(),
    policyVersion: text("policy_version").notNull(),
    evidenceJson: text("evidence_json").notNull().default("[]"),
    initiatedBy: text("initiated_by"),
    createdAt: timestamp("created_at"),
    completedAt: text("completed_at").notNull(),
  },
  (table) => [
    index("craft_analysis_runs_workspace_created_idx").on(table.workspaceId, table.createdAt),
  ],
);

export const contentCandidates = sqliteTable(
  "content_candidates",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    projectId: text("project_id").notNull().references(() => projects.id),
    clientId: text("client_id").notNull().references(() => clients.id),
    sessionId: text("session_id").references(() => tattooSessions.id),
    sourceAssetId: text("source_asset_id").notNull().references(() => assets.id),
    title: text("title").notNull(),
    format: text("format").notNull().default("portfolio"),
    status: text("status").notNull().default("draft"),
    captionDraft: text("caption_draft"),
    evidenceJson: text("evidence_json").notNull().default("[]"),
    rightsStatus: text("rights_status").notNull(),
    consentStatus: text("consent_status").notNull(),
    createdByType: text("created_by_type").notNull().default("agent"),
    approvedBy: text("approved_by"),
    approvedAt: text("approved_at"),
    requestKey: text("request_key"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("content_candidates_workspace_request_key_uq").on(table.workspaceId, table.requestKey),
    index("content_candidates_project_status_idx").on(table.projectId, table.status),
    index("content_candidates_asset_idx").on(table.sourceAssetId),
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

export const observations = sqliteTable(
  "observations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    projectId: text("project_id").references(() => projects.id),
    clientId: text("client_id").references(() => clients.id),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id"),
    category: text("category").notNull(),
    signalKey: text("signal_key").notNull(),
    valueJson: text("value_json").notNull().default("{}"),
    qualityBps: integer("quality_bps").notNull().default(7000),
    consentGrantId: text("consent_grant_id"),
    occurredAt: text("occurred_at").notNull(),
    capturedAt: timestamp("captured_at"),
  },
  (table) => [
    index("observations_workspace_signal_idx").on(
      table.workspaceId,
      table.signalKey,
    ),
    index("observations_project_idx").on(table.projectId),
    index("observations_client_idx").on(table.clientId),
    uniqueIndex("observations_source_uq").on(
      table.workspaceId,
      table.sourceType,
      table.sourceId,
      table.signalKey,
    ),
  ],
);

export const patterns = sqliteTable(
  "patterns",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    patternKey: text("pattern_key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    whyItMatters: text("why_it_matters").notNull(),
    status: text("status").notNull().default("candidate"),
    supportCount: integer("support_count").notNull().default(0),
    distinctProjects: integer("distinct_projects").notNull().default(0),
    distinctClients: integer("distinct_clients").notNull().default(0),
    effectBps: integer("effect_bps").notNull().default(0),
    confidenceBps: integer("confidence_bps").notNull().default(0),
    significanceBps: integer("significance_bps").notNull().default(0),
    evidenceJson: text("evidence_json").notNull().default("[]"),
    evidenceHash: text("evidence_hash"),
    firstSeenAt: text("first_seen_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
    lastEvaluatedAt: text("last_evaluated_at").notNull(),
    version: integer("version").notNull().default(1),
    supersedesPatternId: text("supersedes_pattern_id"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("patterns_workspace_key_uq").on(
      table.workspaceId,
      table.patternKey,
    ),
    index("patterns_workspace_status_idx").on(table.workspaceId, table.status),
    index("patterns_confidence_idx").on(table.confidenceBps),
  ],
);

export const recommendations = sqliteTable(
  "recommendations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    patternId: text("pattern_id").references(() => patterns.id),
    projectId: text("project_id").references(() => projects.id),
    clientId: text("client_id").references(() => clients.id),
    actionType: text("action_type").notNull(),
    title: text("title").notNull(),
    rationale: text("rationale").notNull(),
    evidenceJson: text("evidence_json").notNull().default("[]"),
    confidenceBps: integer("confidence_bps").notNull(),
    riskLevel: text("risk_level").notNull(),
    reversibility: text("reversibility").notNull(),
    autonomyLevel: text("autonomy_level").notNull(),
    approvalRequired: integer("approval_required", { mode: "boolean" })
      .notNull()
      .default(true),
    status: text("status").notNull().default("proposed"),
    actedAt: text("acted_at"),
    dismissedAt: text("dismissed_at"),
    expiresAt: text("expires_at"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("recommendations_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    index("recommendations_pattern_idx").on(table.patternId),
    index("recommendations_project_idx").on(table.projectId),
  ],
);

export const outcomes = sqliteTable(
  "outcomes",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    recommendationId: text("recommendation_id").references(
      () => recommendations.id,
    ),
    projectId: text("project_id").references(() => projects.id),
    metricName: text("metric_name").notNull(),
    baselineValue: integer("baseline_value"),
    targetValue: integer("target_value"),
    resultValue: integer("result_value"),
    unit: text("unit").notNull().default("basis_points"),
    direction: text("direction").notNull().default("increase"),
    status: text("status").notNull().default("pending"),
    observationWindowDays: integer("observation_window_days")
      .notNull()
      .default(30),
    measuredAt: text("measured_at"),
    evidenceJson: text("evidence_json").notNull().default("[]"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("outcomes_recommendation_idx").on(table.recommendationId),
    index("outcomes_project_idx").on(table.projectId),
    index("outcomes_status_idx").on(table.workspaceId, table.status),
  ],
);

export const learningCycles = sqliteTable(
  "learning_cycles",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    projectId: text("project_id").references(() => projects.id),
    triggerType: text("trigger_type").notNull(),
    status: text("status").notNull().default("queued"),
    observationsProcessed: integer("observations_processed")
      .notNull()
      .default(0),
    patternsEvaluated: integer("patterns_evaluated").notNull().default(0),
    patternsPromoted: integer("patterns_promoted").notNull().default(0),
    recommendationsCreated: integer("recommendations_created")
      .notNull()
      .default(0),
    outcomesMeasured: integer("outcomes_measured").notNull().default(0),
    eligibleObservations: integer("eligible_observations").notNull().default(0),
    newEvidenceCount: integer("new_evidence_count").notNull().default(0),
    evidenceFingerprint: text("evidence_fingerprint"),
    knowledgeChanged: integer("knowledge_changed", { mode: "boolean" }).notNull().default(false),
    changeSetJson: text("change_set_json").notNull().default("{}"),
    priorCycleId: text("prior_cycle_id"),
    summary: text("summary"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    index("learning_cycles_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    index("learning_cycles_project_idx").on(table.projectId),
    uniqueIndex("learning_cycles_workspace_evidence_uq").on(table.workspaceId, table.evidenceFingerprint),
  ],
);

export const automationJobs = sqliteTable(
  "automation_jobs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    jobType: text("job_type").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    payloadJson: text("payload_json").notNull().default("{}"),
    idempotencyKey: text("idempotency_key"),
    status: text("status").notNull().default("queued"),
    priority: integer("priority").notNull().default(50),
    runAfter: text("run_after").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    lockedAt: text("locked_at"),
    leaseOwner: text("lease_owner"),
    leaseExpiresAt: text("lease_expires_at"),
    completedAt: text("completed_at"),
    deadLetteredAt: text("dead_lettered_at"),
    replayOfJobId: text("replay_of_job_id"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("automation_jobs_queue_idx").on(
      table.workspaceId,
      table.status,
      table.runAfter,
      table.priority,
    ),
    index("automation_jobs_entity_idx").on(table.entityType, table.entityId),
    uniqueIndex("automation_jobs_workspace_idempotency_uq").on(table.workspaceId, table.idempotencyKey),
    index("automation_jobs_lease_idx").on(table.workspaceId, table.status, table.leaseExpiresAt),
  ],
);

export const automationSchedules = sqliteTable(
  "automation_schedules",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    scheduleKey: text("schedule_key").notNull(),
    displayName: text("display_name").notNull(),
    handlerKey: text("handler_key").notNull(),
    intervalMinutes: integer("interval_minutes").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    nextRunAt: text("next_run_at").notNull(),
    lastRunAt: text("last_run_at"),
    lastOutcome: text("last_outcome"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("automation_schedules_workspace_key_uq").on(table.workspaceId, table.scheduleKey),
    index("automation_schedules_due_idx").on(table.workspaceId, table.enabled, table.nextRunAt),
  ],
);

export const automationWorkerRuns = sqliteTable(
  "automation_worker_runs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    workerId: text("worker_id").notNull(),
    triggerType: text("trigger_type").notNull(),
    status: text("status").notNull().default("running"),
    schedulesProcessed: integer("schedules_processed").notNull().default(0),
    jobsProcessed: integer("jobs_processed").notNull().default(0),
    jobsSucceeded: integer("jobs_succeeded").notNull().default(0),
    jobsFailed: integer("jobs_failed").notNull().default(0),
    leasesRecovered: integer("leases_recovered").notNull().default(0),
    playbookStepsProcessed: integer("playbook_steps_processed").notNull().default(0),
    errorSummary: text("error_summary"),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
    createdAt: timestamp("created_at"),
  },
  (table) => [index("automation_worker_runs_workspace_started_idx").on(table.workspaceId, table.startedAt)],
);

export const automationDeadLetters = sqliteTable(
  "automation_dead_letters",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id),
    jobId: text("job_id").notNull().references(() => automationJobs.id),
    jobType: text("job_type").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    payloadRedactedJson: text("payload_redacted_json").notNull().default("{}"),
    errorSummary: text("error_summary").notNull(),
    attempts: integer("attempts").notNull(),
    status: text("status").notNull().default("open"),
    replayJobId: text("replay_job_id"),
    replayedAt: text("replayed_at"),
    createdAt: timestamp("created_at"),
  },
  (table) => [
    uniqueIndex("automation_dead_letters_job_uq").on(table.jobId),
    index("automation_dead_letters_workspace_status_idx").on(table.workspaceId, table.status, table.createdAt),
  ],
);

export const consentGrants = sqliteTable(
  "consent_grants",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id),
    consentType: text("consent_type").notNull(),
    scopesJson: text("scopes_json").notNull().default("[]"),
    purpose: text("purpose").notNull(),
    policyVersion: text("policy_version").notNull(),
    status: text("status").notNull().default("granted"),
    grantedAt: text("granted_at").notNull(),
    expiresAt: text("expires_at"),
    revokedAt: text("revoked_at"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("consent_grants_client_type_idx").on(
      table.clientId,
      table.consentType,
      table.status,
    ),
  ],
);

export const socialConnections = sqliteTable(
  "social_connections",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id),
    consentGrantId: text("consent_grant_id")
      .notNull()
      .references(() => consentGrants.id),
    platform: text("platform").notNull(),
    externalAccountId: text("external_account_id").notNull(),
    handle: text("handle"),
    accountType: text("account_type"),
    scopesJson: text("scopes_json").notNull().default("[]"),
    encryptedTokenJson: text("encrypted_token_json"),
    tokenExpiresAt: text("token_expires_at"),
    status: text("status").notNull().default("connected"),
    lastSyncedAt: text("last_synced_at"),
    lastCursor: text("last_cursor"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    uniqueIndex("social_connection_account_uq").on(
      table.workspaceId,
      table.platform,
      table.externalAccountId,
    ),
    index("social_connections_client_idx").on(table.clientId, table.status),
  ],
);

export const socialObservations = sqliteTable(
  "social_observations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    connectionId: text("connection_id")
      .notNull()
      .references(() => socialConnections.id),
    consentGrantId: text("consent_grant_id")
      .notNull()
      .references(() => consentGrants.id),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id),
    projectId: text("project_id").references(() => projects.id),
    externalMediaId: text("external_media_id").notNull(),
    mediaType: text("media_type").notNull(),
    permalinkHash: text("permalink_hash"),
    captionSummary: text("caption_summary"),
    tattooMatchBps: integer("tattoo_match_bps").notNull().default(0),
    metricsJson: text("metrics_json").notNull().default("{}"),
    postedAt: text("posted_at"),
    observedAt: timestamp("observed_at"),
  },
  (table) => [
    uniqueIndex("social_observations_media_uq").on(
      table.connectionId,
      table.externalMediaId,
    ),
    index("social_observations_project_idx").on(table.projectId),
  ],
);
