import { and, asc, desc, eq, lte } from "drizzle-orm";
import { getDb } from "../db";
import {
  auditEvents,
  automationDeadLetters,
  automationSchedules,
  automationWorkerRuns,
} from "../db/schema";
import {
  recoverExpiredAutomationLeases,
  runAutomationSweep,
} from "./automation-engine";
import { processDuePlaybookSteps, runPlaybook } from "./playbook-engine";
import { backfillAuditCaptureEvents } from "./capture-engine";
import { consolidateCaptureMemory } from "./memory-engine";

type Db = ReturnType<typeof getDb>;
const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const SCHEDULES = [
  { key: "automation_maintenance", name: "Workflow and playbook maintenance", handler: "maintenance", intervalMinutes: 15 },
  { key: "daily_studio_brief", name: "Daily studio briefing", handler: "daily_studio_brief", intervalMinutes: 1440 },
] as const;

function nextDailyBrief(now = new Date()) {
  const next = new Date(now);
  next.setUTCHours(15, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

export async function ensureAutomationSchedules(workspaceId: string, db: Db = getDb()) {
  const now = new Date();
  for (const schedule of SCHEDULES) {
    await db.insert(automationSchedules).values({
      id: `schedule_${workspaceId}_${schedule.key}`,
      workspaceId,
      scheduleKey: schedule.key,
      displayName: schedule.name,
      handlerKey: schedule.handler,
      intervalMinutes: schedule.intervalMinutes,
      enabled: true,
      nextRunAt: schedule.key === "daily_studio_brief" ? nextDailyBrief(now) : new Date(now.getTime() + schedule.intervalMinutes * 60_000).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }).onConflictDoUpdate({
      target: [automationSchedules.workspaceId, automationSchedules.scheduleKey],
      set: { displayName: schedule.name, handlerKey: schedule.handler, intervalMinutes: schedule.intervalMinutes, updatedAt: now.toISOString() },
    });
  }
}

export async function runAlwaysOnWorker(workspaceId: string, triggerType = "scheduled_worker", db: Db = getDb()) {
  await ensureAutomationSchedules(workspaceId, db);
  const started = new Date();
  const workerId = crypto.randomUUID();
  const workerRunId = makeId("worker_run");
  await db.insert(automationWorkerRuns).values({ id: workerRunId, workspaceId, workerId, triggerType, status: "running", startedAt: started.toISOString(), createdAt: started.toISOString() });
  let schedulesProcessed = 0;
  let playbookStepsProcessed = 0;
  let jobsProcessed = 0;
  let jobsSucceeded = 0;
  let jobsFailed = 0;
  let maintenanceRan = false;
  const leasesRecovered = await recoverExpiredAutomationLeases(workspaceId, db);
  let errorSummary: string | null = null;

  try {
    const due = await db.select().from(automationSchedules).where(and(eq(automationSchedules.workspaceId, workspaceId), eq(automationSchedules.enabled, true), lte(automationSchedules.nextRunAt, started.toISOString()))).orderBy(asc(automationSchedules.nextRunAt)).limit(10);
    for (const schedule of due) {
      const nextRunAt = schedule.scheduleKey === "daily_studio_brief" ? nextDailyBrief(started) : new Date(started.getTime() + schedule.intervalMinutes * 60_000).toISOString();
      const claimed = await db.update(automationSchedules).set({ nextRunAt, lastRunAt: started.toISOString(), lastOutcome: "running", lastError: null, updatedAt: started.toISOString() }).where(and(eq(automationSchedules.id, schedule.id), lte(automationSchedules.nextRunAt, started.toISOString()))).returning({ id: automationSchedules.id });
      if (!claimed.length) continue;
      schedulesProcessed += 1;
      try {
        if (schedule.handlerKey === "daily_studio_brief") {
          await runPlaybook({ workspaceId, playbookKey: "daily_studio_brief", sourceEventType: "scheduled_daily_brief", idempotencyKey: `schedule:${schedule.id}:${schedule.nextRunAt}` }, db);
        } else {
          maintenanceRan = true;
          const recentAuditRows = await db.select().from(auditEvents)
            .where(eq(auditEvents.workspaceId, workspaceId))
            .orderBy(desc(auditEvents.occurredAt))
            .limit(25);
          await backfillAuditCaptureEvents(workspaceId, recentAuditRows, db);
          await consolidateCaptureMemory(workspaceId, db);
          const sweep = await runAutomationSweep(workspaceId, `schedule:${schedule.scheduleKey}`, db, 25);
          jobsProcessed += sweep.processed;
          jobsSucceeded += sweep.succeeded;
          jobsFailed += sweep.failed;
          const playbooks = await processDuePlaybookSteps(workspaceId, db);
          playbookStepsProcessed += playbooks.processed;
        }
        await db.update(automationSchedules).set({ lastOutcome: "succeeded", updatedAt: new Date().toISOString() }).where(eq(automationSchedules.id, schedule.id));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Schedule failed";
        await db.update(automationSchedules).set({ lastOutcome: "failed", lastError: message.slice(0, 500), updatedAt: new Date().toISOString() }).where(eq(automationSchedules.id, schedule.id));
        jobsFailed += 1;
      }
    }
    if (triggerType === "owner_requested" && !maintenanceRan) {
      const sweep = await runAutomationSweep(workspaceId, triggerType, db, 25);
      jobsProcessed += sweep.processed;
      jobsSucceeded += sweep.succeeded;
      jobsFailed += sweep.failed;
      const playbooks = await processDuePlaybookSteps(workspaceId, db);
      playbookStepsProcessed += playbooks.processed;
    }
  } catch (error) {
    errorSummary = error instanceof Error ? error.message : "Worker failed";
  }

  const completedAt = new Date().toISOString();
  const status = errorSummary ? "failed" : jobsFailed ? "partial" : "succeeded";
  await db.update(automationWorkerRuns).set({ status, schedulesProcessed, jobsProcessed, jobsSucceeded, jobsFailed, leasesRecovered, playbookStepsProcessed, errorSummary, completedAt }).where(eq(automationWorkerRuns.id, workerRunId));
  return { id: workerRunId, status, schedulesProcessed, jobsProcessed, jobsSucceeded, jobsFailed, leasesRecovered, playbookStepsProcessed, completedAt };
}

export async function alwaysOnRuntimeSnapshot(workspaceId: string, db: Db = getDb()) {
  await ensureAutomationSchedules(workspaceId, db);
  const [schedules, workerRuns, deadLetters] = await Promise.all([
    db.select().from(automationSchedules).where(eq(automationSchedules.workspaceId, workspaceId)).orderBy(asc(automationSchedules.nextRunAt)),
    db.select().from(automationWorkerRuns).where(eq(automationWorkerRuns.workspaceId, workspaceId)).orderBy(desc(automationWorkerRuns.startedAt)).limit(25),
    db.select().from(automationDeadLetters).where(eq(automationDeadLetters.workspaceId, workspaceId)).orderBy(desc(automationDeadLetters.createdAt)).limit(50),
  ]);
  return { schedules, workerRuns, deadLetters };
}
