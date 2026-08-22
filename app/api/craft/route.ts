import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { assets, auditEvents, healingAssessments, healingCheckins, projects, sessionCraftRecords, tattooSessions } from "../../../db/schema";
import { captureAutomationSignal } from "../../../lib/automation-engine";
import { craftRecordCompleteness, listCraftIntelligence, runCraftIntelligence } from "../../../lib/craft-intelligence";
import { actorFrom, jsonError, makeId, requireOwner, routeError, WORKSPACE_ID } from "../_lib";

const asList = (value: unknown) => {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(source.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(0, 20);
};
const asRating = (value: unknown, required = false) => {
  if (value == null || value === "") return required ? null : undefined;
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 5 ? number : null;
};
const asVoltageMv = (value: unknown) => {
  if (value == null || value === "") return null;
  const volts = Number(value);
  return Number.isFinite(volts) && volts >= 3 && volts <= 15 ? Math.round(volts * 1000) : Number.NaN;
};

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    return Response.json(await listCraftIntelligence(WORKSPACE_ID));
  } catch (error) {
    return routeError(error, "Unable to load professional craft intelligence");
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

    if (action === "save_session_craft") {
      const sessionId = String(payload.sessionId || "");
      if (!sessionId) return jsonError("Tattoo session is required");
      const session = await db.select().from(tattooSessions).where(and(eq(tattooSessions.id, sessionId), eq(tattooSessions.workspaceId, WORKSPACE_ID))).get();
      if (!session) return jsonError("Tattoo session was not found", 404);
      const project = await db.select({ isTest: projects.isTest, archivedAt: projects.archivedAt }).from(projects).where(and(eq(projects.id, session.projectId), eq(projects.workspaceId, WORKSPACE_ID))).get();
      if (!project || project.isTest || project.archivedAt) return jsonError("Test and archived projects cannot contribute craft evidence", 409);
      const needles = asList(payload.needleGroupings);
      const washes = asList(payload.inkWash);
      const techniques = asList(payload.techniques);
      const voltageMinMv = asVoltageMv(payload.voltageMin);
      const voltageMaxMv = asVoltageMv(payload.voltageMax);
      if (Number.isNaN(voltageMinMv) || Number.isNaN(voltageMaxMv) || (voltageMinMv != null && voltageMaxMv != null && voltageMinMv > voltageMaxMv)) return jsonError("Voltage must be between 3.0 and 15.0 V and the minimum cannot exceed the maximum");
      const freshOutcomeRating = asRating(payload.freshOutcomeRating);
      if (freshOutcomeRating === null) return jsonError("Fresh outcome rating must be from 1 to 5");
      const freshAssetIds = asList(payload.freshAssetIds);
      if (freshAssetIds.length) {
        const scopedAssets = await Promise.all(freshAssetIds.map((id) => db.select({ id: assets.id }).from(assets).where(and(eq(assets.id, id), eq(assets.workspaceId, WORKSPACE_ID), eq(assets.projectId, session.projectId))).get()));
        if (scopedAssets.some((item) => !item)) return jsonError("Every fresh-result photo must belong to this project", 409);
      }
      const record = {
        machineName: String(payload.machineName || "").trim() || null,
        machineType: String(payload.machineType || "").trim() || null,
        needleGroupings: needles, inkWash: washes, voltageMinMv, voltageMaxMv, techniques,
        bodyArea: String(payload.bodyArea || "").trim() || session.placementSnapshot || null,
        skinResponse: String(payload.skinResponse || "").trim() || null,
        freshOutcomeRating: freshOutcomeRating ?? null,
      };
      const completenessBps = craftRecordCompleteness(record);
      const id = makeId("craft");
      await db.batch([
        db.insert(sessionCraftRecords).values({
          id, workspaceId: WORKSPACE_ID, sessionId: session.id, projectId: session.projectId, clientId: session.clientId,
          machineName: record.machineName, machineType: record.machineType,
          needleGroupingsJson: JSON.stringify(needles), inkWashJson: JSON.stringify(washes),
          voltageMinMv, voltageMaxMv, techniquesJson: JSON.stringify(techniques), bodyArea: record.bodyArea,
          skinResponse: record.skinResponse, clientResponse: String(payload.clientResponse || "").trim() || null,
          freshOutcomeRating: record.freshOutcomeRating, ownerAssessment: String(payload.ownerAssessment || "").trim() || null,
          freshAssetIdsJson: JSON.stringify(freshAssetIds), completenessBps, recordedBy: actor, createdAt: now, updatedAt: now,
        }).onConflictDoUpdate({ target: sessionCraftRecords.sessionId, set: {
          machineName: record.machineName, machineType: record.machineType,
          needleGroupingsJson: JSON.stringify(needles), inkWashJson: JSON.stringify(washes), voltageMinMv, voltageMaxMv,
          techniquesJson: JSON.stringify(techniques), bodyArea: record.bodyArea, skinResponse: record.skinResponse,
          clientResponse: String(payload.clientResponse || "").trim() || null, freshOutcomeRating: record.freshOutcomeRating,
          ownerAssessment: String(payload.ownerAssessment || "").trim() || null, freshAssetIdsJson: JSON.stringify(freshAssetIds),
          completenessBps, recordedBy: actor, updatedAt: now,
        }}),
        db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "user", actorId: actor, action: "craft.session_record_saved", targetType: "tattoo_session", targetId: session.id, riskLevel: "medium", outcome: "succeeded", metadataJson: JSON.stringify({ completenessBps, privateNotesCaptured: Boolean(payload.ownerAssessment) }), occurredAt: now }),
      ]);
      await captureAutomationSignal({ workspaceId: WORKSPACE_ID, eventType: "craft_session_recorded", projectId: session.projectId, clientId: session.clientId, sourceType: "tattoo_session", sourceId: session.id, category: "craft", signalKey: "craft.session_conditions", value: { needles, techniques, completenessBps, freshOutcomeRating: record.freshOutcomeRating }, priority: 80 }, db);
      const learningRun = await runCraftIntelligence(WORKSPACE_ID, "analytics-advisor:auto", db);
      await db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "agent", actorId: "analytics-advisor", action: "craft.analysis_completed", targetType: "craft_analysis_run", targetId: learningRun.id, riskLevel: "low", outcome: "succeeded", metadataJson: JSON.stringify({ trigger: "session_craft_record_saved", eligibleSessions: learningRun.eligibleSessions, promotedPatterns: learningRun.promotedPatterns, policyVersion: learningRun.policyVersion }), occurredAt: now });
      const stored = await db.select({ id: sessionCraftRecords.id }).from(sessionCraftRecords).where(eq(sessionCraftRecords.sessionId, session.id)).get();
      return Response.json({ id: stored?.id || id, sessionId: session.id, completenessBps, learningRun });
    }

    if (action === "save_healing_assessment") {
      const checkinId = String(payload.checkinId || "");
      if (!checkinId) return jsonError("Healing check-in is required");
      const checkin = await db.select().from(healingCheckins).where(and(eq(healingCheckins.id, checkinId), eq(healingCheckins.workspaceId, WORKSPACE_ID))).get();
      if (!checkin) return jsonError("Healing check-in was not found", 404);
      if (!checkin.submittedAt && !["reviewed", "closed", "needs_attention"].includes(checkin.status)) return jsonError("Record the client check-in before adding an owner healing assessment", 409);
      const phase = String(payload.healingPhase || "");
      if (!["early_healing", "late_healing", "healed"].includes(phase)) return jsonError("Choose a valid healing phase");
      const healedOutcomeRating = asRating(payload.healedOutcomeRating, true);
      if (healedOutcomeRating == null) return jsonError("Healed outcome rating must be from 1 to 5");
      const ownerAssessment = String(payload.ownerAssessment || "").trim();
      if (!ownerAssessment) return jsonError("Joshua’s owner assessment is required");
      const optionalRatings = ["retentionRating", "saturationRating", "lineQualityRating", "smoothnessRating"] as const;
      const ratings = Object.fromEntries(optionalRatings.map((key) => [key, asRating(payload[key])])) as Record<typeof optionalRatings[number], number | undefined | null>;
      if (optionalRatings.some((key) => ratings[key] === null)) return jsonError("Healing quality ratings must be from 1 to 5");
      const photoAssetIds = asList(payload.photoAssetIds);
      if (photoAssetIds.length) {
        const scopedAssets = await Promise.all(photoAssetIds.map((id) => db.select({ id: assets.id }).from(assets).where(and(eq(assets.id, id), eq(assets.workspaceId, WORKSPACE_ID), eq(assets.projectId, checkin.projectId))).get()));
        if (scopedAssets.some((item) => !item)) return jsonError("Every healing photo must belong to this project", 409);
      }
      const id = makeId("heal_assess");
      await db.batch([
        db.insert(healingAssessments).values({
          id, workspaceId: WORKSPACE_ID, checkinId: checkin.id, sessionId: checkin.sessionId,
          projectId: checkin.projectId, clientId: checkin.clientId, healingPhase: phase,
          retentionRating: ratings.retentionRating ?? null, saturationRating: ratings.saturationRating ?? null,
          lineQualityRating: ratings.lineQualityRating ?? null, smoothnessRating: ratings.smoothnessRating ?? null,
          healedOutcomeRating, touchupRequired: Boolean(payload.touchupRequired), ownerAssessment,
          clientFeedbackSummary: String(payload.clientFeedbackSummary || checkin.clientNotes || "").trim() || null,
          photoAssetIdsJson: JSON.stringify(photoAssetIds), assessedBy: actor, assessedAt: now, createdAt: now, updatedAt: now,
        }).onConflictDoUpdate({ target: healingAssessments.checkinId, set: {
          healingPhase: phase, retentionRating: ratings.retentionRating ?? null, saturationRating: ratings.saturationRating ?? null,
          lineQualityRating: ratings.lineQualityRating ?? null, smoothnessRating: ratings.smoothnessRating ?? null,
          healedOutcomeRating, touchupRequired: Boolean(payload.touchupRequired), ownerAssessment,
          clientFeedbackSummary: String(payload.clientFeedbackSummary || checkin.clientNotes || "").trim() || null,
          photoAssetIdsJson: JSON.stringify(photoAssetIds), assessedBy: actor, assessedAt: now, updatedAt: now,
        }}),
        db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "user", actorId: actor, action: "craft.healing_assessment_saved", targetType: "healing_checkin", targetId: checkin.id, riskLevel: "medium", outcome: "succeeded", metadataJson: JSON.stringify({ phase, healedOutcomeRating, touchupRequired: Boolean(payload.touchupRequired), medicalDiagnosisGenerated: false }), occurredAt: now }),
      ]);
      await captureAutomationSignal({ workspaceId: WORKSPACE_ID, eventType: "craft_healing_assessed", projectId: checkin.projectId, clientId: checkin.clientId, sourceType: "healing_checkin", sourceId: checkin.id, category: "craft_outcome", signalKey: "craft.healed_outcome", value: { phase, healedOutcomeRating, touchupRequired: Boolean(payload.touchupRequired) }, priority: 90 }, db);
      const learningRun = ["late_healing", "healed"].includes(phase) ? await runCraftIntelligence(WORKSPACE_ID, "analytics-advisor:auto", db) : null;
      if (learningRun) await db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "agent", actorId: "analytics-advisor", action: "craft.analysis_completed", targetType: "craft_analysis_run", targetId: learningRun.id, riskLevel: "low", outcome: "succeeded", metadataJson: JSON.stringify({ trigger: "healing_assessment_saved", eligibleSessions: learningRun.eligibleSessions, promotedPatterns: learningRun.promotedPatterns, policyVersion: learningRun.policyVersion }), occurredAt: now });
      const stored = await db.select({ id: healingAssessments.id }).from(healingAssessments).where(eq(healingAssessments.checkinId, checkin.id)).get();
      return Response.json({ id: stored?.id || id, checkinId: checkin.id, healingPhase: phase, healedOutcomeRating, learningRun });
    }

    if (action === "run_analysis") {
      const result = await runCraftIntelligence(WORKSPACE_ID, actor, db);
      await db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "agent", actorId: "analytics-advisor", action: "craft.analysis_completed", targetType: "craft_analysis_run", targetId: result.id, riskLevel: "low", outcome: "succeeded", metadataJson: JSON.stringify({ eligibleSessions: result.eligibleSessions, promotedPatterns: result.promotedPatterns, policyVersion: result.policyVersion }), occurredAt: now });
      return Response.json(result);
    }

    return jsonError("Craft intelligence action is invalid");
  } catch (error) {
    return routeError(error, "Unable to update professional craft intelligence");
  }
}
