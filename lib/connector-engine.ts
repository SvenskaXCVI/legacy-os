import { and, desc, eq, isNull } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../db";
import {
  agentTasks,
  appointments,
  approvals,
  auditEvents,
  clientMessages,
  clients,
  connectorAccounts,
  connectorDefinitions,
  connectorExecutions,
  notifications,
  projects,
} from "../db/schema";
import { captureAutomationSignal } from "./automation-engine";
import { syncSocialConnections } from "./social-sync";
import { stripeConfiguration } from "./stripe";
import { assertToolExecutionAuthorized } from "./tool-authority-engine";
import { createGoogleCalendarEvent, googleOAuthConfigured, sendGmailMessage } from "./google-connectors";
import { getModelRuntimeStatus } from "./model-adapter";

type Db = ReturnType<typeof getDb>;

export const CONNECTOR_POLICY_VERSION = "least-privilege-connectors-v2";

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function configured(...names: Array<keyof typeof env>) {
  return names.every((name) => typeof env[name] === "string" && String(env[name]).trim().length > 0);
}

function registryState(accounts: Map<string, { status: string; lastErrorSummary: string | null }>) {
  const stripe = stripeConfiguration();
  const instagram = configured("INSTAGRAM_CLIENT_ID", "INSTAGRAM_CLIENT_SECRET", "INSTAGRAM_REDIRECT_URI", "SOCIAL_TOKEN_ENCRYPTION_KEY");
  const model = getModelRuntimeStatus();
  const googleReady = googleOAuthConfigured();
  const gmailAccount = accounts.get("gmail");
  const calendarAccount = accounts.get("google_calendar");
  const gmail = gmailAccount?.status === "connected";
  const googleCalendar = calendarAccount?.status === "connected";
  const googleHealth = (account: { status: string; lastErrorSummary: string | null } | undefined, connected: boolean) => connected ? "healthy" : account?.status === "attention_required" ? "degraded" : googleReady ? "not_connected" : "not_configured";
  return [
    { key: "client_portal", name: "Client Portal", category: "communication", description: "Delivers owner-approved messages inside the private Legacy OS client portal.", capabilities: ["send_client_message"], configured: true, credential: "app_managed", health: "healthy" },
    { key: "studio_calendar", name: "Studio Calendar", category: "scheduling", description: "Creates owner-approved Legacy OS appointments after scope and conflict validation.", capabilities: ["schedule_appointment"], configured: true, credential: "app_managed", health: "healthy" },
    { key: "gmail", name: "Gmail", category: "communication", description: "Sends exact owner-approved client email through the connected studio mailbox using the narrow Gmail send scope.", capabilities: ["send_client_email"], configured: gmail, credential: gmail ? "encrypted_oauth" : googleReady ? "oauth_ready" : "missing", health: googleHealth(gmailAccount, gmail) },
    { key: "google_calendar", name: "Google Calendar", category: "scheduling", description: "Mirrors approved studio appointments to the connected Google Calendar with deterministic event IDs.", capabilities: ["mirror_appointment"], configured: googleCalendar, credential: googleCalendar ? "encrypted_oauth" : googleReady ? "oauth_ready" : "missing", health: googleHealth(calendarAccount, googleCalendar) },
    { key: "instagram", name: "Instagram", category: "social", description: "Reads consented professional-account evidence; publishing is not enabled.", capabilities: ["sync_social_evidence"], configured: instagram, credential: instagram ? "configured" : "missing", health: instagram ? "configured" : "not_configured" },
    { key: "stripe", name: "Stripe Checkout", category: "payments", description: "Creates client-initiated hosted Checkout sessions and trusts signed webhooks for settlement.", capabilities: ["client_checkout", "signed_webhook"], configured: stripe.configured, credential: stripe.configured ? stripe.keyType : "missing", health: stripe.configured ? (stripe.liveMode ? "live_locked_or_enabled" : "test_ready") : "not_configured" },
    { key: "reasoning_model", name: "Reasoning Model", category: "intelligence", description: "Stateless production reasoning adapter; Legacy OS retains memory, policy, evidence, tools, authority, and outcomes.", capabilities: ["bounded_reasoning", "structured_planning"], configured: model.configured, credential: model.configured ? "server_secret" : "missing", health: model.configured ? model.mode : "deterministic_fallback" },
  ] as const;
}

export async function ensureConnectorRegistry(workspaceId: string, db: Db = getDb()) {
  const now = new Date().toISOString();
  const accounts = await db.select({ connectorKey: connectorAccounts.connectorKey, status: connectorAccounts.status, lastErrorSummary: connectorAccounts.lastErrorSummary }).from(connectorAccounts).where(eq(connectorAccounts.workspaceId, workspaceId));
  for (const connector of registryState(new Map(accounts.map((account) => [account.connectorKey, account])))) {
    await db.insert(connectorDefinitions).values({
      id: `connector_${workspaceId}_${connector.key}`,
      workspaceId,
      connectorKey: connector.key,
      displayName: connector.name,
      category: connector.category,
      description: connector.description,
      capabilitiesJson: JSON.stringify(connector.capabilities),
      credentialState: connector.credential,
      status: connector.configured ? "available" : "configuration_required",
      healthStatus: connector.health,
      lastCheckedAt: now,
      policyVersion: CONNECTOR_POLICY_VERSION,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [connectorDefinitions.workspaceId, connectorDefinitions.connectorKey],
      set: {
        displayName: connector.name,
        category: connector.category,
        description: connector.description,
        capabilitiesJson: JSON.stringify(connector.capabilities),
        credentialState: connector.credential,
        status: connector.configured ? "available" : "configuration_required",
        healthStatus: connector.health,
        lastCheckedAt: now,
        policyVersion: CONNECTOR_POLICY_VERSION,
        updatedAt: now,
      },
    });
  }
}

export async function listConnectorOperations(workspaceId: string, db: Db = getDb()) {
  await ensureConnectorRegistry(workspaceId, db);
  const [connectors, executions] = await Promise.all([
    db.select().from(connectorDefinitions).where(eq(connectorDefinitions.workspaceId, workspaceId)).orderBy(connectorDefinitions.displayName),
    db.select().from(connectorExecutions).where(eq(connectorExecutions.workspaceId, workspaceId)).orderBy(desc(connectorExecutions.createdAt)).limit(100),
  ]);
  return { connectors, executions, policyVersion: CONNECTOR_POLICY_VERSION };
}

const ACTION_CONNECTOR: Record<string, string> = {
  send_client_message: "client_portal",
  send_client_email: "gmail",
  schedule_appointment: "studio_calendar",
  sync_social_evidence: "instagram",
};

function redactedRequest(actionType: string, payload: Record<string, unknown>) {
  if (actionType === "send_client_message") return { clientId: payload.clientId, projectId: payload.projectId || null, characterCount: String(payload.messageBody || "").length, contentCaptured: false };
  if (actionType === "send_client_email") return { clientId: payload.clientId, projectId: payload.projectId || null, subjectCharacterCount: String(payload.subject || "").length, bodyCharacterCount: String(payload.messageBody || "").length, contentCaptured: false };
  if (actionType === "schedule_appointment") return { clientId: payload.clientId, projectId: payload.projectId || null, startsAt: payload.startsAt, endsAt: payload.endsAt || null, appointmentType: payload.appointmentType || "session" };
  return { connectionId: payload.connectionId || null };
}

export async function executeConnectorAction(input: {
  workspaceId: string;
  connectorKey?: string;
  actionType?: string;
  taskId?: string | null;
  actorType: "owner" | "agent" | "client" | "system";
  actorId?: string | null;
  payload?: Record<string, unknown>;
  idempotencyKey: string;
}, db: Db = getDb()) {
  await ensureConnectorRegistry(input.workspaceId, db);
  const existing = await db.select().from(connectorExecutions).where(and(eq(connectorExecutions.workspaceId, input.workspaceId), eq(connectorExecutions.idempotencyKey, input.idempotencyKey))).get();
  if (existing) return existing;

  const task = input.taskId ? await db.select().from(agentTasks).where(and(eq(agentTasks.id, input.taskId), eq(agentTasks.workspaceId, input.workspaceId))).get() : null;
  if (input.taskId && !task) throw new Error("Agent task not found");
  const approval = task?.approvalId ? await db.select().from(approvals).where(eq(approvals.id, task.approvalId)).get() : null;
  if (task && (!approval || approval.status !== "approved")) throw new Error("An approved owner decision is required before connector execution");
  const actionType = task ? approval?.actionType || task.toolKey : input.actionType;
  if (!actionType) throw new Error("Connector action is required");
  const payload = task ? JSON.parse(task.actionPayloadJson) as Record<string, unknown> : { ...(input.payload || {}) };
  const approvalMetadata = approval ? JSON.parse(approval.payloadRedactedJson) as Record<string, unknown> : {};
  if (task && approvalMetadata.toolKey && approval?.payloadHash !== await sha256(JSON.stringify({ taskId: task.id, toolKey: actionType, payload }))) throw new Error("The approved action payload no longer matches this task");
  await assertToolExecutionAuthorized({
    workspaceId: input.workspaceId,
    toolKey: actionType,
    agentKey: task?.agentKey || null,
    actorType: task ? "agent" : input.actorType,
    actorId: input.actorId ?? task?.agentKey ?? null,
    taskId: task?.id ?? null,
    approvalId: approval?.id ?? null,
    correlationId: task?.correlationId || crypto.randomUUID(),
    payload,
  }, db);
  const connectorKey = task ? ACTION_CONNECTOR[actionType] : input.connectorKey || ACTION_CONNECTOR[actionType];
  if (!connectorKey || ACTION_CONNECTOR[actionType] !== connectorKey) throw new Error("This action has no approved connector adapter");
  const connector = await db.select().from(connectorDefinitions).where(and(eq(connectorDefinitions.workspaceId, input.workspaceId), eq(connectorDefinitions.connectorKey, connectorKey))).get();
  if (!connector || connector.status !== "available") throw new Error(`${connector?.displayName || connectorKey} requires configuration before it can run`);
  const now = new Date().toISOString();
  const executionId = makeId("connector_run");
  await db.insert(connectorExecutions).values({
    id: executionId, workspaceId: input.workspaceId, connectorKey, taskId: task?.id ?? null, approvalId: approval?.id ?? null,
    actorType: input.actorType, actorId: input.actorId ?? null, actionType, idempotencyKey: input.idempotencyKey,
    requestHash: await sha256(JSON.stringify(payload)), requestRedactedJson: JSON.stringify(redactedRequest(actionType, payload)),
    status: "running", attempts: 1, startedAt: now, createdAt: now, updatedAt: now,
  });

  try {
    let externalReference: string | null = null;
    let resultSummary = "Connector action completed.";
    if (actionType === "send_client_message") {
      const clientId = String(payload.clientId || task?.clientId || "");
      const projectId = String(payload.projectId || task?.projectId || "") || null;
      const body = String(payload.messageBody || "").trim();
      if (!clientId || !body) throw new Error("Client and approved message body are required");
      const client = await db.select({ id: clients.id }).from(clients).where(and(eq(clients.id, clientId), eq(clients.workspaceId, input.workspaceId))).get();
      if (!client) throw new Error("Client not found");
      if (projectId) {
        const project = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.workspaceId, input.workspaceId), eq(projects.clientId, clientId))).get();
        if (!project) throw new Error("Project is not scoped to this client");
      }
      const messageId = makeId("msg");
      await db.batch([
        db.insert(clientMessages).values({ id: messageId, workspaceId: input.workspaceId, clientId, projectId, senderType: "agent", senderId: task?.agentKey || "chief_of_staff", body, status: "sent", createdAt: now }),
        db.update(clientMessages).set({ readAt: now }).where(and(eq(clientMessages.workspaceId, input.workspaceId), eq(clientMessages.clientId, clientId), eq(clientMessages.senderType, "client"), isNull(clientMessages.readAt))),
        db.update(notifications).set({ status: "dismissed", readAt: now, dismissedAt: now }).where(and(eq(notifications.workspaceId, input.workspaceId), eq(notifications.dedupeKey, `communication:client:${projectId || clientId}`))),
      ]);
      externalReference = messageId;
      resultSummary = "Approved message delivered to the client portal.";
      await captureAutomationSignal({ workspaceId: input.workspaceId, eventType: "agent_message_sent", sourceType: "message", sourceId: messageId, projectId, clientId, category: "communication", signalKey: "communication.agent_message", value: { direction: "outbound", characterCount: body.length, contentCaptured: false }, priority: 55 }, db).catch(() => null);
    } else if (actionType === "send_client_email") {
      const clientId = String(payload.clientId || task?.clientId || "");
      const projectId = String(payload.projectId || task?.projectId || "") || null;
      const subject = String(payload.subject || "").trim();
      const body = String(payload.messageBody || "").trim();
      if (!clientId || !subject || !body) throw new Error("Client, approved email subject, and approved email body are required");
      const client = await db.select({ id: clients.id, email: clients.email }).from(clients).where(and(eq(clients.id, clientId), eq(clients.workspaceId, input.workspaceId))).get();
      if (!client?.email) throw new Error("This client does not have an email address");
      if (projectId) {
        const project = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.workspaceId, input.workspaceId), eq(projects.clientId, clientId))).get();
        if (!project) throw new Error("Project is not scoped to this client");
      }
      const delivered = await sendGmailMessage({ workspaceId: input.workspaceId, to: client.email, subject, body }, db);
      externalReference = delivered.id;
      resultSummary = "Exact owner-approved email delivered through Gmail; message content was not copied into the connector ledger.";
      await captureAutomationSignal({ workspaceId: input.workspaceId, eventType: "agent_email_sent", sourceType: "gmail_message", sourceId: delivered.id, projectId, clientId, category: "communication", signalKey: "communication.agent_email", value: { direction: "outbound", subjectCharacterCount: subject.length, bodyCharacterCount: body.length, contentCaptured: false }, priority: 60 }, db).catch(() => null);
    } else if (actionType === "schedule_appointment") {
      const clientId = String(payload.clientId || task?.clientId || "");
      const projectId = String(payload.projectId || task?.projectId || "") || null;
      const startsAt = String(payload.startsAt || "");
      const endsAt = String(payload.endsAt || "") || null;
      if (!clientId || !startsAt || Number.isNaN(new Date(startsAt).getTime())) throw new Error("Client and a valid approved start time are required");
      const client = await db.select({ id: clients.id }).from(clients).where(and(eq(clients.id, clientId), eq(clients.workspaceId, input.workspaceId))).get();
      if (!client) throw new Error("Client not found");
      if (projectId) {
        const project = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.workspaceId, input.workspaceId), eq(projects.clientId, clientId))).get();
        if (!project) throw new Error("Project is not scoped to this client");
      }
      const proposedStart = new Date(startsAt).getTime();
      const proposedEnd = endsAt ? new Date(endsAt).getTime() : proposedStart + 60 * 60_000;
      const existingAppointments = await db.select().from(appointments).where(eq(appointments.workspaceId, input.workspaceId));
      const conflict = existingAppointments.find((item) => item.status === "scheduled" && proposedStart < new Date(item.endsAt || new Date(new Date(item.startsAt).getTime() + 60 * 60_000)).getTime() && proposedEnd > new Date(item.startsAt).getTime());
      if (conflict) throw new Error("The approved time conflicts with an existing appointment");
      const googleAccount = await db.select({ id: connectorAccounts.id }).from(connectorAccounts).where(and(eq(connectorAccounts.workspaceId, input.workspaceId), eq(connectorAccounts.connectorKey, "google_calendar"), eq(connectorAccounts.status, "connected"))).get();
      if (googleAccount) {
        const googleEvent = await createGoogleCalendarEvent({ workspaceId: input.workspaceId, idempotencyKey: input.idempotencyKey, summary: String(payload.summary || `${String(payload.appointmentType || "session").replaceAll("_", " ")} · Legacy Lines`), description: String(payload.description || "").trim() || null, location: String(payload.location || "").trim() || null, startsAt, endsAt: new Date(proposedEnd).toISOString(), projectId, clientId }, db);
        externalReference = googleEvent.id;
      }
      const appointmentId = makeId("apt");
      await db.insert(appointments).values({ id: appointmentId, workspaceId: input.workspaceId, clientId, projectId, appointmentType: String(payload.appointmentType || "session"), startsAt, endsAt, location: String(payload.location || "").trim() || null, notes: String(payload.notes || "").trim() || null, createdBy: task?.agentKey || input.actorId || "owner", createdAt: now, updatedAt: now });
      externalReference ||= appointmentId;
      resultSummary = googleAccount ? "Approved appointment added locally and mirrored idempotently to Google Calendar." : "Approved appointment added after client scope and conflict checks; Google Calendar is not connected.";
      await captureAutomationSignal({ workspaceId: input.workspaceId, eventType: "agent_appointment_scheduled", sourceType: "appointment", sourceId: appointmentId, projectId, clientId, category: "scheduling", signalKey: `appointment.${String(payload.appointmentType || "session")}`, value: { startsAt, endsAt, actor: "agent" }, priority: 75 }, db).catch(() => null);
    } else if (actionType === "sync_social_evidence") {
      const result = await syncSocialConnections(input.workspaceId, typeof payload.connectionId === "string" ? payload.connectionId : null);
      resultSummary = `Social evidence synchronized: ${result.connectionsSynced} connection(s), ${result.mediaObserved} media observation(s), ${result.projectMatches} project match(es).`;
    }
    const completedAt = new Date().toISOString();
    await db.batch([
      db.update(connectorExecutions).set({ status: "succeeded", externalReference, resultSummary, completedAt, updatedAt: completedAt }).where(eq(connectorExecutions.id, executionId)),
      db.update(connectorDefinitions).set({ healthStatus: "healthy", lastSuccessAt: completedAt, lastErrorSummary: null, updatedAt: completedAt }).where(and(eq(connectorDefinitions.workspaceId, input.workspaceId), eq(connectorDefinitions.connectorKey, connectorKey))),
      ...(task ? [db.update(agentTasks).set({ status: "succeeded", resultSummary, completedAt, updatedAt: completedAt }).where(eq(agentTasks.id, task.id))] : []),
      db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: input.workspaceId, actorType: input.actorType, actorId: input.actorId ?? task?.agentKey ?? null, action: "connector.execution_succeeded", targetType: "connector_execution", targetId: executionId, riskLevel: task?.riskLevel || "low", outcome: "succeeded", correlationId: task?.correlationId ?? null, metadataJson: JSON.stringify({ connectorKey, actionType, externalReference, taskId: task?.id || null }), occurredAt: completedAt }),
    ]);
  } catch (error) {
    const completedAt = new Date().toISOString();
    const errorSummary = error instanceof Error ? error.message : "Connector execution failed";
    await db.batch([
      db.update(connectorExecutions).set({ status: "failed", errorCode: "connector_action_failed", errorSummary, completedAt, updatedAt: completedAt }).where(eq(connectorExecutions.id, executionId)),
      db.update(connectorDefinitions).set({ healthStatus: "degraded", lastErrorSummary: errorSummary, updatedAt: completedAt }).where(and(eq(connectorDefinitions.workspaceId, input.workspaceId), eq(connectorDefinitions.connectorKey, connectorKey))),
      ...(task ? [db.update(agentTasks).set({ status: "failed", errorSummary, updatedAt: completedAt }).where(eq(agentTasks.id, task.id))] : []),
      db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: input.workspaceId, actorType: input.actorType, actorId: input.actorId ?? task?.agentKey ?? null, action: "connector.execution_failed", targetType: "connector_execution", targetId: executionId, riskLevel: task?.riskLevel || "low", outcome: "failed", correlationId: task?.correlationId ?? null, metadataJson: JSON.stringify({ connectorKey, actionType, taskId: task?.id || null, errorCode: "connector_action_failed" }), occurredAt: completedAt }),
    ]);
  }
  return db.select().from(connectorExecutions).where(eq(connectorExecutions.id, executionId)).get();
}

export async function recordObservedConnectorExecution(input: {
  workspaceId: string; connectorKey: string; actionType: string; actorType: "client" | "owner" | "system";
  actorId?: string | null; idempotencyKey: string; externalReference?: string | null; resultSummary: string; redactedRequest?: Record<string, unknown>;
}, db: Db = getDb()) {
  await ensureConnectorRegistry(input.workspaceId, db);
  const existing = await db.select().from(connectorExecutions).where(and(eq(connectorExecutions.workspaceId, input.workspaceId), eq(connectorExecutions.idempotencyKey, input.idempotencyKey))).get();
  if (existing) return existing;
  const now = new Date().toISOString();
  const id = makeId("connector_run");
  await db.insert(connectorExecutions).values({ id, workspaceId: input.workspaceId, connectorKey: input.connectorKey, actorType: input.actorType, actorId: input.actorId ?? null, actionType: input.actionType, idempotencyKey: input.idempotencyKey, requestHash: await sha256(JSON.stringify(input.redactedRequest || {})), requestRedactedJson: JSON.stringify(input.redactedRequest || {}), externalReference: input.externalReference ?? null, resultSummary: input.resultSummary, status: "succeeded", attempts: 1, startedAt: now, completedAt: now, createdAt: now, updatedAt: now });
  await db.update(connectorDefinitions).set({ healthStatus: "healthy", lastSuccessAt: now, lastErrorSummary: null, updatedAt: now }).where(and(eq(connectorDefinitions.workspaceId, input.workspaceId), eq(connectorDefinitions.connectorKey, input.connectorKey)));
  return db.select().from(connectorExecutions).where(eq(connectorExecutions.id, id)).get();
}
