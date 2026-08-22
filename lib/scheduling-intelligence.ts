import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { getDb } from "../db";
import {
  appointments, approvals, availabilityWindows, paymentRequests, projectScheduleRequirements,
  projects, scheduleEvaluationRuns, scheduleOpportunities, schedulingProfiles,
} from "../db/schema";

type Db = ReturnType<typeof getDb>;
export const SCHEDULING_INTELLIGENCE_POLICY_VERSION = "scheduling-capacity-intelligence-v1";
const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const minute = 60_000;
const settledPayments = new Set(["paid", "partially_refunded"]);
const activeAppointments = new Set(["scheduled", "confirmed", "completed"]);
const energyRank: Record<string, number> = { low: 1, medium: 2, high: 3 };

type Interval = { start: number; end: number; evidenceRef: string };
function openSegments(start: number, end: number, conflicts: Interval[]) {
  const segments: Array<{ start: number; end: number }> = [];
  let cursor = start;
  for (const conflict of conflicts.filter((item) => item.end > start && item.start < end).sort((a, b) => a.start - b.start)) {
    const conflictStart = Math.max(start, conflict.start);
    const conflictEnd = Math.min(end, conflict.end);
    if (conflictStart > cursor) segments.push({ start: cursor, end: conflictStart });
    cursor = Math.max(cursor, conflictEnd);
    if (cursor >= end) break;
  }
  if (cursor < end) segments.push({ start: cursor, end });
  return segments;
}
const dateKey = (value: number) => new Date(value).toISOString().slice(0, 10);

export async function ensureSchedulingProfile(workspaceId: string, db: Db = getDb()) {
  const now = new Date().toISOString();
  await db.insert(schedulingProfiles).values({
    id: makeId("schedule_profile"), workspaceId, policyVersion: SCHEDULING_INTELLIGENCE_POLICY_VERSION,
    createdAt: now, updatedAt: now,
  }).onConflictDoNothing();
  return db.select().from(schedulingProfiles).where(eq(schedulingProfiles.workspaceId, workspaceId)).get();
}

export async function runSchedulingIntelligence(workspaceId: string, initiatedBy?: string | null, db: Db = getDb()) {
  const profile = await ensureSchedulingProfile(workspaceId, db);
  if (!profile) throw new Error("Scheduling profile is unavailable");
  const nowMs = Date.now();
  const horizon = nowMs + 45 * 86_400_000;
  const [projectRows, requirementRows, approvalRows, paymentRows, appointmentRows, windowRows] = await Promise.all([
    db.select().from(projects).where(and(eq(projects.workspaceId, workspaceId), eq(projects.isTest, false), isNull(projects.archivedAt))),
    db.select().from(projectScheduleRequirements).where(and(eq(projectScheduleRequirements.workspaceId, workspaceId), eq(projectScheduleRequirements.status, "active"))),
    db.select().from(approvals).where(eq(approvals.workspaceId, workspaceId)),
    db.select().from(paymentRequests).where(eq(paymentRequests.workspaceId, workspaceId)),
    db.select().from(appointments).where(eq(appointments.workspaceId, workspaceId)),
    db.select().from(availabilityWindows).where(and(eq(availabilityWindows.workspaceId, workspaceId), gt(availabilityWindows.endsAt, new Date(nowMs).toISOString()))),
  ]);
  const requirements = new Map(requirementRows.map((row) => [row.projectId, row]));
  const readiness = projectRows.filter((project) => project.status === "active" && project.clientId).map((project) => {
    const requirement = requirements.get(project.id);
    const approved = approvalRows.some((row) => row.projectId === project.id && row.status === "approved" && Boolean(row.assetId && row.assetSha256));
    const deposit = paymentRows.some((row) => row.projectId === project.id && row.kind === "deposit" && settledPayments.has(row.status) && row.amountPaidCents - row.amountRefundedCents > 0);
    const blockers: string[] = [];
    if (!requirement) blockers.push("Session duration and capacity requirements are missing");
    if (project.lifecyclePhase !== "session") blockers.push(`Project is in ${project.lifecyclePhase}, not session readiness`);
    if (!approved) blockers.push("No exact approved design version is recorded");
    if (!deposit) blockers.push("Deposit is not recorded as paid");
    return { project, requirement, approved, deposit, blockers, readinessBps: Math.round(((4 - blockers.length) / 4) * 10000) };
  });
  const ready = readiness.filter((item) => item.blockers.length === 0 && item.requirement);
  const currentDate = new Date(nowMs);
  const weekStart = Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate() - ((currentDate.getUTCDay() + 6) % 7));
  const weeklyCollectedCents = paymentRows.filter((row) => settledPayments.has(row.status) && row.paidAt && new Date(row.paidAt).getTime() >= weekStart).reduce((sum, row) => sum + Math.max(0, row.amountPaidCents - row.amountRefundedCents), 0);
  const weeklyRevenueGapCents = Math.max(0, profile.weeklyRevenueTargetCents - weeklyCollectedCents);
  const conflicts: Interval[] = [
    ...appointmentRows.filter((row) => activeAppointments.has(row.status)).map((row) => ({
      start: new Date(row.startsAt).getTime() - profile.defaultBufferBeforeMinutes * minute,
      end: new Date(row.endsAt || row.startsAt).getTime() + profile.defaultBufferAfterMinutes * minute,
      evidenceRef: `appointment:${row.id}`,
    })),
    ...windowRows.filter((row) => row.status === "protected").map((row) => ({ start: new Date(row.startsAt).getTime(), end: new Date(row.endsAt).getTime(), evidenceRef: `availability_window:${row.id}` })),
  ].filter((item) => Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start);
  const openWindows = windowRows.filter((row) => row.status === "open" && row.windowType === "tattoo" && new Date(row.startsAt).getTime() < horizon && new Date(row.endsAt).getTime() > nowMs);
  const highEnergyByDay = new Map<string, number>();
  const tattooMinutesByDay = new Map<string, number>();
  appointmentRows.filter((row) => activeAppointments.has(row.status) && /tattoo|session/i.test(row.appointmentType)).forEach((row) => {
    const start = new Date(row.startsAt).getTime();
    const end = new Date(row.endsAt || row.startsAt).getTime();
    const day = dateKey(start);
    highEnergyByDay.set(day, (highEnergyByDay.get(day) || 0) + 1);
    tattooMinutesByDay.set(day, (tattooMinutesByDay.get(day) || 0) + Math.max(0, Math.round((end - start) / minute)));
  });
  const opportunityInputs: Array<{
    window: typeof windowRows[number]; candidate: typeof ready[number]; suggestedStart: number; suggestedEnd: number;
    reservedFrom: number; reservedUntil: number; fitBps: number; projectedRevenueCents: number; evidence: string[];
  }> = [];
  let conflictsDetected = 0;
  for (const window of openWindows.sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const windowStart = Math.max(nowMs, new Date(window.startsAt).getTime());
    const windowEnd = new Date(window.endsAt).getTime();
    const overlapping = conflicts.filter((item) => item.end > windowStart && item.start < windowEnd);
    conflictsDetected += overlapping.length;
    const segments = openSegments(windowStart, windowEnd, conflicts);
    const alternatives: typeof opportunityInputs = [];
    for (const candidate of ready) {
      const requirement = candidate.requirement!;
      if (energyRank[requirement.energyDemand] > energyRank[window.energyCapacity]) continue;
      const prep = requirement.prepMinutes ?? profile.defaultPrepMinutes;
      const travel = requirement.travelMinutes ?? profile.defaultTravelMinutes;
      const before = requirement.bufferBeforeMinutes ?? profile.defaultBufferBeforeMinutes;
      const after = requirement.bufferAfterMinutes ?? profile.defaultBufferAfterMinutes;
      const requiredMinutes = prep + travel + before + requirement.estimatedSessionMinutes + after;
      if (requirement.estimatedSessionMinutes < profile.minimumBookableMinutes) continue;
      for (const segment of segments) {
        if ((segment.end - segment.start) / minute < requiredMinutes) continue;
        const suggestedStart = segment.start + (prep + travel + before) * minute;
        const suggestedEnd = suggestedStart + requirement.estimatedSessionMinutes * minute;
        if (requirement.earliestStart && suggestedStart < new Date(requirement.earliestStart).getTime()) continue;
        if (requirement.latestEnd && suggestedEnd > new Date(requirement.latestEnd).getTime()) continue;
        const day = dateKey(suggestedStart);
        if (requirement.energyDemand === "high" && (highEnergyByDay.get(day) || 0) >= profile.maximumHighEnergySessionsPerDay) continue;
        if ((tattooMinutesByDay.get(day) || 0) + requirement.estimatedSessionMinutes > profile.maximumTattooMinutesPerDay) continue;
        const fitBps = Math.round((requiredMinutes / ((segment.end - segment.start) / minute)) * 10000);
        const projectedRevenueCents = Math.max(requirement.minimumRevenueCents, candidate.project.budgetMinCents || 0);
        alternatives.push({ window, candidate, suggestedStart, suggestedEnd, reservedFrom: segment.start, reservedUntil: suggestedEnd + after * minute, fitBps, projectedRevenueCents, evidence: [`project:${candidate.project.id}`, `client:${candidate.project.clientId}`, `availability_window:${window.id}`, ...overlapping.map((item) => item.evidenceRef)] });
        break;
      }
    }
    const best = alternatives.sort((a, b) => {
      const aTarget = a.candidate.project.targetDate ? new Date(a.candidate.project.targetDate).getTime() : Number.POSITIVE_INFINITY;
      const bTarget = b.candidate.project.targetDate ? new Date(b.candidate.project.targetDate).getTime() : Number.POSITIVE_INFINITY;
      return aTarget - bTarget || b.projectedRevenueCents - a.projectedRevenueCents || b.fitBps - a.fitBps;
    })[0];
    if (best) {
      opportunityInputs.push(best);
      const day = dateKey(best.suggestedStart);
      if (best.candidate.requirement!.energyDemand === "high") highEnergyByDay.set(day, (highEnergyByDay.get(day) || 0) + 1);
      tattooMinutesByDay.set(day, (tattooMinutesByDay.get(day) || 0) + best.candidate.requirement!.estimatedSessionMinutes);
      conflicts.push({ start: best.reservedFrom, end: best.reservedUntil, evidenceRef: `proposed_project:${best.candidate.project.id}` });
    }
  }
  const now = new Date().toISOString();
  const runId = makeId("schedule_run");
  const projectedRevenueCents = opportunityInputs.reduce((sum, item) => sum + item.projectedRevenueCents, 0);
  const summary = opportunityInputs.length
    ? `${opportunityInputs.length} approval-gated scheduling opportunit${opportunityInputs.length === 1 ? "y was" : "ies were"} found across ${openWindows.length} explicit capacity window${openWindows.length === 1 ? "" : "s"}.${profile.weeklyRevenueTargetCents ? ` The recorded weekly revenue target has a ${weeklyRevenueGapCents}-cent remaining gap; projected value is used only to rank otherwise ready fits.` : ""}`
    : openWindows.length ? "No open capacity window currently fits a fully ready project after preparation, travel, buffers, energy, and conflict checks." : "Add explicit availability windows before Legacy can recommend appointment times.";
  await db.update(scheduleOpportunities).set({ status: "expired", updatedAt: now }).where(and(eq(scheduleOpportunities.workspaceId, workspaceId), eq(scheduleOpportunities.status, "proposed")));
  await db.insert(scheduleEvaluationRuns).values({
    id: runId, workspaceId, status: "completed", windowsEvaluated: openWindows.length, projectsEvaluated: readiness.length,
    readyProjects: ready.length, opportunitiesCreated: opportunityInputs.length, conflictsDetected, projectedRevenueCents,
    summary, policyVersion: SCHEDULING_INTELLIGENCE_POLICY_VERSION,
    evidenceJson: JSON.stringify({ projectReadiness: readiness.map((item) => ({ projectId: item.project.id, readinessBps: item.readinessBps, blockers: item.blockers })), financialGoal: { weeklyRevenueTargetCents: profile.weeklyRevenueTargetCents, weeklyCollectedCents, weeklyRevenueGapCents } }),
    initiatedBy: initiatedBy || null, createdAt: now, completedAt: now,
  });
  for (const item of opportunityInputs) {
    const requirement = item.candidate.requirement!;
    await db.insert(scheduleOpportunities).values({
      id: makeId("schedule_opportunity"), workspaceId, runId, windowId: item.window.id,
      projectId: item.candidate.project.id, clientId: item.candidate.project.clientId!,
      suggestedStartsAt: new Date(item.suggestedStart).toISOString(), suggestedEndsAt: new Date(item.suggestedEnd).toISOString(),
      reservedFrom: new Date(item.reservedFrom).toISOString(), reservedUntil: new Date(item.reservedUntil).toISOString(),
      readinessBps: item.candidate.readinessBps, fitBps: item.fitBps, projectedRevenueCents: item.projectedRevenueCents,
      energyDemand: requirement.energyDemand,
      rationale: `${item.candidate.project.title} is operationally ready and fits this window after ${requirement.prepMinutes ?? profile.defaultPrepMinutes} minutes of preparation, ${requirement.travelMinutes ?? profile.defaultTravelMinutes} minutes of travel, and protected buffers.${weeklyRevenueGapCents > 0 ? " Its recorded value may contribute toward the weekly target but is not treated as collected revenue." : ""} Scheduling still requires owner approval.`,
      evidenceJson: JSON.stringify(item.evidence), status: "proposed", approvalRequired: true, createdAt: now, updatedAt: now,
    });
  }
  return { id: runId, summary, windowsEvaluated: openWindows.length, projectsEvaluated: readiness.length, readyProjects: ready.length, opportunitiesCreated: opportunityInputs.length, conflictsDetected, projectedRevenueCents, weeklyCollectedCents, weeklyRevenueGapCents, readiness };
}

export async function listSchedulingIntelligence(workspaceId: string, db: Db = getDb()) {
  const profile = await ensureSchedulingProfile(workspaceId, db);
  const [requirements, windows, runs, opportunities] = await Promise.all([
    db.select().from(projectScheduleRequirements).where(eq(projectScheduleRequirements.workspaceId, workspaceId)).orderBy(desc(projectScheduleRequirements.updatedAt)),
    db.select().from(availabilityWindows).where(eq(availabilityWindows.workspaceId, workspaceId)).orderBy(availabilityWindows.startsAt),
    db.select().from(scheduleEvaluationRuns).where(eq(scheduleEvaluationRuns.workspaceId, workspaceId)).orderBy(desc(scheduleEvaluationRuns.createdAt)).limit(30),
    db.select().from(scheduleOpportunities).where(and(eq(scheduleOpportunities.workspaceId, workspaceId), inArray(scheduleOpportunities.status, ["proposed", "held_for_approval", "booked"]))).orderBy(scheduleOpportunities.suggestedStartsAt),
  ]);
  return { profile, requirements, windows, runs, opportunities, policyVersion: SCHEDULING_INTELLIGENCE_POLICY_VERSION };
}
