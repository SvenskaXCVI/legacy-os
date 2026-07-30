import { and, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../../db";
import {
  auditEvents,
  consentGrants,
  socialConnections,
} from "../../../../../db/schema";
import { jsonError, makeId, WORKSPACE_ID } from "../../../_lib";
import { syncSocialConnections } from "../../../../../lib/social-sync";

type StatePayload = {
  clientId: string;
  grantId: string;
  expiresAt: number;
  nonce: string;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(
    normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="),
  );
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function encodeBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

async function verifyState(value: string) {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(env.SOCIAL_TOKEN_ENCRYPTION_KEY)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    decodeBase64Url(signature),
    new TextEncoder().encode(payload),
  );
  if (!valid) return null;
  const parsed = JSON.parse(
    new TextDecoder().decode(decodeBase64Url(payload)),
  ) as StatePayload;
  if (
    !parsed.clientId ||
    !parsed.grantId ||
    !parsed.expiresAt ||
    parsed.expiresAt < Date.now()
  ) {
    return null;
  }
  return parsed;
}

async function encryptToken(token: string) {
  const secretDigest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(String(env.SOCIAL_TOKEN_ENCRYPTION_KEY)),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    secretDigest,
    "AES-GCM",
    false,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token),
  );
  return JSON.stringify({
    version: 1,
    algorithm: "AES-GCM",
    iv: encodeBase64(iv),
    ciphertext: encodeBase64(new Uint8Array(encrypted)),
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) return jsonError("Instagram callback is incomplete");
    const verifiedState = await verifyState(state);
    if (!verifiedState) return jsonError("Instagram state is invalid or expired", 401);

    const db = getDb();
    const grant = await db
      .select()
      .from(consentGrants)
      .where(
        and(
          eq(consentGrants.id, verifiedState.grantId),
          eq(consentGrants.clientId, verifiedState.clientId),
          eq(consentGrants.status, "granted"),
        ),
      )
      .get();
    if (!grant) return jsonError("Client consent is no longer active", 403);

    const form = new FormData();
    form.set("client_id", String(env.INSTAGRAM_CLIENT_ID));
    form.set("client_secret", String(env.INSTAGRAM_CLIENT_SECRET));
    form.set("grant_type", "authorization_code");
    form.set("redirect_uri", String(env.INSTAGRAM_REDIRECT_URI));
    form.set("code", code);
    const exchange = await fetch(
      "https://api.instagram.com/oauth/access_token",
      { method: "POST", body: form },
    );
    if (!exchange.ok) throw new Error("Instagram authorization exchange failed");
    const short = (await exchange.json()) as {
      access_token: string;
      user_id: string | number;
    };
    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set(
      "client_secret",
      String(env.INSTAGRAM_CLIENT_SECRET),
    );
    longUrl.searchParams.set("access_token", short.access_token);
    const longResponse = await fetch(longUrl);
    const long = longResponse.ok
      ? ((await longResponse.json()) as {
          access_token: string;
          expires_in?: number;
        })
      : { access_token: short.access_token, expires_in: 3600 };

    const profileUrl = new URL("https://graph.instagram.com/me");
    profileUrl.searchParams.set("fields", "user_id,username,account_type");
    profileUrl.searchParams.set("access_token", long.access_token);
    const profileResponse = await fetch(profileUrl);
    if (!profileResponse.ok) throw new Error("Instagram profile lookup failed");
    const profile = (await profileResponse.json()) as {
      user_id?: string;
      id?: string;
      username?: string;
      account_type?: string;
    };
    const externalAccountId = String(
      profile.user_id || profile.id || short.user_id,
    );
    const now = new Date().toISOString();
    const connectionId = makeId("social");
    const encryptedTokenJson = await encryptToken(long.access_token);
    const tokenExpiresAt = long.expires_in
      ? new Date(Date.now() + long.expires_in * 1000).toISOString()
      : null;
    await db.batch([
      db
        .insert(socialConnections)
        .values({
          id: connectionId,
          workspaceId: WORKSPACE_ID,
          clientId: verifiedState.clientId,
          consentGrantId: grant.id,
          platform: "instagram",
          externalAccountId,
          handle: profile.username ?? null,
          accountType: profile.account_type ?? "professional",
          scopesJson: JSON.stringify([
            "instagram_business_basic",
            "instagram_business_manage_insights",
          ]),
          encryptedTokenJson,
          tokenExpiresAt,
          status: "connected",
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            socialConnections.workspaceId,
            socialConnections.platform,
            socialConnections.externalAccountId,
          ],
          set: {
            clientId: verifiedState.clientId,
            consentGrantId: grant.id,
            handle: profile.username ?? null,
            accountType: profile.account_type ?? "professional",
            encryptedTokenJson,
            tokenExpiresAt,
            status: "connected",
            updatedAt: now,
          },
        }),
      db.insert(auditEvents).values({
        id: makeId("audit"),
        workspaceId: WORKSPACE_ID,
        actorType: "client",
        actorId: verifiedState.clientId,
        action: "social_connection.created",
        targetType: "social_connection",
        targetId: connectionId,
        riskLevel: "medium",
        outcome: "succeeded",
        metadataJson: JSON.stringify({
          platform: "instagram",
          grantId: grant.id,
          scopes: [
            "instagram_business_basic",
            "instagram_business_manage_insights",
          ],
        }),
        occurredAt: now,
      }),
    ]);
    const connected = await db
      .select({ id: socialConnections.id })
      .from(socialConnections)
      .where(
        and(
          eq(socialConnections.workspaceId, WORKSPACE_ID),
          eq(socialConnections.platform, "instagram"),
          eq(socialConnections.externalAccountId, externalAccountId),
        ),
      )
      .get();
    if (connected) {
      await syncSocialConnections(WORKSPACE_ID, connected.id);
    }

    return Response.redirect(
      `${url.origin}/?social=connected`,
      303,
    );
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Unable to connect Instagram",
      500,
    );
  }
}
