import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  approvals,
  assets,
  auditEvents,
  consentGrants,
  contentCandidates,
  healingCheckins,
  outcomes,
  projects,
  tattooSessions,
} from "../../../db/schema";
import { captureAutomationSignal } from "../../../lib/automation-engine";
import { actorFrom, jsonError, makeId, requireOwner, routeError, WORKSPACE_ID } from "../_lib";

const HEALING_DAYS = [3, 7, 14, 30] as const;

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    const db = getDb();
    const [sessions, healing, candidates, consent] = await Promise.all([
      db.select().from(tattooSessions).where(eq(tattooSessions.workspaceId, WORKSPACE_ID)).orderBy(desc(tattooSessions.createdAt)),
      db.select().from(healingCheckins).where(eq(healingCheckins.workspaceId, WORKSPACE_ID)).orderBy(desc(healingCheckins.scheduledFor)),
      db.select().from(contentCandidates).where(eq(contentCandidates.workspaceId, WORKSPACE_ID)).orderBy(desc(contentCandidates.createdAt)),
      db.select().from(consentGrants).where(and(eq(consentGrants.workspaceId, WORKSPACE_ID), eq(consentGrants.consentType, "tattoo_media_use"))).orderBy(desc(consentGrants.createdAt)),
    ]);
    return Response.json({ sessions, healingCheckins: healing, contentCandidates: candidates, mediaConsent: consent });
  } catch (error) {
    return routeError(error, "Unable to load tattoo lifecycle");
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json()) as {
      action?: "create_session" | "complete_session" | "review_healing" | "create_content_candidate" | "approve_content_candidate";
      projectId?: string;
      appointmentId?: string;
      sessionId?: string;
      healingCheckinId?: string;
      contentCandidateId?: string;
      sessionNumber?: number;
      startedAt?: string;
      endedAt?: string;
      designAssetId?: string;
      stencilAssetId?: string;
      placementSnapshot?: string;
      needleSetup?: string;
      inkSetup?: string;
      techniqueNotes?: string;
      clientVisibleSummary?: string;
      ownerResponse?: string;
      needsAttention?: boolean;
      sourceAssetId?: string;
      format?: string;
      title?: string;
      captionDraft?: string;
      requestKey?: string;
    };
    const db = getDb();
    const actor = actorFrom(request);
    const now = new Date().toISOString();

    if (payload.action === "create_session") {
      if (!payload.projectId) return jsonError("Project is required");
      const project = await db.select().from(projects).where(and(eq(projects.id, payload.projectId), eq(projects.workspaceId, WORKSPACE_ID))).get();
      if (!project?.clientId) return jsonError("Project and client were not found", 404);
      const requestKey = payload.requestKey?.trim() || `session:${project.id}:${payload.sessionNumber || 1}`;
      const prior = await db.select({ id: tattooSessions.id }).from(tattooSessions).where(and(eq(tattooSessions.workspaceId, WORKSPACE_ID), eq(tattooSessions.requestKey, requestKey))).get();
      if (prior) return Response.json({ id: prior.id, status: "existing", idempotent: true });
      const id = makeId("ses");
      await db.batch([
        db.insert(tattooSessions).values({
          id, workspaceId: WORKSPACE_ID, projectId: project.id, clientId: project.clientId,
          appointmentId: payload.appointmentId || null, sessionNumber: Math.max(1, payload.sessionNumber || 1),
          status: "planned", startedAt: payload.startedAt || null, endedAt: payload.endedAt || null,
          designAssetId: payload.designAssetId || null, stencilAssetId: payload.stencilAssetId || null,
          placementSnapshot: payload.placementSnapshot?.trim() || project.placement,
          needleSetup: payload.needleSetup?.trim() || null, inkSetup: payload.inkSetup?.trim() || null,
          techniqueNotes: payload.techniqueNotes?.trim() || null,
          clientVisibleSummary: payload.clientVisibleSummary?.trim() || null,
          requestKey, createdBy: actor, createdAt: now, updatedAt: now,
        }),
        db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "user", actorId: actor, action: "tattoo_session.created", targetType: "tattoo_session", targetId: id, riskLevel: "medium", outcome: "succeeded", metadataJson: JSON.stringify({ projectId: project.id }), occurredAt: now }),
      ]);
      await captureAutomationSignal({ workspaceId: WORKSPACE_ID, eventType: "tattoo_session_planned", projectId: project.id, clientId: project.clientId, sourceType: "tattoo_session", sourceId: id, category: "workflow", signalKey: "session.planned", value: { sessionNumber: payload.sessionNumber || 1, hasApprovedArtifacts: Boolean(payload.designAssetId || payload.stencilAssetId) }, priority: 75 }, db);
      return Response.json({ id, status: "planned" }, { status: 201 });
    }

    if (payload.action === "complete_session") {
      if (!payload.sessionId) return jsonError("Session is required");
      const session = await db.select().from(tattooSessions).where(and(eq(tattooSessions.id, payload.sessionId), eq(tattooSessions.workspaceId, WORKSPACE_ID))).get();
      if (!session) return jsonError("Session not found", 404);
      if (session.status === "completed") return Response.json({ id: session.id, status: "completed", idempotent: true });
      const approved = await db.select({ id: approvals.id }).from(approvals).where(and(eq(approvals.projectId, session.projectId), eq(approvals.status, "approved"))).get();
      if (!approved) return jsonError("An approved project artifact is required before completing a tattoo session", 409);
      const startedAt = payload.startedAt || session.startedAt;
      const endedAt = payload.endedAt || now;
      const durationMinutes = startedAt ? Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000)) : null;
      const endDate = new Date(endedAt);
      const checkinWrites = HEALING_DAYS.map((day) => {
        const scheduled = new Date(endDate);
        scheduled.setUTCDate(scheduled.getUTCDate() + day);
        return db.insert(healingCheckins).values({
          id: makeId("heal"), workspaceId: WORKSPACE_ID, projectId: session.projectId, clientId: session.clientId,
          sessionId: session.id, checkpointDay: day, scheduledFor: scheduled.toISOString(), status: "due",
          requestKey: `session:${session.id}:healing:${day}`, createdAt: now, updatedAt: now,
        }).onConflictDoNothing();
      });
      await db.batch([
        db.update(tattooSessions).set({ status: "completed", startedAt, endedAt, durationMinutes, clientVisibleSummary: payload.clientVisibleSummary?.trim() || session.clientVisibleSummary, techniqueNotes: payload.techniqueNotes?.trim() || session.techniqueNotes, updatedAt: now }).where(eq(tattooSessions.id, session.id)),
        db.update(projects).set({ lifecyclePhase: "healing", nextAction: "Review scheduled healing check-ins", updatedAt: now }).where(eq(projects.id, session.projectId)),
        db.insert(outcomes).values({ id: makeId("out"), workspaceId: WORKSPACE_ID, projectId: session.projectId, metricName: "session_duration_minutes", resultValue: durationMinutes, unit: "minutes", direction: "neutral", status: "measured", observationWindowDays: 0, measuredAt: now, evidenceJson: JSON.stringify([{ type: "tattoo_session", id: session.id }]), createdAt: now, updatedAt: now }),
        db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "user", actorId: actor, action: "tattoo_session.completed", targetType: "tattoo_session", targetId: session.id, riskLevel: "medium", outcome: "succeeded", metadataJson: JSON.stringify({ durationMinutes, healingDays: HEALING_DAYS }), occurredAt: now }),
        ...checkinWrites,
      ]);
      await captureAutomationSignal({ workspaceId: WORKSPACE_ID, eventType: "tattoo_session_completed", projectId: session.projectId, clientId: session.clientId, sourceType: "tattoo_session", sourceId: session.id, category: "outcome", signalKey: "session.completed", value: { sessionNumber: session.sessionNumber, durationMinutes, healingCheckpoints: HEALING_DAYS }, priority: 95 }, db);
      return Response.json({ id: session.id, status: "completed", healingCheckpoints: HEALING_DAYS });
    }

    if (payload.action === "review_healing") {
      if (!payload.healingCheckinId || !payload.ownerResponse?.trim()) return jsonError("Check-in and owner response are required");
      const checkin = await db.select().from(healingCheckins).where(and(eq(healingCheckins.id, payload.healingCheckinId), eq(healingCheckins.workspaceId, WORKSPACE_ID))).get();
      if (!checkin) return jsonError("Healing check-in not found", 404);
      const status = payload.needsAttention ? "needs_attention" : "reviewed";
      await db.batch([
        db.update(healingCheckins).set({ status, ownerResponse: payload.ownerResponse.trim(), reviewedAt: now, updatedAt: now }).where(eq(healingCheckins.id, checkin.id)),
        db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "user", actorId: actor, action: "healing_checkin.reviewed", targetType: "healing_checkin", targetId: checkin.id, riskLevel: payload.needsAttention ? "high" : "medium", outcome: "succeeded", metadataJson: JSON.stringify({ status }), occurredAt: now }),
      ]);
      await captureAutomationSignal({ workspaceId: WORKSPACE_ID, eventType: "healing_checkin_reviewed", projectId: checkin.projectId, clientId: checkin.clientId, sourceType: "healing_checkin", sourceId: checkin.id, category: "outcome", signalKey: `healing.day_${checkin.checkpointDay}`, value: { progressRating: checkin.progressRating, concernFlag: checkin.concernFlag, status }, priority: payload.needsAttention ? 100 : 75 }, db);
      return Response.json({ id: checkin.id, status });
    }

    if (payload.action === "create_content_candidate") {
      if (!payload.projectId || !payload.sourceAssetId || !payload.title?.trim()) return jsonError("Project, eligible source asset, and title are required");
      const project = await db.select().from(projects).where(and(eq(projects.id, payload.projectId), eq(projects.workspaceId, WORKSPACE_ID))).get();
      if (!project?.clientId) return jsonError("Project not found", 404);
      const asset = await db.select().from(assets).where(and(eq(assets.id, payload.sourceAssetId), eq(assets.projectId, project.id), eq(assets.workspaceId, WORKSPACE_ID))).get();
      if (!asset || !asset.contentEligible || asset.consentStatus !== "granted" || !["owned", "licensed", "client_permission"].includes(asset.rightsStatus)) return jsonError("This asset is not eligible for content use", 409);
      const consent = await db.select().from(consentGrants).where(and(eq(consentGrants.clientId, project.clientId), eq(consentGrants.consentType, "tattoo_media_use"), eq(consentGrants.status, "granted"))).get();
      if (!consent) return jsonError("The client must grant tattoo media consent before content can be drafted", 409);
      const requestKey = payload.requestKey?.trim() || `content:${project.id}:${asset.id}:${payload.format || "portfolio"}`;
      const prior = await db.select({ id: contentCandidates.id }).from(contentCandidates).where(and(eq(contentCandidates.workspaceId, WORKSPACE_ID), eq(contentCandidates.requestKey, requestKey))).get();
      if (prior) return Response.json({ id: prior.id, status: "existing", idempotent: true });
      const id = makeId("content");
      await db.batch([
        db.insert(contentCandidates).values({ id, workspaceId: WORKSPACE_ID, projectId: project.id, clientId: project.clientId, sessionId: payload.sessionId || null, sourceAssetId: asset.id, title: payload.title.trim(), format: payload.format || "portfolio", status: "approval_required", captionDraft: payload.captionDraft?.trim() || null, evidenceJson: JSON.stringify([{ type: "asset", id: asset.id }, { type: "consent", id: consent.id }]), rightsStatus: asset.rightsStatus, consentStatus: consent.status, createdByType: "agent", requestKey, createdAt: now, updatedAt: now }),
        db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "agent", actorId: "content-producer", action: "content_candidate.created", targetType: "content_candidate", targetId: id, riskLevel: "medium", outcome: "held_for_approval", metadataJson: JSON.stringify({ assetId: asset.id }), occurredAt: now }),
      ]);
      return Response.json({ id, status: "approval_required" }, { status: 201 });
    }

    if (payload.action === "approve_content_candidate") {
      if (!payload.contentCandidateId) return jsonError("Content candidate is required");
      const candidate = await db.select().from(contentCandidates).where(and(eq(contentCandidates.id, payload.contentCandidateId), eq(contentCandidates.workspaceId, WORKSPACE_ID))).get();
      if (!candidate) return jsonError("Content candidate not found", 404);
      await db.batch([
        db.update(contentCandidates).set({ status: "approved", approvedBy: actor, approvedAt: now, updatedAt: now }).where(eq(contentCandidates.id, candidate.id)),
        db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: WORKSPACE_ID, actorType: "user", actorId: actor, action: "content_candidate.approved", targetType: "content_candidate", targetId: candidate.id, riskLevel: "high", outcome: "succeeded", metadataJson: JSON.stringify({ publishingPerformed: false }), occurredAt: now }),
      ]);
      return Response.json({ id: candidate.id, status: "approved", publishingPerformed: false });
    }

    return jsonError("Lifecycle action is invalid");
  } catch (error) {
    return routeError(error, "Unable to update tattoo lifecycle");
  }
}
