import { and, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../db";
import {
  auditEvents,
  consentGrants,
  projects,
  socialConnections,
  socialObservations,
} from "../db/schema";
import {
  captureObservation,
  runLearningCycle,
} from "./intelligence-engine";

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

function decodeBase64(value: string) {
  return Uint8Array.from(atob(value), (character) =>
    character.charCodeAt(0),
  );
}

async function decryptToken(value: string) {
  const payload = JSON.parse(value) as {
    version: number;
    iv: string;
    ciphertext: string;
  };
  if (payload.version !== 1) throw new Error("Unsupported social token version");
  const secretDigest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(String(env.SOCIAL_TOKEN_ENCRYPTION_KEY)),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    secretDigest,
    "AES-GCM",
    false,
    ["decrypt"],
  );
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64(payload.iv) },
    key,
    decodeBase64(payload.ciphertext),
  );
  return new TextDecoder().decode(plain);
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const stopWords = new Set([
  "a",
  "an",
  "and",
  "art",
  "for",
  "in",
  "of",
  "on",
  "the",
  "to",
  "tattoo",
  "with",
]);

function words(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9#]+/g, " ")
      .split(/\s+/)
      .map((word) => word.replace(/^#/, ""))
      .filter((word) => word.length >= 3 && !stopWords.has(word)),
  );
}

function projectMatch(
  caption: string,
  projectRows: Array<typeof projects.$inferSelect>,
) {
  const captionWords = words(caption);
  let best: { projectId: string | null; scoreBps: number; matches: string[] } = {
    projectId: null,
    scoreBps: 0,
    matches: [],
  };
  for (const project of projectRows) {
    let tags: string[] = [];
    try {
      tags = JSON.parse(project.styleTagsJson) as string[];
    } catch {
      tags = [];
    }
    const projectWords = words(
      [project.title, project.placement, project.summary, ...tags]
        .filter(Boolean)
        .join(" "),
    );
    const matches = [...projectWords].filter((word) =>
      captionWords.has(word),
    );
    const scoreBps = Math.min(
      10000,
      matches.length * 2200 +
        (projectWords.size > 0
          ? Math.round((matches.length / projectWords.size) * 3000)
          : 0),
    );
    if (scoreBps > best.scoreBps) {
      best = { projectId: project.id, scoreBps, matches };
    }
  }
  return best;
}

type InstagramMedia = {
  id: string;
  media_type?: string;
  caption?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

export async function syncSocialConnections(
  workspaceId: string,
  onlyConnectionId?: string | null,
) {
  const db = getDb();
  const connectionRows = await db
    .select()
    .from(socialConnections)
    .where(
      onlyConnectionId
        ? and(
            eq(socialConnections.workspaceId, workspaceId),
            eq(socialConnections.id, onlyConnectionId),
            eq(socialConnections.status, "connected"),
          )
        : and(
            eq(socialConnections.workspaceId, workspaceId),
            eq(socialConnections.status, "connected"),
          ),
    );
  let connectionsSynced = 0;
  let mediaObserved = 0;
  let projectMatches = 0;

  for (const connection of connectionRows) {
    if (!connection.encryptedTokenJson) continue;
    const grant = await db
      .select()
      .from(consentGrants)
      .where(
        and(
          eq(consentGrants.id, connection.consentGrantId),
          eq(consentGrants.clientId, connection.clientId),
          eq(consentGrants.status, "granted"),
        ),
      )
      .get();
    if (!grant) {
      await db
        .update(socialConnections)
        .set({ status: "consent_expired", updatedAt: new Date().toISOString() })
        .where(eq(socialConnections.id, connection.id));
      continue;
    }
    const scopes = JSON.parse(grant.scopesJson) as string[];
    if (!scopes.includes("media_metadata")) continue;

    try {
      const token = await decryptToken(connection.encryptedTokenJson);
      const mediaUrl = new URL("https://graph.instagram.com/me/media");
      mediaUrl.searchParams.set(
        "fields",
        "id,media_type,caption,permalink,timestamp,like_count,comments_count",
      );
      mediaUrl.searchParams.set("limit", "50");
      mediaUrl.searchParams.set("access_token", token);
      const response = await fetch(mediaUrl);
      if (!response.ok) {
        throw new Error(`Instagram media request returned ${response.status}`);
      }
      const payload = (await response.json()) as {
        data?: InstagramMedia[];
        paging?: { cursors?: { after?: string } };
      };
      const projectRows = await db
        .select()
        .from(projects)
        .where(eq(projects.clientId, connection.clientId));
      const now = new Date().toISOString();

      for (const media of payload.data ?? []) {
        const caption = media.caption || "";
        const match = scopes.includes("tattoo_post_detection")
          ? projectMatch(caption, projectRows)
          : { projectId: null, scoreBps: 0, matches: [] };
        const linkedProjectId =
          match.scoreBps >= 5000 ? match.projectId : null;
        const observationId = makeId("social_obs");
        const metrics = scopes.includes("engagement_metrics")
          ? {
              likes: Math.max(0, media.like_count ?? 0),
              comments: Math.max(0, media.comments_count ?? 0),
            }
          : {};
        const inserted = await db
          .insert(socialObservations)
          .values({
            id: observationId,
            workspaceId,
            connectionId: connection.id,
            consentGrantId: grant.id,
            clientId: connection.clientId,
            projectId: linkedProjectId,
            externalMediaId: media.id,
            mediaType: media.media_type || "MEDIA",
            permalinkHash: media.permalink
              ? await hash(media.permalink)
              : null,
            captionSummary: scopes.includes("caption_summary")
              ? `Matched ${match.matches.length} project term${match.matches.length === 1 ? "" : "s"}; raw caption not retained.`
              : null,
            tattooMatchBps: match.scoreBps,
            metricsJson: JSON.stringify(metrics),
            postedAt: media.timestamp ?? null,
            observedAt: now,
          })
          .onConflictDoNothing()
          .returning({ id: socialObservations.id })
          .get();
        if (!inserted) continue;
        await captureObservation(
          {
            workspaceId,
            projectId: linkedProjectId,
            clientId: connection.clientId,
            sourceType: "instagram_media",
            sourceId: media.id,
            category: "social_outcome",
            signalKey: `social.engagement:${(media.media_type || "media").toLowerCase()}`,
            value: {
              metrics,
              matchBps: match.scoreBps,
              matchedTerms: match.matches,
              rawCaptionRetained: false,
            },
            qualityBps: linkedProjectId ? 8000 : 5500,
            consentGrantId: grant.id,
            occurredAt: media.timestamp ?? now,
          },
          db,
        );
        mediaObserved += 1;
        if (linkedProjectId) projectMatches += 1;
      }

      await db
        .update(socialConnections)
        .set({
          lastSyncedAt: now,
          lastCursor: payload.paging?.cursors?.after ?? null,
          updatedAt: now,
        })
        .where(eq(socialConnections.id, connection.id));
      connectionsSynced += 1;
    } catch (error) {
      await db.insert(auditEvents).values({
        id: makeId("audit"),
        workspaceId,
        actorType: "agent",
        actorId: "social-observer",
        action: "social_connection.sync_failed",
        targetType: "social_connection",
        targetId: connection.id,
        riskLevel: "low",
        outcome: "failed",
        metadataJson: JSON.stringify({
          message:
            error instanceof Error ? error.message : "Unknown synchronization error",
          contentCaptured: false,
        }),
        occurredAt: new Date().toISOString(),
      });
    }
  }

  await db.insert(auditEvents).values({
    id: makeId("audit"),
    workspaceId,
    actorType: "agent",
    actorId: "social-observer",
    action: "social_connections.synchronized",
    targetType: "workspace",
    targetId: workspaceId,
    riskLevel: "low",
    outcome: "succeeded",
    metadataJson: JSON.stringify({
      connectionsSynced,
      mediaObserved,
      projectMatches,
      rawCaptionsRetained: false,
    }),
    occurredAt: new Date().toISOString(),
  });
  if (mediaObserved > 0) {
    await runLearningCycle(workspaceId, "social_evidence");
  }

  return { connectionsSynced, mediaObserved, projectMatches };
}
