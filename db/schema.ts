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
    status: text("status").notNull().default("queued"),
    priority: integer("priority").notNull().default(50),
    runAfter: text("run_after").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    lockedAt: text("locked_at"),
    completedAt: text("completed_at"),
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
