import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  appointments, approvals, auditEvents, availabilityWindows, paymentRequests,
  projectScheduleRequirements, projects, scheduleOpportunities, schedulingProfiles,
} from "../../../db/schema";
import { routeAgentTask } from "../../../lib/agent-engine";
import { listSchedulingIntelligence, runSchedulingIntelligence, SCHEDULING_INTELLIGENCE_POLICY_VERSION } from "../../../lib/scheduling-intelligence";
import { actorFrom, jsonError, makeId, requireOwner, routeError, WORKSPACE_ID } from "../_lib";

const integer = (value: unknown, minimum: number, maximum: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
};
const activeAppointmentStatuses = new Set(["scheduled", "confirmed"]);

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    return Response.json(await listSchedulingIntelligence(WORKSPACE_ID));
  } catch (error) {
    return routeError(error, "Unable to load scheduling intelligence");
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(payload.action || "");
    const actor = actorFrom(request);
    const db = getDb();
    const now = new Date().toISOString();

    if (action === "update_profile") {
      const values = {
        defaultPrepMinutes: integer(payload.defaultPrepMinutes, 0, 480),
        defaultTravelMinutes: integer(payload.defaultTravelMinutes, 0, 480),
        defaultBufferBeforeMinutes: integer(payload.defaultBufferBeforeMinutes, 0, 240),
        defaultBufferAfterMinutes: integer(payload.defaultBufferAfterMinutes, 0, 240),
        maximumTattooMinutesPerDay: integer(payload.maximumTattooMinutesPerDay, 60, 960),
        maximumHighEnergySessionsPerDay: integer(payload.maximumHighEnergySessionsPerDay, 1, 4),
        minimumBookableMinutes: integer(payload.minimumBookableMinutes, 30, 720),
        weeklyRevenueTargetCents: integer(payload.weeklyRevenueTargetCents, 0, 100_000_000),
      };
      if (Object.values(values).some((value) => value == null)) return jsonError("Scheduling policy values are outside their safe range");
      const safeValues = {
        defaultPrepMinutes: values.defaultPrepMinutes!, defaultTravelMinutes: values.defaultTravelMinutes!,
        defaultBufferBeforeMinutes: values.defaultBufferBeforeMinutes!, defaultBufferAfterMinutes: values.defaultBufferAfterMinutes!,
        maximumTattooMinutesPerDay: values.maximumTattooMinutesPerDay!, maximumHighEnergySessionsPerDay: values.maximumHighEnergySessionsPerDay!,
        minimumBookableMinutes: values.minimumBookableMinutes!, weeklyRevenueTargetCents: values.weeklyRevenueTargetCents!,
      };
      await db.insert(schedulingProfiles).values({ id: makeId("schedule_profile"), workspaceId: WORKSPACE_ID, ...safeValues, policyVersion: SCHEDULING_INTELLIGENCE_POLICY_VERSION, updatedBy: actor, createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: schedulingProfiles.workspaceId, set: { ...safeValues, policyVersion: SCHEDULING_INTELLIGENCE_POLICY_VERSION, updatedBy: actor, updatedAt: now } });
      const evaluation = await runSchedulingIntelligence(WORKSPACE_ID, "scheduling-coordinator:auto", db);
      return Response.json({ profileUpdated: true, evaluation });
    }

    if (action === "save_requirement") {
      const projectId = String(payload.projectId || "");
      const project = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.workspaceId, WORKSPACE_ID), eq(projects.isTest, false), isNull(projects.archivedAt))).get();
      if (!project?.clientId) return jsonError("Choose a real, active client project", 404);
      const estimatedSessionMinutes = integer(payload.estimatedSessionMinutes, 30, 960);
      const prepMinutes = payload.prepMinutes === "" || payload.prepMinutes == null ? null : integer(payload.prepMinutes, 0, 480);
      const travelMinutes = payload.travelMinutes === "" || payload.travelMinutes == null ? null : integer(payload.travelMinutes, 0, 480);
      const bufferBeforeMinutes = payload.bufferBeforeMinutes === "" || payload.bufferBeforeMinutes == null ? null : integer(payload.bufferBeforeMinutes, 0, 240);
      const bufferAfterMinutes = payload.bufferAfterMinutes === "" || payload.bufferAfterMinutes == null ? null : integer(payload.bufferAfterMinutes, 0, 240);
      const minimumRevenueCents = integer(payload.minimumRevenueCents || 0, 0, 100_000_000);
      if (estimatedSessionMinutes == null || minimumRevenueCents == null || [prepMinutes, travelMinutes, bufferBeforeMinutes, bufferAfterMinutes].some((value, index) => [payload.prepMinutes, payload.travelMinutes, payload.bufferBeforeMinutes, payload.bufferAfterMinutes][index] !== "" && [payload.prepMinutes, payload.travelMinutes, payload.bufferBeforeMinutes, payload.bufferAfterMinutes][index] != null && value == null)) return jsonError("Project duration, preparation, travel, buffer, or revenue values are invalid");
      const energyDemand = String(payload.energyDemand || "high");
      if (!new Set(["low", "medium", "high"]).has(energyDemand)) return jsonError("Choose a valid energy demand");
      const earliestStart = String(payload.earliestStart || "").trim() || null;
      const latestEnd = String(payload.latestEnd || "").trim() || null;
      if ((earliestStart && !Number.isFinite(new Date(earliestStart).getTime())) || (latestEnd && !Number.isFinite(new Date(latestEnd).getTime()))) return jsonError("The project scheduling boundary is invalid");
      if (earliestStart && latestEnd && new Date(earliestStart).getTime() >= new Date(latestEnd).getTime()) return jsonError("The project scheduling window is invalid");
      await db.insert(projectScheduleRequirements).values({
        id: makeId("schedule_requirement"), workspaceId: WORKSPACE_ID, projectId: project.id, estimatedSessionMinutes,
        prepMinutes, travelMinutes, bufferBeforeMinutes, bufferAfterMinutes, energyDemand, minimumRevenueCents,
        earliestStart, latestEnd, location: String(payload.location || "").trim() || null,
        notes: String(payload.notes || "").trim() || null, status: "active", updatedBy: actor, createdAt: now, updatedAt: now,
      }).onConflictDoUpdate({ target: projectScheduleRequirements.projectId, set: {
        estimatedSessionMinutes, prepMinutes, travelMinutes, bufferBeforeMinutes, bufferAfterMinutes, energyDemand,
        minimumRevenueCents, earliestStart, latestEnd, location: String(payload.location || "").trim() || null,
        notes: String(payload.notes || "").trim() || null, status: "active", updatedBy: actor, updatedAt: now,
      }});
      const evaluation = await runSchedulingIntelligence(WORKSPACE_ID, "scheduling-coordinator:auto", db);
      return Response.json({ requirementSaved: true, evaluation });
    }

    if (action === "create_window") {
      const startsAt = new Date(String(payload.startsAt || ""));
      const endsAt = new Date(String(payload.endsAt || ""));
      if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt.getTime() <= startsAt.getTime() || (endsAt.getTime() - startsAt.getTime()) < 30 * 60_000) return jsonError("Availability must have valid start and end times at least 30 minutes apart");
      const windowType = String(payload.windowType || "tattoo");
      const status = String(payload.status || "open");
      const energyCapacity = String(payload.energyCapacity || "high");
      if (!new Set(["tattoo", "design", "admin", "personal"]).has(windowType) || !new Set(["open", "protected"]).has(status) || !new Set(["low", "medium", "high"]).has(energyCapacity)) return jsonError("Availability classification is invalid");
      const id = makeId("availability");
      await db.batch([
        db.insert(availabilityWindows).values({ id, workspaceId: WORKSPACE_ID, title: String(payload.title || (status === "protected" ? "Protected time" : "Available capacity")).trim(), startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), windowType, status, energyCapacity, location: String(payload.location || "").trim() || null, notes: String(payload.notes || "").trim() || null, source: "owner", createdBy: actor, createdAt: now, updatedAt: now }),
        db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "user", actorId: actor, action: "scheduling.capacity_window_created", targetType: "availability_window", targetId: id, riskLevel: "low", outcome: "succeeded", metadataJson: JSON.stringify({ windowType, status, energyCapacity }), occurredAt: now }),
      ]);
      const evaluation = await runSchedulingIntelligence(WORKSPACE_ID, "scheduling-coordinator:auto", db);
      return Response.json({ id, evaluation }, { status: 201 });
    }

    if (action === "close_window") {
      const windowId = String(payload.windowId || "");
      const window = await db.select().from(availabilityWindows).where(and(eq(availabilityWindows.id, windowId), eq(availabilityWindows.workspaceId, WORKSPACE_ID))).get();
      if (!window) return jsonError("Availability window was not found", 404);
      await db.batch([
        db.update(availabilityWindows).set({ status: "closed", updatedAt: now }).where(eq(availabilityWindows.id, window.id)),
        db.update(scheduleOpportunities).set({ status: "expired", updatedAt: now }).where(and(eq(scheduleOpportunities.windowId, window.id), eq(scheduleOpportunities.status, "proposed"))),
      ]);
      const evaluation = await runSchedulingIntelligence(WORKSPACE_ID, "scheduling-coordinator:auto", db);
      return Response.json({ closed: true, evaluation });
    }

    if (action === "evaluate") return Response.json(await runSchedulingIntelligence(WORKSPACE_ID, actor, db));

    if (action === "request_booking") {
      const opportunityId = String(payload.opportunityId || "");
      const opportunity = await db.select().from(scheduleOpportunities).where(and(eq(scheduleOpportunities.id, opportunityId), eq(scheduleOpportunities.workspaceId, WORKSPACE_ID))).get();
      if (!opportunity || opportunity.status !== "proposed") return jsonError("This scheduling opportunity is no longer available", 409);
      const window = await db.select().from(availabilityWindows).where(and(eq(availabilityWindows.id, opportunity.windowId), eq(availabilityWindows.workspaceId, WORKSPACE_ID), eq(availabilityWindows.status, "open"))).get();
      if (!window) return jsonError("The supporting availability window is no longer open", 409);
      const [conflictRows, protectedRows] = await Promise.all([
        db.select().from(appointments).where(eq(appointments.workspaceId, WORKSPACE_ID)),
        db.select().from(availabilityWindows).where(and(eq(availabilityWindows.workspaceId, WORKSPACE_ID), eq(availabilityWindows.status, "protected"))),
      ]);
      const suggestedStart = new Date(opportunity.suggestedStartsAt).getTime();
      const reservedStart = new Date(opportunity.reservedFrom).getTime();
      const reservedEnd = new Date(opportunity.reservedUntil).getTime();
      if (suggestedStart <= Date.now() || reservedStart < new Date(window.startsAt).getTime() || reservedEnd > new Date(window.endsAt).getTime()) return jsonError("The suggested capacity is stale. Re-evaluate before requesting approval", 409);
      const conflict = conflictRows.some((item) => activeAppointmentStatuses.has(item.status) && new Date(item.startsAt).getTime() < reservedEnd && new Date(item.endsAt || item.startsAt).getTime() > reservedStart)
        || protectedRows.some((item) => new Date(item.startsAt).getTime() < reservedEnd && new Date(item.endsAt).getTime() > reservedStart);
      if (conflict) return jsonError("The suggested time now conflicts with an existing appointment. Re-evaluate capacity before requesting approval", 409);
      const project = await db.select().from(projects).where(and(eq(projects.id, opportunity.projectId), eq(projects.workspaceId, WORKSPACE_ID))).get();
      const requirement = await db.select().from(projectScheduleRequirements).where(eq(projectScheduleRequirements.projectId, opportunity.projectId)).get();
      if (!project?.clientId || project.status !== "active" || project.isTest || project.archivedAt || project.lifecyclePhase !== "session" || !requirement || requirement.status !== "active") return jsonError("Project scheduling evidence is no longer ready", 409);
      const [approvalRows, depositRows] = await Promise.all([
        db.select().from(approvals).where(and(eq(approvals.workspaceId, WORKSPACE_ID), eq(approvals.projectId, project.id))),
        db.select().from(paymentRequests).where(and(eq(paymentRequests.workspaceId, WORKSPACE_ID), eq(paymentRequests.projectId, project.id))),
      ]);
      const exactApproval = approvalRows.some((item) => item.status === "approved" && Boolean(item.assetId && item.assetSha256));
      const paidDeposit = depositRows.some((item) => item.kind === "deposit" && new Set(["paid", "partially_refunded"]).has(item.status) && item.amountPaidCents - item.amountRefundedCents > 0);
      if (!exactApproval || !paidDeposit) return jsonError("Approval or deposit evidence changed. Re-evaluate capacity before requesting approval", 409);
      const task = await routeAgentTask({
        workspaceId: WORKSPACE_ID, taskType: "schedule_ready_project", title: `Schedule ${project.title}`,
        instructionSummary: "Create only the exact appointment after the owner approves this evidence-backed opportunity.",
        requestedAction: "schedule_appointment", projectId: project.id, clientId: project.clientId,
        requestedByType: "owner", requestedById: actor, sourceType: "schedule_opportunity", sourceId: opportunity.id,
        priority: 90, riskLevel: "high", idempotencyKey: `schedule-opportunity:${opportunity.id}`,
        actionPayload: { projectId: project.id, clientId: project.clientId, startsAt: opportunity.suggestedStartsAt, endsAt: opportunity.suggestedEndsAt, appointmentType: "tattoo_session", location: requirement.location || window.location || undefined, scheduleOpportunityId: opportunity.id },
      }, db);
      if (!task) throw new Error("Scheduling approval task could not be created");
      await db.update(scheduleOpportunities).set({ status: "held_for_approval", taskId: task.id, updatedAt: now }).where(eq(scheduleOpportunities.id, opportunity.id));
      return Response.json({ opportunityId: opportunity.id, task });
    }

    return jsonError("Scheduling intelligence action is invalid");
  } catch (error) {
    return routeError(error, "Unable to update scheduling intelligence");
  }
}
