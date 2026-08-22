import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  auditEvents,
  consentGrants,
  healingCheckins,
  projects,
  tattooSessions,
} from "../../../../db/schema";
import { captureAutomationSignal } from "../../../../lib/automation-engine";
import { jsonError, makeId, resolveClientAccess } from "../../_lib";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    const access = await resolveClientAccess(request, token);
    if (!access) return jsonError("Portal access is invalid or expired", 401);
    const db = getDb();
    const projectRows = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.workspaceId, access.workspaceId), eq(projects.clientId, access.clientId)));
    const projectIds = projectRows.map((project) => project.id);
    const [sessions, checkins, consent] = await Promise.all([
      projectIds.length ? db.select({ id: tattooSessions.id, projectId: tattooSessions.projectId, sessionNumber: tattooSessions.sessionNumber, status: tattooSessions.status, startedAt: tattooSessions.startedAt, endedAt: tattooSessions.endedAt, clientVisibleSummary: tattooSessions.clientVisibleSummary, durationMinutes: tattooSessions.durationMinutes }).from(tattooSessions).where(and(eq(tattooSessions.clientId, access.clientId), inArray(tattooSessions.projectId, projectIds))).orderBy(desc(tattooSessions.createdAt)) : [],
      projectIds.length ? db.select({ id: healingCheckins.id, projectId: healingCheckins.projectId, sessionId: healingCheckins.sessionId, checkpointDay: healingCheckins.checkpointDay, scheduledFor: healingCheckins.scheduledFor, status: healingCheckins.status, clientNotes: healingCheckins.clientNotes, progressRating: healingCheckins.progressRating, concernFlag: healingCheckins.concernFlag, ownerResponse: healingCheckins.ownerResponse, submittedAt: healingCheckins.submittedAt, reviewedAt: healingCheckins.reviewedAt }).from(healingCheckins).where(and(eq(healingCheckins.clientId, access.clientId), inArray(healingCheckins.projectId, projectIds))).orderBy(desc(healingCheckins.scheduledFor)) : [],
      db.select().from(consentGrants).where(and(eq(consentGrants.workspaceId, access.workspaceId), eq(consentGrants.clientId, access.clientId), eq(consentGrants.consentType, "tattoo_media_use"))).orderBy(desc(consentGrants.createdAt)),
    ]);
    return Response.json({ sessions, healingCheckins: checkins, mediaConsent: consent[0] || null });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load healing timeline", 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      token?: string;
      action?: "submit_healing_checkin" | "grant_media_consent" | "revoke_media_consent";
      healingCheckinId?: string;
      clientNotes?: string;
      progressRating?: number;
      concernFlag?: boolean;
    };
    const access = await resolveClientAccess(request, payload.token || null);
    if (!access) return jsonError("Portal access is invalid or expired", 401);
    const db = getDb();
    const now = new Date().toISOString();

    if (payload.action === "submit_healing_checkin") {
      if (!payload.healingCheckinId || !payload.clientNotes?.trim()) return jsonError("Check-in and notes are required");
      const rating = Number(payload.progressRating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return jsonError("Progress rating must be between 1 and 5");
      const checkin = await db.select().from(healingCheckins).where(and(eq(healingCheckins.id, payload.healingCheckinId), eq(healingCheckins.workspaceId, access.workspaceId), eq(healingCheckins.clientId, access.clientId))).get();
      if (!checkin) return jsonError("Healing check-in not found", 404);
      if (["reviewed", "closed"].includes(checkin.status)) return jsonError("This check-in has already been reviewed", 409);
      await db.batch([
        db.update(healingCheckins).set({ status: "submitted", clientNotes: payload.clientNotes.trim(), progressRating: rating, concernFlag: Boolean(payload.concernFlag), submittedAt: now, updatedAt: now }).where(eq(healingCheckins.id, checkin.id)),
        db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: access.workspaceId, actorType: "client", actorId: access.clientId, action: "healing_checkin.submitted", targetType: "healing_checkin", targetId: checkin.id, riskLevel: payload.concernFlag ? "high" : "medium", outcome: "succeeded", metadataJson: JSON.stringify({ checkpointDay: checkin.checkpointDay, concernFlag: Boolean(payload.concernFlag) }), occurredAt: now }),
      ]);
      await captureAutomationSignal({ workspaceId: access.workspaceId, eventType: "healing_checkin_submitted", projectId: checkin.projectId, clientId: access.clientId, sourceType: "healing_checkin", sourceId: checkin.id, category: "outcome", signalKey: `healing.day_${checkin.checkpointDay}`, value: { progressRating: rating, concernFlag: Boolean(payload.concernFlag) }, priority: payload.concernFlag ? 100 : 80 }, db);
      return Response.json({ id: checkin.id, status: "submitted" });
    }

    if (payload.action === "grant_media_consent") {
      await db.update(consentGrants).set({ status: "revoked", revokedAt: now, updatedAt: now }).where(and(eq(consentGrants.workspaceId, access.workspaceId), eq(consentGrants.clientId, access.clientId), eq(consentGrants.consentType, "tattoo_media_use"), eq(consentGrants.status, "granted")));
      const id = makeId("consent");
      await db.batch([
        db.insert(consentGrants).values({ id, workspaceId: access.workspaceId, clientId: access.clientId, consentType: "tattoo_media_use", scopesJson: JSON.stringify(["portfolio", "social_drafts", "studio_marketing"]), purpose: "Allow the studio to prepare and publish approved images of completed tattoo work", policyVersion: "2026-08-stage-6", status: "granted", grantedAt: now, createdAt: now, updatedAt: now }),
        db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: access.workspaceId, actorType: "client", actorId: access.clientId, action: "media_consent.granted", targetType: "consent_grant", targetId: id, riskLevel: "high", outcome: "succeeded", metadataJson: JSON.stringify({ scopes: ["portfolio", "social_drafts", "studio_marketing"] }), occurredAt: now }),
      ]);
      return Response.json({ id, status: "granted" }, { status: 201 });
    }

    if (payload.action === "revoke_media_consent") {
      await db.update(consentGrants).set({ status: "revoked", revokedAt: now, updatedAt: now }).where(and(eq(consentGrants.workspaceId, access.workspaceId), eq(consentGrants.clientId, access.clientId), eq(consentGrants.consentType, "tattoo_media_use"), eq(consentGrants.status, "granted")));
      await db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: access.workspaceId, actorType: "client", actorId: access.clientId, action: "media_consent.revoked", targetType: "client", targetId: access.clientId, riskLevel: "high", outcome: "succeeded", metadataJson: "{}", occurredAt: now });
      return Response.json({ status: "revoked" });
    }

    return jsonError("Portal lifecycle action is invalid");
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to update healing timeline", 500);
  }
}
