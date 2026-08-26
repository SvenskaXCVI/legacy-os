import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  aiRuns,
  agentDefinitions,
  agentHandoffs,
  agentTasks,
  appointments,
  approvals,
  authorityDecisions,
  assets,
  auditEvents,
  captureEvents,
  chiefManagerRuns,
  chiefManagerSteps,
  clientMessages,
  clients,
  consentGrants,
  connectorAccounts,
  connectorDefinitions,
  connectorExecutions,
  contentCandidates,
  healingCheckins,
  knowledgeItems,
  memoryRecords,
  notifications,
  outcomes,
  paymentRequests,
  projectCandidates,
  projects,
  specialistEvaluations,
  tattooSessions,
  toolDefinitions,
  users,
  workspaces,
} from "../../../db/schema";
import {
  actorFrom,
  displayNameFrom,
  makeId,
  requireOwner,
  routeError,
  WORKSPACE_ID,
} from "../_lib";
import { buildTattooJourney } from "../../../lib/tattoo-journey";
import { ensureAgentRegistry } from "../../../lib/agent-engine";
import { ensureConnectorRegistry } from "../../../lib/connector-engine";
import { listPlaybookOperations } from "../../../lib/playbook-engine";
import { ensureToolRegistry } from "../../../lib/tool-authority-engine";
import { listCraftIntelligence } from "../../../lib/craft-intelligence";
import { listSchedulingIntelligence } from "../../../lib/scheduling-intelligence";

export async function GET(request: Request) {
  try {
    const access = await requireOwner(request);
    const db = getDb();
    const email = access.user!.email || actorFrom(request);
    const displayName =
      access.user!.displayName || displayNameFrom(request);

    await db
      .insert(workspaces)
      .values({
        id: WORKSPACE_ID,
        name: "Legacy Studio",
        domainType: "tattoo",
        timezone: "America/Los_Angeles",
      })
      .onConflictDoNothing();
    await db
      .insert(users)
      .values({
        id: makeId("usr"),
        workspaceId: WORKSPACE_ID,
        email,
        displayName,
        role: "owner",
      })
      .onConflictDoUpdate({
        target: [users.workspaceId, users.email],
        set: { displayName, updatedAt: new Date().toISOString() },
      });

    const existingAuditRows = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.workspaceId, WORKSPACE_ID))
      .orderBy(desc(auditEvents.occurredAt))
      .limit(100);
    await ensureAgentRegistry(WORKSPACE_ID, db);
    await ensureConnectorRegistry(WORKSPACE_ID, db);
    await ensureToolRegistry(WORKSPACE_ID, db);
    const playbookOperations = await listPlaybookOperations(WORKSPACE_ID, db);
    const craftIntelligence = await listCraftIntelligence(WORKSPACE_ID, db);
    const schedulingIntelligence = await listSchedulingIntelligence(WORKSPACE_ID, db);

    const [
      workspace,
      owner,
      clientRows,
      projectRows,
      candidateRows,
      appointmentRows,
      approvalRows,
      messageRows,
      assetRows,
      knowledgeRows,
      runRows,
      notificationRows,
      paymentRows,
      sessionRows,
      healingRows,
      contentCandidateRows,
      mediaConsentRows,
      outcomeRows,
      captureRows,
      memoryRows,
      agentRows,
      agentTaskRows,
      agentHandoffRows,
      connectorRows,
      connectorAccountRows,
      connectorExecutionRows,
      toolDefinitionRows,
      authorityDecisionRows,
      chiefManagerRunRows,
      chiefManagerStepRows,
      specialistEvaluationRows,
    ] = await Promise.all([
      db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, WORKSPACE_ID))
        .get(),
      db
        .select()
        .from(users)
        .where(
          and(
            eq(users.email, email),
            eq(users.workspaceId, WORKSPACE_ID),
          ),
        )
        .get(),
      db
        .select()
        .from(clients)
        .where(eq(clients.workspaceId, WORKSPACE_ID))
        .orderBy(desc(clients.updatedAt)),
      db
        .select({
          id: projects.id,
          clientId: projects.clientId,
          clientFirstName: clients.firstName,
          clientLastName: clients.lastName,
          title: projects.title,
          projectType: projects.projectType,
          lifecyclePhase: projects.lifecyclePhase,
          status: projects.status,
          priority: projects.priority,
          placement: projects.placement,
          sizeDescription: projects.sizeDescription,
          styleTagsJson: projects.styleTagsJson,
          budgetMinCents: projects.budgetMinCents,
          budgetMaxCents: projects.budgetMaxCents,
          targetDate: projects.targetDate,
          nextAction: projects.nextAction,
          nextActionAt: projects.nextActionAt,
          summary: projects.summary,
          clientSummary: projects.clientSummary,
          originMode: projects.originMode,
          historicalStartedAt: projects.historicalStartedAt,
          financialClassification: projects.financialClassification,
          isTest: projects.isTest,
          archivedAt: projects.archivedAt,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        })
        .from(projects)
        .leftJoin(clients, eq(projects.clientId, clients.id))
        .where(eq(projects.workspaceId, WORKSPACE_ID))
        .orderBy(desc(projects.updatedAt)),
      db
        .select()
        .from(projectCandidates)
        .where(eq(projectCandidates.workspaceId, WORKSPACE_ID))
        .orderBy(desc(projectCandidates.submittedAt)),
      db
        .select()
        .from(appointments)
        .where(eq(appointments.workspaceId, WORKSPACE_ID))
        .orderBy(appointments.startsAt),
      db
        .select()
        .from(approvals)
        .where(eq(approvals.workspaceId, WORKSPACE_ID))
        .orderBy(desc(approvals.createdAt)),
      db
        .select()
        .from(clientMessages)
        .where(eq(clientMessages.workspaceId, WORKSPACE_ID))
        .orderBy(desc(clientMessages.createdAt))
        .limit(100),
      db
        .select()
        .from(assets)
        .where(eq(assets.workspaceId, WORKSPACE_ID))
        .orderBy(desc(assets.createdAt))
        .limit(100),
      db
        .select({
          id: knowledgeItems.id,
          projectId: knowledgeItems.projectId,
          itemType: knowledgeItems.itemType,
          title: knowledgeItems.title,
          content: knowledgeItems.content,
          summary: knowledgeItems.summary,
          tagsJson: knowledgeItems.tagsJson,
          confidenceBps: knowledgeItems.confidenceBps,
          verificationStatus: knowledgeItems.verificationStatus,
          createdAt: knowledgeItems.createdAt,
        })
        .from(knowledgeItems)
        .where(eq(knowledgeItems.workspaceId, WORKSPACE_ID))
        .orderBy(desc(knowledgeItems.updatedAt))
        .limit(100),
      db
        .select()
        .from(aiRuns)
        .where(eq(aiRuns.workspaceId, WORKSPACE_ID))
        .orderBy(desc(aiRuns.createdAt))
        .limit(50),
      db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.workspaceId, WORKSPACE_ID),
            eq(notifications.status, "unread"),
          ),
        )
        .orderBy(desc(notifications.createdAt))
        .limit(50),
      db
        .select({
          id: paymentRequests.id,
          projectId: paymentRequests.projectId,
          clientId: paymentRequests.clientId,
          kind: paymentRequests.kind,
          title: paymentRequests.title,
          description: paymentRequests.description,
          amountCents: paymentRequests.amountCents,
          amountPaidCents: paymentRequests.amountPaidCents,
          amountRefundedCents: paymentRequests.amountRefundedCents,
          currency: paymentRequests.currency,
          status: paymentRequests.status,
          dueAt: paymentRequests.dueAt,
          approvedAt: paymentRequests.approvedAt,
          paidAt: paymentRequests.paidAt,
          refundedAt: paymentRequests.refundedAt,
          createdAt: paymentRequests.createdAt,
          updatedAt: paymentRequests.updatedAt,
        })
        .from(paymentRequests)
        .where(eq(paymentRequests.workspaceId, WORKSPACE_ID))
        .orderBy(desc(paymentRequests.createdAt)),
      db.select().from(tattooSessions).where(eq(tattooSessions.workspaceId, WORKSPACE_ID)).orderBy(desc(tattooSessions.createdAt)),
      db.select().from(healingCheckins).where(eq(healingCheckins.workspaceId, WORKSPACE_ID)).orderBy(desc(healingCheckins.scheduledFor)),
      db.select().from(contentCandidates).where(eq(contentCandidates.workspaceId, WORKSPACE_ID)).orderBy(desc(contentCandidates.createdAt)),
      db.select().from(consentGrants).where(and(eq(consentGrants.workspaceId, WORKSPACE_ID), eq(consentGrants.consentType, "tattoo_media_use"))).orderBy(desc(consentGrants.createdAt)),
      db.select().from(outcomes).where(eq(outcomes.workspaceId, WORKSPACE_ID)).orderBy(desc(outcomes.createdAt)),
      db.select().from(captureEvents).where(eq(captureEvents.workspaceId, WORKSPACE_ID)).orderBy(desc(captureEvents.occurredAt)).limit(100),
      db.select().from(memoryRecords).where(eq(memoryRecords.workspaceId, WORKSPACE_ID)).orderBy(desc(memoryRecords.updatedAt)).limit(200),
      db.select().from(agentDefinitions).where(eq(agentDefinitions.workspaceId, WORKSPACE_ID)).orderBy(agentDefinitions.displayName),
      db.select().from(agentTasks).where(eq(agentTasks.workspaceId, WORKSPACE_ID)).orderBy(desc(agentTasks.createdAt)).limit(100),
      db.select().from(agentHandoffs).where(eq(agentHandoffs.workspaceId, WORKSPACE_ID)).orderBy(desc(agentHandoffs.occurredAt)).limit(100),
      db.select().from(connectorDefinitions).where(eq(connectorDefinitions.workspaceId, WORKSPACE_ID)).orderBy(connectorDefinitions.displayName),
      db.select({ id: connectorAccounts.id, connectorKey: connectorAccounts.connectorKey, provider: connectorAccounts.provider, accountEmail: connectorAccounts.accountEmail, displayName: connectorAccounts.displayName, grantedScopesJson: connectorAccounts.grantedScopesJson, tokenExpiresAt: connectorAccounts.tokenExpiresAt, status: connectorAccounts.status, lastValidatedAt: connectorAccounts.lastValidatedAt, lastErrorSummary: connectorAccounts.lastErrorSummary, connectedAt: connectorAccounts.connectedAt, revokedAt: connectorAccounts.revokedAt }).from(connectorAccounts).where(eq(connectorAccounts.workspaceId, WORKSPACE_ID)),
      db.select().from(connectorExecutions).where(eq(connectorExecutions.workspaceId, WORKSPACE_ID)).orderBy(desc(connectorExecutions.createdAt)).limit(100),
      db.select().from(toolDefinitions).where(eq(toolDefinitions.workspaceId, WORKSPACE_ID)).orderBy(toolDefinitions.approvalClass, toolDefinitions.displayName),
      db.select().from(authorityDecisions).where(eq(authorityDecisions.workspaceId, WORKSPACE_ID)).orderBy(desc(authorityDecisions.evaluatedAt)).limit(100),
      db.select().from(chiefManagerRuns).where(eq(chiefManagerRuns.workspaceId, WORKSPACE_ID)).orderBy(desc(chiefManagerRuns.createdAt)).limit(30),
      db.select().from(chiefManagerSteps).where(eq(chiefManagerSteps.workspaceId, WORKSPACE_ID)).orderBy(desc(chiefManagerSteps.createdAt)).limit(150),
      db.select().from(specialistEvaluations).where(eq(specialistEvaluations.workspaceId, WORKSPACE_ID)).orderBy(desc(specialistEvaluations.createdAt)).limit(100),
    ]);

    const projectJourneys = projectRows.map((project) =>
      buildTattooJourney({
        project,
        candidates: candidateRows,
        assets: assetRows,
        approvals: approvalRows,
        payments: paymentRows,
        appointments: appointmentRows,
        sessions: sessionRows,
        healing: healingRows,
        content: contentCandidateRows,
        consent: mediaConsentRows,
        outcomes: outcomeRows,
        knowledge: knowledgeRows,
      }),
    );

    return Response.json({
      workspace,
      owner,
      clients: clientRows,
      projects: projectRows,
      projectCandidates: candidateRows,
      appointments: appointmentRows,
      approvals: approvalRows,
      messages: messageRows,
      assets: assetRows,
      knowledgeItems: knowledgeRows,
      aiRuns: runRows,
      auditEvents: existingAuditRows.slice(0, 50),
      notifications: notificationRows,
      paymentRequests: paymentRows,
      tattooSessions: sessionRows,
      healingCheckins: healingRows,
      contentCandidates: contentCandidateRows,
      mediaConsent: mediaConsentRows,
      outcomes: outcomeRows,
      projectJourneys,
      captureEvents: captureRows,
      memoryRecords: memoryRows,
      agentDefinitions: agentRows,
      agentTasks: agentTaskRows,
      agentHandoffs: agentHandoffRows,
      connectorDefinitions: connectorRows,
      connectorAccounts: connectorAccountRows,
      connectorExecutions: connectorExecutionRows,
      toolDefinitions: toolDefinitionRows,
      authorityDecisions: authorityDecisionRows,
      chiefManagerRuns: chiefManagerRunRows,
      chiefManagerSteps: chiefManagerStepRows,
      specialistEvaluations: specialistEvaluationRows,
      craftIntelligence,
      schedulingIntelligence,
      automationPlaybooks: playbookOperations.playbooks,
      automationPlaybookRuns: playbookOperations.runs,
      automationPlaybookSteps: playbookOperations.steps,
    });
  } catch (error) {
    return routeError(error, "Unable to load workspace");
  }
}

export async function PATCH(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as {
      name?: string;
      timezone?: string;
      aiContentCapture?: string;
    };
    const update: Record<string, string> = {
      updatedAt: new Date().toISOString(),
    };
    if (payload.name?.trim()) update.name = payload.name.trim();
    if (payload.timezone?.trim()) update.timezone = payload.timezone.trim();
    if (
      ["metadata_only", "redacted_summaries", "full_content"].includes(
        payload.aiContentCapture ?? "",
      )
    ) {
      update.aiContentCapture = payload.aiContentCapture!;
    }
    const db = getDb();
    await db
      .update(workspaces)
      .set(update)
      .where(eq(workspaces.id, WORKSPACE_ID));
    return Response.json({ status: "saved" });
  } catch (error) {
    return routeError(error, "Unable to save workspace");
  }
}
