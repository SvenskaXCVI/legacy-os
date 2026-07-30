import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  auditEvents,
  consentGrants,
  socialConnections,
} from "../../../../db/schema";
import {
  jsonError,
  makeId,
  resolveClientAccess,
} from "../../_lib";

const allowedScopes = new Set([
  "profile",
  "media_metadata",
  "tattoo_post_detection",
  "engagement_metrics",
  "caption_summary",
]);

async function accessFrom(request: Request, bodyToken?: string) {
  const urlToken = new URL(request.url).searchParams.get("token");
  return resolveClientAccess(request, bodyToken || urlToken);
}

export async function GET(request: Request) {
  try {
    const access = await accessFrom(request);
    if (!access) return jsonError("Verified client access is required", 401);
    const db = getDb();
    const [grants, connections] = await Promise.all([
      db
        .select()
        .from(consentGrants)
        .where(eq(consentGrants.clientId, access.clientId))
        .orderBy(desc(consentGrants.createdAt)),
      db
        .select({
          id: socialConnections.id,
          platform: socialConnections.platform,
          handle: socialConnections.handle,
          accountType: socialConnections.accountType,
          scopesJson: socialConnections.scopesJson,
          status: socialConnections.status,
          lastSyncedAt: socialConnections.lastSyncedAt,
          createdAt: socialConnections.createdAt,
        })
        .from(socialConnections)
        .where(eq(socialConnections.clientId, access.clientId))
        .orderBy(desc(socialConnections.createdAt)),
    ]);
    return Response.json({ grants, connections });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load consent",
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      token?: string;
      action?: "grant" | "revoke";
      scopes?: string[];
      grantId?: string;
    };
    const access = await accessFrom(request, payload.token);
    if (!access) return jsonError("Verified client access is required", 401);
    const db = getDb();
    const now = new Date().toISOString();

    if (payload.action === "grant") {
      const scopes = [...new Set(payload.scopes ?? [])].filter((scope) =>
        allowedScopes.has(scope),
      );
      if (!scopes.includes("profile") || !scopes.includes("media_metadata")) {
        return jsonError(
          "Profile and media metadata scopes are required for a social connection",
        );
      }
      const grantId = makeId("consent");
      await db.batch([
        db.insert(consentGrants).values({
          id: grantId,
          workspaceId: access.workspaceId,
          clientId: access.clientId,
          consentType: "instagram_observation",
          scopesJson: JSON.stringify(scopes),
          purpose:
            "Observe client-authorized Instagram professional-account posts that may relate to their tattoo, then connect aggregate engagement evidence to the correct Legacy OS project.",
          policyVersion: "social-consent-v1",
          status: "granted",
          grantedAt: now,
          createdAt: now,
          updatedAt: now,
        }),
        db.insert(auditEvents).values({
          id: makeId("audit"),
          workspaceId: access.workspaceId,
          actorType: "client",
          actorId: access.clientId,
          action: "social_consent.granted",
          targetType: "consent_grant",
          targetId: grantId,
          riskLevel: "medium",
          outcome: "succeeded",
          metadataJson: JSON.stringify({ scopes }),
          occurredAt: now,
        }),
      ]);
      return Response.json({ id: grantId, status: "granted", scopes });
    }

    if (payload.action === "revoke" && payload.grantId) {
      const grant = await db
        .select()
        .from(consentGrants)
        .where(
          and(
            eq(consentGrants.id, payload.grantId),
            eq(consentGrants.clientId, access.clientId),
          ),
        )
        .get();
      if (!grant) return jsonError("Consent grant not found", 404);
      await db.batch([
        db
          .update(consentGrants)
          .set({ status: "revoked", revokedAt: now, updatedAt: now })
          .where(eq(consentGrants.id, grant.id)),
        db
          .update(socialConnections)
          .set({ status: "revoked", updatedAt: now })
          .where(eq(socialConnections.consentGrantId, grant.id)),
        db.insert(auditEvents).values({
          id: makeId("audit"),
          workspaceId: access.workspaceId,
          actorType: "client",
          actorId: access.clientId,
          action: "social_consent.revoked",
          targetType: "consent_grant",
          targetId: grant.id,
          riskLevel: "medium",
          outcome: "succeeded",
          metadataJson: "{}",
          occurredAt: now,
        }),
      ]);
      return Response.json({ id: grant.id, status: "revoked" });
    }

    return jsonError("Choose grant or revoke");
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to update consent",
      500,
    );
  }
}
