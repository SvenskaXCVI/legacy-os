import { and, desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { consentGrants } from "../../../../db/schema";
import {
  authConfiguration,
  jsonError,
  resolveClientAccess,
} from "../../_lib";

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function signedState(payload: Record<string, unknown>) {
  const encoded = base64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(env.SOCIAL_TOKEN_ENCRYPTION_KEY)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encoded),
  );
  return `${encoded}.${base64Url(new Uint8Array(signature))}`;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    token?: string;
  };
  const access = await resolveClientAccess(request, payload.token ?? null);
  if (!access) return jsonError("Verified client access is required", 401);
  const config = authConfiguration();
  if (!config.instagramConnection) {
    return Response.json(
      {
        status: "configuration_required",
        message:
          "Instagram connection requires a Meta app, client secret, approved redirect URI, token-encryption key, and a professional Business or Creator account. No social data is accessed until those controls and client consent are active.",
      },
      { status: 503 },
    );
  }
  const db = getDb();
  const grant = await db
    .select()
    .from(consentGrants)
    .where(
      and(
        eq(consentGrants.clientId, access.clientId),
        eq(consentGrants.consentType, "instagram_observation"),
        eq(consentGrants.status, "granted"),
      ),
    )
    .orderBy(desc(consentGrants.grantedAt))
    .get();
  if (!grant) {
    return jsonError(
      "Grant Instagram observation permission before connecting an account",
      403,
    );
  }

  const scopes = [
    "instagram_business_basic",
    "instagram_business_manage_insights",
  ];
  const state = await signedState({
    clientId: access.clientId,
    grantId: grant.id,
    expiresAt: Date.now() + 10 * 60 * 1000,
    nonce: crypto.randomUUID(),
  });
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("enable_fb_login", "0");
  url.searchParams.set("force_authentication", "1");
  url.searchParams.set("client_id", String(env.INSTAGRAM_CLIENT_ID));
  url.searchParams.set("redirect_uri", String(env.INSTAGRAM_REDIRECT_URI));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(","));
  url.searchParams.set("state", state);
  return Response.json({
    status: "authorization_required",
    authorizationUrl: url.toString(),
    scopes,
    notice:
      "Instagram authorization is requested only for the active client consent grant.",
  });
}

