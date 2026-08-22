import {
  and,
  asc,
  desc,
  eq,
  isNull,
  lte,
} from "drizzle-orm";
import { getDb } from "../db";
import {
  aiEvents,
  aiRuns,
  appointments,
  approvals,
  assets,
  auditEvents,
  automationJobs,
  knowledgeItems,
  notifications,
  projects,
  toolCalls,
  usageEvents,
  workspaces,
} from "../db/schema";
import {
  captureObservation,
  runLearningCycle,
} from "./intelligence-engine";
import {
  APPROVAL_POLICY_VERSION,
  INTELLIGENCE_POLICY_VERSION,
} from "./intelligence-policy";

type Db = ReturnType<typeof getDb>;

export type AutomationSignal = {
  workspaceId: string;
  eventType: string;
  sourceType: string;
  sourceId: string;
  projectId?: string | null;
  clientId?: string | null;
  category: string;
  signalKey: string;
  value: Record<string, unknown>;
  qualityBps?: number;
  priority?: number;
};

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function parsePayload(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function enqueueAutomationJob(
  input: {
    workspaceId: string;
    jobType: "workflow_event" | "learning_cycle";
    entityType: string;
    entityId?: string | null;
    payload: Record<string, unknown>;
    priority?: number;
    runAfter?: string;
  },
  db: Db = getDb(),
) {
  const now = new Date().toISOString();
  const requestedRunAfter = input.runAfter ?? now;
  const requestedPriority = input.priority ?? 50;
  const entityPredicate = input.entityId
    ? eq(automationJobs.entityId, input.entityId)
    : isNull(automationJobs.entityId);
  const existing = await db
    .select({
      id: automationJobs.id,
      runAfter: automationJobs.runAfter,
      priority: automationJobs.priority,
    })
    .from(automationJobs)
    .where(
      and(
        eq(automationJobs.workspaceId, input.workspaceId),
        eq(automationJobs.jobType, input.jobType),
        eq(automationJobs.entityType, input.entityType),
        entityPredicate,
        eq(automationJobs.status, "queued"),
      ),
    )
    .get();
  if (existing) {
    if (
      requestedRunAfter < existing.runAfter ||
      requestedPriority > existing.priority
    ) {
      await db
        .update(automationJobs)
        .set({
          runAfter:
            requestedRunAfter < existing.runAfter
              ? requestedRunAfter
              : existing.runAfter,
          priority: Math.max(requestedPriority, existing.priority),
          updatedAt: now,
        })
        .where(eq(automationJobs.id, existing.id));
    }
    return existing.id;
  }

  const id = makeId("job");
  await db.insert(automationJobs).values({
    id,
    workspaceId: input.workspaceId,
    jobType: input.jobType,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    payloadJson: JSON.stringify(input.payload),
    status: "queued",
    priority: requestedPriority,
    runAfter: requestedRunAfter,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function captureAutomationSignal(
  input: AutomationSignal,
  db: Db = getDb(),
) {
  const occurredAt = new Date().toISOString();
  const observationId = await captureObservation(
    {
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      clientId: input.clientId ?? null,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      category: input.category,
      signalKey: input.signalKey,
      value: input.value,
      qualityBps: input.qualityBps ?? 8500,
      occurredAt,
    },
    db,
  );
  const workflowJobId = await enqueueAutomationJob(
    {
      workspaceId: input.workspaceId,
      jobType: "workflow_event",
      entityType: input.sourceType,
      entityId: input.sourceId,
      payload: {
        eventType: input.eventType,
        sourceId: input.sourceId,
        projectId: input.projectId ?? null,
        clientId: input.clientId ?? null,
        observationId,
      },
      priority: input.priority ?? 60,
    },
    db,
  );
  const learningJobId = await enqueueAutomationJob(
    {
      workspaceId: input.workspaceId,
      jobType: "learning_cycle",
      entityType: input.projectId ? "project" : "workspace",
      entityId: input.projectId ?? null,
      payload: {
        triggerType: input.eventType,
        projectId: input.projectId ?? null,
      },
      priority: input.eventType === "project_completed" ? 95 : 45,
      runAfter:
        input.eventType === "project_completed"
          ? occurredAt
          : new Date(Date.now() + 5 * 60_000).toISOString(),
    },
    db,
  );
  const automationResult = await runAutomationSweep(
    input.workspaceId,
    `event:${input.eventType}`,
    db,
  );
  return {
    observationId,
    workflowJobId,
    learningJobId,
    automationResult,
  };
}

async function notification(
  input: {
    workspaceId: string;
    projectId?: string | null;
    severity: string;
    category: string;
    title: string;
    body: string;
    dedupeKey: string;
    actionUrl?: string | null;
  },
  db: Db,
) {
  await db
    .insert(notifications)
    .values({
      id: makeId("note"),
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      severity: input.severity,
      category: input.category,
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl ?? null,
      dedupeKey: input.dedupeKey,
      status: "unread",
      createdAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [notifications.workspaceId, notifications.dedupeKey],
      set: {
        projectId: input.projectId ?? null,
        severity: input.severity,
        category: input.category,
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl ?? null,
        status: "unread",
        readAt: null,
        dismissedAt: null,
        createdAt: new Date().toISOString(),
      },
    });
}

async function materializeWorkflowEvent(
  workspaceId: string,
  payload: Record<string, unknown>,
  db: Db,
) {
  const eventType = String(payload.eventType || "workflow_event");
  const sourceId = payload.sourceId ? String(payload.sourceId) : null;
  const projectId = payload.projectId ? String(payload.projectId) : null;
  const clientId = payload.clientId ? String(payload.clientId) : null;
  const project = projectId
    ? await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.workspaceId, workspaceId),
            eq(projects.id, projectId),
          ),
        )
        .get()
    : null;
  const projectName = project?.title || "Client workflow";
  if (project && (project.isTest || project.archivedAt)) return;
  const templates: Record<
    string,
    { title: string; body: string; severity?: string }
  > = {
    client_created: {
      title: "New inquiry ready for qualification",
      body:
        "Review contact details, consent, fit, placement, budget, timeline, and consultation availability before replying.",
    },
    project_created: {
      title: `Complete intake for ${projectName}`,
      body:
        "Confirm the creative brief, placement, reference sources, budget range, target date, and the next scheduled action.",
    },
    project_consult: {
      title: `Consultation checklist · ${projectName}`,
      body:
        "Capture goals, constraints, measurements, reference direction, communication preferences, and explicit approvals.",
    },
    project_design: {
      title: `Design workflow ready · ${projectName}`,
      body:
        "Organize references, create a versioned design brief, record design decisions, and prepare client review.",
    },
    project_approval: {
      title: `Approval gate ready · ${projectName}`,
      body:
        "Verify the exact version, evidence, risk, and requested decision before anything progresses to scheduling.",
      severity: "attention",
    },
    project_session: {
      title: `Session preparation · ${projectName}`,
      body:
        "Confirm appointment, consent, stencil/version, supplies, equipment, setup notes, breaks, and documentation plan.",
      severity: "attention",
    },
    project_healing: {
      title: `Healing workflow · ${projectName}`,
      body:
        "Prepare aftercare guidance, schedule check-ins, request consented healing photos, and capture any outcome signals.",
    },
    project_completed: {
      title: `Knowledge and content capture · ${projectName}`,
      body:
        "Record the healed outcome, client feedback, session lessons, financial result, content opportunities, and reusable knowledge.",
    },
    appointment_scheduled: {
      title: `Prepare for ${projectName}`,
      body:
        "Review the appointment purpose, required assets, unresolved approvals, location, and client communication before the scheduled time.",
    },
    client_message_received: {
      title: `Client reply needs review · ${projectName}`,
      body:
        "Review the shared conversation and decide the next action. Legacy OS will never reply to the client without approval.",
      severity: "attention",
    },
    approval_decided: {
      title: `Approval decision recorded · ${projectName}`,
      body:
        "Review the decision and move the project forward only when the approved version and next action are clear.",
    },
    asset_uploaded: {
      title: `New project asset captured · ${projectName}`,
      body:
        "The file has been integrity-checked and its structured metadata is available to the knowledge system.",
    },
  };
  const template = templates[eventType] ?? {
    title: `Workflow update · ${projectName}`,
    body: "A new workspace event was captured and connected to the project history.",
  };
  await notification(
    {
      workspaceId,
      projectId,
      severity: template.severity || "info",
      category: "automation",
      title: template.title,
      body: template.body,
      dedupeKey:
        eventType === "client_message_received"
          ? `communication:client:${projectId || clientId || "workspace"}`
          : eventType === "approval_decided"
            ? `approval:decision:${sourceId || projectId || "workspace"}`
            : `automation:${eventType}:${projectId || clientId || "workspace"}`,
      actionUrl:
        eventType === "client_message_received"
          ? `inbox:${clientId || ""}`
          : eventType === "approval_decided" || eventType === "approval_requested"
            ? `design:${projectId || ""}`
            : projectId
              ? `projects:${projectId}`
              : clientId
                ? `clients:${clientId}`
                : null,
    },
    db,
  );

  if (eventType === "asset_uploaded") {
    const assetId = String(payload.assetId || payload.sourceId || "");
    if (!assetId) return;
    const asset = await db
      .select()
      .from(assets)
      .where(
        and(eq(assets.workspaceId, workspaceId), eq(assets.id, assetId)),
      )
      .get();
    if (!asset) return;
    const content = `${asset.originalName}; ${asset.mediaType}; ${asset.mimeType}; ${asset.byteSize} bytes; source ${asset.sourceType}; integrity ${asset.sha256}.`;
    await db
      .insert(knowledgeItems)
      .values({
        id: makeId("know"),
        workspaceId,
        projectId: asset.projectId,
        sourceAssetId: asset.id,
        itemType: "structured_asset",
        title: asset.originalName,
        content,
        contentHash: await sha256(`${workspaceId}:${asset.id}:${content}`),
        summary: `Structured metadata for ${asset.originalName}`,
        tagsJson: JSON.stringify([
          asset.mediaType,
          asset.mimeType,
          asset.sourceType,
        ]),
        confidenceBps: 10000,
        verificationStatus: "system_verified",
        visibility: "workspace",
        createdBy: "automation-agent",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoNothing();
    await db
      .update(assets)
      .set({ extractionStatus: "structured" })
      .where(eq(assets.id, asset.id));
  }
}

async function createOperationalNotifications(workspaceId: string, db: Db) {
  const now = new Date();
  const nowIso = now.toISOString();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60_000).toISOString();
  const [pendingApprovals, upcomingAppointments, activeProjects] =
    await Promise.all([
      db
        .select()
        .from(approvals)
        .where(
          and(
            eq(approvals.workspaceId, workspaceId),
            eq(approvals.status, "pending"),
          ),
        ),
      db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.workspaceId, workspaceId),
            eq(appointments.status, "scheduled"),
            lte(appointments.startsAt, in24Hours),
          ),
        ),
      db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.workspaceId, workspaceId),
            eq(projects.status, "active"),
            eq(projects.isTest, false),
            isNull(projects.archivedAt),
          ),
        ),
    ]);
  for (const approval of pendingApprovals) {
    const ageHours =
      (now.getTime() - new Date(approval.createdAt).getTime()) / 3_600_000;
    if (ageHours < 24) continue;
    await notification(
      {
        workspaceId,
        projectId: approval.projectId,
        severity: "attention",
        category: "approval",
        title: "Approval waiting more than 24 hours",
        body: approval.subject,
        dedupeKey: `approval-overdue:${approval.id}`,
        actionUrl: `design:${approval.projectId || ""}`,
      },
      db,
    );
  }
  for (const appointment of upcomingAppointments) {
    if (appointment.startsAt < nowIso) continue;
    await notification(
      {
        workspaceId,
        projectId: appointment.projectId,
        severity: "attention",
        category: "appointment",
        title: "Appointment within 24 hours",
        body: `${appointment.appointmentType} · ${appointment.startsAt}`,
        dedupeKey: `appointment-24h:${appointment.id}`,
        actionUrl: `calendar:${appointment.id}`,
      },
      db,
    );
  }
  for (const project of activeProjects) {
    if (project.nextAction && (!project.nextActionAt || project.nextActionAt > nowIso)) {
      continue;
    }
    await notification(
      {
        workspaceId,
        projectId: project.id,
        severity: "attention",
        category: "workflow",
        title: "Project needs a current next action",
        body: project.title,
        dedupeKey: `project-next-action:${project.id}:${project.updatedAt}`,
        actionUrl: `projects:${project.id}`,
      },
      db,
    );
  }
}

async function processJob(
  job: typeof automationJobs.$inferSelect,
  db: Db,
) {
  const payload = parsePayload(job.payloadJson);
  if (job.jobType === "learning_cycle") {
    await runLearningCycle(
      job.workspaceId,
      String(payload.triggerType || "automation"),
      payload.projectId ? String(payload.projectId) : null,
    );
    return "Learning cycle completed";
  }
  if (job.jobType === "workflow_event") {
    await materializeWorkflowEvent(job.workspaceId, payload, db);
    return "Workflow event organized and connected";
  }
  throw new Error(`Unsupported automation job: ${job.jobType}`);
}

export async function runAutomationSweep(
  workspaceId: string,
  triggerType = "owner_requested",
  db: Db = getDb(),
  limit = 12,
) {
  const workspace = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .get();
  if (!workspace || workspace.automationStatus !== "active") {
    return {
      status: "paused",
      processed: 0,
      succeeded: 0,
      failed: 0,
    };
  }

  const started = new Date();
  const runId = makeId("run");
  const correlationId = crypto.randomUUID();
  const dueJobs = await db
    .select()
    .from(automationJobs)
    .where(
      and(
        eq(automationJobs.workspaceId, workspaceId),
        eq(automationJobs.status, "queued"),
        lte(automationJobs.runAfter, started.toISOString()),
      ),
    )
    .orderBy(desc(automationJobs.priority), asc(automationJobs.createdAt))
    .limit(Math.max(1, Math.min(limit, 25)));

  await db.insert(aiRuns).values({
    id: runId,
    workspaceId,
    correlationId,
    agentName: "Automation Agent",
    purpose: "Continuous workflow processing",
    provider: "Legacy OS",
    model: "workflow-policy-engine-v1",
    promptVersion: "automation-sweep-v1",
    contextPolicyVersion: INTELLIGENCE_POLICY_VERSION,
    approvalPolicyVersion: APPROVAL_POLICY_VERSION,
    riskLevel: "low",
    contentCapture: "metadata_only",
    evidenceJson: JSON.stringify({
      triggerType,
      jobs: dueJobs.map((job) => job.id),
    }),
    confidenceBps: 10000,
    status: "running",
    startedAt: started.toISOString(),
    createdAt: started.toISOString(),
  });

  let succeeded = 0;
  let failed = 0;
  for (const job of dueJobs) {
    const attempt = job.attempts + 1;
    const lockedAt = new Date().toISOString();
    await db
      .update(automationJobs)
      .set({
        status: "running",
        attempts: attempt,
        lockedAt,
        updatedAt: lockedAt,
      })
      .where(
        and(eq(automationJobs.id, job.id), eq(automationJobs.status, "queued")),
      );
    const callStarted = new Date();
    const toolCallId = makeId("tool");
    try {
      const resultSummary = await processJob(job, db);
      const completedAt = new Date().toISOString();
      await db.batch([
        db
          .update(automationJobs)
          .set({
            status: "succeeded",
            completedAt,
            lockedAt: null,
            lastError: null,
            updatedAt: completedAt,
          })
          .where(eq(automationJobs.id, job.id)),
        db.insert(toolCalls).values({
          id: toolCallId,
          workspaceId,
          runId,
          toolName: "Legacy OS workflow engine",
          operation: job.jobType,
          destination: "internal_workspace",
          parametersHash: await sha256(job.payloadJson),
          parametersRedactedJson: JSON.stringify({
            entityType: job.entityType,
            entityId: job.entityId,
          }),
          resultSummary,
          externalSideEffect: false,
          status: "succeeded",
          latencyMs: Date.now() - callStarted.getTime(),
          startedAt: callStarted.toISOString(),
          completedAt,
        }),
      ]);
      succeeded += 1;
    } catch (error) {
      const failedAt = new Date();
      const terminal = attempt >= job.maxAttempts;
      const message =
        error instanceof Error ? error.message : "Automation job failed";
      await db.batch([
        db
          .update(automationJobs)
          .set({
            status: terminal ? "failed" : "queued",
            runAfter: terminal
              ? job.runAfter
              : new Date(
                  failedAt.getTime() + Math.min(60, 2 ** attempt) * 60_000,
                ).toISOString(),
            lockedAt: null,
            lastError: message.slice(0, 500),
            updatedAt: failedAt.toISOString(),
          })
          .where(eq(automationJobs.id, job.id)),
        db.insert(toolCalls).values({
          id: toolCallId,
          workspaceId,
          runId,
          toolName: "Legacy OS workflow engine",
          operation: job.jobType,
          destination: "internal_workspace",
          parametersHash: await sha256(job.payloadJson),
          parametersRedactedJson: "{}",
          resultSummary: message.slice(0, 500),
          externalSideEffect: false,
          status: "failed",
          latencyMs: Date.now() - callStarted.getTime(),
          startedAt: callStarted.toISOString(),
          completedAt: failedAt.toISOString(),
        }),
      ]);
      failed += 1;
    }
  }

  await createOperationalNotifications(workspaceId, db);
  const completed = new Date();
  const summary = `${dueJobs.length} queued job${dueJobs.length === 1 ? "" : "s"} evaluated; ${succeeded} succeeded and ${failed} failed.`;
  await db.batch([
    db
      .update(aiRuns)
      .set({
        reasoningSummary: summary,
        recommendation:
          failed > 0
            ? "Review failed automation jobs before expanding autonomy."
            : "Internal workflow processing completed within the configured approval boundary.",
        confidenceBps: failed > 0 ? 7000 : 10000,
        status: failed > 0 ? "partial" : "succeeded",
        completedAt: completed.toISOString(),
        latencyMs: completed.getTime() - started.getTime(),
      })
      .where(eq(aiRuns.id, runId)),
    db.insert(aiEvents).values({
      id: makeId("evt"),
      workspaceId,
      runId,
      sequence: 1,
      eventType: "automation.sweep_completed",
      status: failed > 0 ? "partial" : "succeeded",
      summary,
      metadataJson: JSON.stringify({ triggerType }),
      occurredAt: completed.toISOString(),
    }),
    db.insert(usageEvents).values({
      id: makeId("usage"),
      workspaceId,
      runId,
      provider: "Legacy OS",
      model: "workflow-policy-engine-v1",
      occurredAt: completed.toISOString(),
    }),
    db.insert(auditEvents).values({
      id: makeId("audit"),
      workspaceId,
      actorType: "agent",
      actorId: "automation-agent",
      action: "automation.sweep_completed",
      targetType: "workspace",
      targetId: workspaceId,
      riskLevel: "low",
      outcome: failed > 0 ? "partial" : "succeeded",
      correlationId,
      metadataJson: JSON.stringify({
        triggerType,
        processed: dueJobs.length,
        succeeded,
        failed,
        externalSideEffects: 0,
      }),
      occurredAt: completed.toISOString(),
    }),
    db
      .update(workspaces)
      .set({
        lastAutomationAt: completed.toISOString(),
        updatedAt: completed.toISOString(),
      })
      .where(eq(workspaces.id, workspaceId)),
  ]);

  return {
    status: failed > 0 ? "partial" : "succeeded",
    processed: dueJobs.length,
    succeeded,
    failed,
    runId,
    completedAt: completed.toISOString(),
  };
}

export async function runAutomationSweepIfDue(
  workspaceId: string,
  triggerType = "workspace_opened",
  db: Db = getDb(),
) {
  const now = new Date();
  const [workspace, dueJob] = await Promise.all([
    db
      .select({
        automationStatus: workspaces.automationStatus,
        lastAutomationAt: workspaces.lastAutomationAt,
      })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .get(),
    db
      .select({ id: automationJobs.id })
      .from(automationJobs)
      .where(
        and(
          eq(automationJobs.workspaceId, workspaceId),
          eq(automationJobs.status, "queued"),
          lte(automationJobs.runAfter, now.toISOString()),
        ),
      )
      .get(),
  ]);
  if (!workspace || workspace.automationStatus !== "active") {
    return { status: "paused", processed: 0, succeeded: 0, failed: 0 };
  }
  const lastRun = workspace.lastAutomationAt
    ? new Date(workspace.lastAutomationAt).getTime()
    : 0;
  if (!dueJob && now.getTime() - lastRun < 15 * 60_000) {
    return { status: "idle", processed: 0, succeeded: 0, failed: 0 };
  }
  return runAutomationSweep(workspaceId, triggerType, db);
}

export async function automationSnapshot(workspaceId: string) {
  const db = getDb();
  const [workspace, jobs, notificationRows] = await Promise.all([
    db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .get(),
    db
      .select()
      .from(automationJobs)
      .where(eq(automationJobs.workspaceId, workspaceId))
      .orderBy(desc(automationJobs.createdAt))
      .limit(50),
    db
      .select()
      .from(notifications)
      .where(eq(notifications.workspaceId, workspaceId))
      .orderBy(desc(notifications.createdAt))
      .limit(50),
  ]);
  return {
    status: workspace?.automationStatus || "paused",
    mode: workspace?.automationMode || "safe_auto",
    lastAutomationAt: workspace?.lastAutomationAt || null,
    jobs,
    notifications: notificationRows,
  };
}
