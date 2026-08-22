import { and, eq, isNull } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../db";
import { auditEvents, connectorAccounts, connectorDefinitions, connectorOauthStates } from "../db/schema";

type Db = ReturnType<typeof getDb>;
export type GoogleConnectorKey = "gmail" | "google_calendar";

const GOOGLE_SCOPES: Record<GoogleConnectorKey, string[]> = {
  gmail: ["openid", "email", "https://www.googleapis.com/auth/gmail.send"],
  google_calendar: ["openid", "email", "https://www.googleapis.com/auth/calendar.events"],
};

const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
};
const base64UrlToBytes = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
};
const encodeJson = (value: unknown) => bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
const decodeJson = <T>(value: string) => JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as T;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function oauthConfiguration() {
  const clientId = String(env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = String(env.GOOGLE_CLIENT_SECRET || "").trim();
  const redirectUri = String(env.GOOGLE_REDIRECT_URI || "").trim();
  const encryptionKey = String(env.CONNECTOR_TOKEN_ENCRYPTION_KEY || "").trim();
  const stateSecret = String(env.CONNECTOR_OAUTH_STATE_SECRET || "").trim();
  return { clientId, clientSecret, redirectUri, encryptionKey, stateSecret, configured: Boolean(clientId && clientSecret && redirectUri && encryptionKey && stateSecret.length >= 32) };
}

function keyBytes(value: string) {
  const bytes = /^[a-f0-9]{64}$/i.test(value)
    ? Uint8Array.from(value.match(/.{2}/g) || [], (pair) => Number.parseInt(pair, 16))
    : Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  if (bytes.length !== 32) throw new Error("Connector token encryption key must decode to exactly 32 bytes");
  return bytes;
}

async function encryptionKey() {
  const configuration = oauthConfiguration();
  if (!configuration.encryptionKey) throw new Error("Connector token encryption is not configured");
  return crypto.subtle.importKey("raw", keyBytes(configuration.encryptionKey), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptCredential(value: Record<string, unknown>) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), new TextEncoder().encode(JSON.stringify(value)));
  return JSON.stringify({ version: 1, iv: bytesToBase64Url(iv), ciphertext: bytesToBase64Url(new Uint8Array(encrypted)) });
}

async function decryptCredential(value: string) {
  const envelope = JSON.parse(value) as { version: number; iv: string; ciphertext: string };
  if (envelope.version !== 1) throw new Error("Unsupported connector credential version");
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64UrlToBytes(envelope.iv) }, await encryptionKey(), base64UrlToBytes(envelope.ciphertext));
  return JSON.parse(new TextDecoder().decode(decrypted)) as { accessToken: string; refreshToken?: string; tokenType: string };
}

async function signState(payload: string) {
  const secret = oauthConfiguration().stateSecret;
  if (!secret) throw new Error("Connector OAuth state signing is not configured");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}

async function verifyState(state: string) {
  const [payload, signature, extra] = state.split(".");
  if (!payload || !signature || extra) throw new Error("Invalid Google OAuth state");
  const secret = oauthConfiguration().stateSecret;
  if (!secret) throw new Error("Connector OAuth state signing is not configured");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("HMAC", key, base64UrlToBytes(signature), new TextEncoder().encode(payload));
  if (!valid) throw new Error("Invalid Google OAuth state signature");
  const parsed = decodeJson<{ version: number; workspaceId: string; connectorKey: GoogleConnectorKey; nonce: string; expiresAt: number }>(payload);
  if (parsed.version !== 1 || !GOOGLE_SCOPES[parsed.connectorKey] || parsed.expiresAt <= Date.now()) throw new Error("Google OAuth state is invalid or expired");
  return parsed;
}

export function googleOAuthConfigured() {
  return oauthConfiguration().configured;
}

export async function createGoogleAuthorization(input: { workspaceId: string; connectorKey: GoogleConnectorKey; requestedBy?: string | null }, db: Db = getDb()) {
  const configuration = oauthConfiguration();
  if (!configuration.configured) throw new Error("Google OAuth requires client, redirect, encryption, and state-signing configuration");
  keyBytes(configuration.encryptionKey);
  const redirect = new URL(configuration.redirectUri);
  const localRedirect = redirect.hostname === "localhost" || redirect.hostname === "127.0.0.1";
  if (redirect.protocol !== "https:" && !localRedirect) throw new Error("Google OAuth redirect URI must use HTTPS outside local development");
  const nonce = crypto.randomUUID();
  const expiresAt = Date.now() + 10 * 60_000;
  const stateRecord = { version: 1, workspaceId: input.workspaceId, connectorKey: input.connectorKey, nonce, expiresAt };
  const payload = encodeJson(stateRecord);
  const state = `${payload}.${await signState(payload)}`;
  const now = new Date().toISOString();
  await db.insert(connectorOauthStates).values({ id: makeId("oauth_state"), workspaceId: input.workspaceId, connectorKey: input.connectorKey, nonceHash: await sha256(nonce), requestedBy: input.requestedBy ?? null, expiresAt: new Date(expiresAt).toISOString(), createdAt: now });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", configuration.clientId);
  url.searchParams.set("redirect_uri", configuration.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", GOOGLE_SCOPES[input.connectorKey].join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

type GoogleTokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number; token_type?: string; scope?: string; error?: string; error_description?: string };

async function exchangeToken(body: URLSearchParams) {
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  const result = await response.json() as GoogleTokenResponse;
  if (!response.ok || !result.access_token) throw new Error(result.error_description || result.error || "Google token exchange failed");
  return result;
}

export async function completeGoogleAuthorization(input: { code: string; state: string }, db: Db = getDb()) {
  const parsed = await verifyState(input.state);
  const stateRow = await db.select().from(connectorOauthStates).where(and(eq(connectorOauthStates.workspaceId, parsed.workspaceId), eq(connectorOauthStates.connectorKey, parsed.connectorKey), eq(connectorOauthStates.nonceHash, await sha256(parsed.nonce)), isNull(connectorOauthStates.consumedAt))).get();
  if (!stateRow || new Date(stateRow.expiresAt).getTime() <= Date.now()) throw new Error("Google OAuth state has expired or was already used");
  const configuration = oauthConfiguration();
  const token = await exchangeToken(new URLSearchParams({ code: input.code, client_id: configuration.clientId, client_secret: configuration.clientSecret, redirect_uri: configuration.redirectUri, grant_type: "authorization_code" }));
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${token.access_token}` } });
  const profile = await profileResponse.json() as { sub?: string; email?: string; name?: string; error?: string };
  if (!profileResponse.ok || !profile.sub || !profile.email) throw new Error(profile.error || "Unable to verify the connected Google identity");
  const now = new Date().toISOString();
  const existing = await db.select().from(connectorAccounts).where(and(eq(connectorAccounts.workspaceId, parsed.workspaceId), eq(connectorAccounts.connectorKey, parsed.connectorKey))).get();
  const accountId = existing?.id || makeId("connector_account");
  let priorRefreshToken: string | undefined;
  if (existing?.encryptedCredentialJson) {
    try { priorRefreshToken = (await decryptCredential(existing.encryptedCredentialJson)).refreshToken; } catch { priorRefreshToken = undefined; }
  }
  const refreshToken = token.refresh_token || priorRefreshToken;
  if (!refreshToken) throw new Error("Google did not provide an offline refresh token; reconnect and grant offline access");
  const values = {
    provider: "google", providerAccountId: profile.sub, accountEmail: profile.email, displayName: profile.name || profile.email,
    encryptedCredentialJson: await encryptCredential({ accessToken: token.access_token, refreshToken, tokenType: token.token_type || "Bearer" }),
    grantedScopesJson: JSON.stringify((token.scope || GOOGLE_SCOPES[parsed.connectorKey].join(" ")).split(" ").filter(Boolean)),
    tokenExpiresAt: new Date(Date.now() + (token.expires_in || 3600) * 1000).toISOString(), status: "connected", lastValidatedAt: now,
    lastErrorSummary: null, connectedBy: stateRow.requestedBy, connectedAt: existing?.connectedAt || now, revokedAt: null, updatedAt: now,
  };
  await db.batch([
    db.insert(connectorAccounts).values({ id: accountId, workspaceId: parsed.workspaceId, connectorKey: parsed.connectorKey, ...values, createdAt: existing?.createdAt || now }).onConflictDoUpdate({ target: [connectorAccounts.workspaceId, connectorAccounts.connectorKey], set: values }),
    db.update(connectorOauthStates).set({ consumedAt: now }).where(eq(connectorOauthStates.id, stateRow.id)),
    db.update(connectorDefinitions).set({ credentialState: "encrypted_oauth", status: "available", healthStatus: "healthy", lastCheckedAt: now, lastSuccessAt: now, lastErrorSummary: null, updatedAt: now }).where(and(eq(connectorDefinitions.workspaceId, parsed.workspaceId), eq(connectorDefinitions.connectorKey, parsed.connectorKey))),
    db.insert(auditEvents).values({ id: makeId("audit"), workspaceId: parsed.workspaceId, actorType: "owner", actorId: stateRow.requestedBy, action: "connector.oauth_connected", targetType: "connector_account", targetId: accountId, riskLevel: "high", outcome: "succeeded", metadataJson: JSON.stringify({ connectorKey: parsed.connectorKey, provider: "google", accountEmail: profile.email, credentialCaptured: false }), occurredAt: now }),
  ]);
  return { workspaceId: parsed.workspaceId, connectorKey: parsed.connectorKey, accountEmail: profile.email };
}

export async function getGoogleAccessToken(workspaceId: string, connectorKey: GoogleConnectorKey, db: Db = getDb()) {
  const account = await db.select().from(connectorAccounts).where(and(eq(connectorAccounts.workspaceId, workspaceId), eq(connectorAccounts.connectorKey, connectorKey), eq(connectorAccounts.status, "connected"))).get();
  if (!account?.encryptedCredentialJson) throw new Error(`${connectorKey === "gmail" ? "Gmail" : "Google Calendar"} is not connected`);
  const credential = await decryptCredential(account.encryptedCredentialJson);
  if (account.tokenExpiresAt && new Date(account.tokenExpiresAt).getTime() > Date.now() + 60_000) return credential.accessToken;
  if (!credential.refreshToken) throw new Error("Google offline access is unavailable; reconnect this account");
  const configuration = oauthConfiguration();
  try {
    const token = await exchangeToken(new URLSearchParams({ refresh_token: credential.refreshToken, client_id: configuration.clientId, client_secret: configuration.clientSecret, grant_type: "refresh_token" }));
    const now = new Date().toISOString();
    await db.batch([
      db.update(connectorAccounts).set({ encryptedCredentialJson: await encryptCredential({ accessToken: token.access_token, refreshToken: credential.refreshToken, tokenType: token.token_type || credential.tokenType }), tokenExpiresAt: new Date(Date.now() + (token.expires_in || 3600) * 1000).toISOString(), lastRefreshedAt: now, lastValidatedAt: now, lastErrorSummary: null, updatedAt: now }).where(eq(connectorAccounts.id, account.id)),
      db.update(connectorDefinitions).set({ healthStatus: "healthy", lastCheckedAt: now, lastSuccessAt: now, lastErrorSummary: null, updatedAt: now }).where(and(eq(connectorDefinitions.workspaceId, workspaceId), eq(connectorDefinitions.connectorKey, connectorKey))),
    ]);
    return token.access_token!;
  } catch (error) {
    const summary = error instanceof Error ? error.message : "Google token refresh failed";
    const now = new Date().toISOString();
    await db.batch([
      db.update(connectorAccounts).set({ status: "attention_required", lastErrorSummary: summary, updatedAt: now }).where(eq(connectorAccounts.id, account.id)),
      db.update(connectorDefinitions).set({ status: "configuration_required", healthStatus: "degraded", lastCheckedAt: now, lastErrorSummary: summary, updatedAt: now }).where(and(eq(connectorDefinitions.workspaceId, workspaceId), eq(connectorDefinitions.connectorKey, connectorKey))),
    ]);
    throw error;
  }
}

const sanitizeHeader = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

export async function sendGmailMessage(input: { workspaceId: string; to: string; subject: string; body: string }, db: Db = getDb()) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.to)) throw new Error("A valid client email address is required");
  const subject = sanitizeHeader(input.subject).slice(0, 200);
  const body = input.body.trim();
  if (!subject || !body) throw new Error("Approved email subject and body are required");
  const raw = [`To: ${sanitizeHeader(input.to)}`, `Subject: ${subject}`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: 8bit", "", body].join("\r\n");
  const accessToken = await getGoogleAccessToken(input.workspaceId, "gmail", db);
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" }, body: JSON.stringify({ raw: bytesToBase64Url(new TextEncoder().encode(raw)) }) });
  const result = await response.json() as { id?: string; threadId?: string; error?: { message?: string } };
  if (!response.ok || !result.id) throw new Error(result.error?.message || "Gmail delivery failed");
  return { id: result.id, threadId: result.threadId || null };
}

export async function createGoogleCalendarEvent(input: { workspaceId: string; idempotencyKey: string; summary: string; description?: string | null; location?: string | null; startsAt: string; endsAt: string; projectId?: string | null; clientId?: string | null }, db: Db = getDb()) {
  const start = new Date(input.startsAt); const end = new Date(input.endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new Error("A valid calendar start and end are required");
  const accessToken = await getGoogleAccessToken(input.workspaceId, "google_calendar", db);
  const eventId = (await sha256(`legacy-calendar:${input.workspaceId}:${input.idempotencyKey}`)).slice(0, 40);
  const calendarId = encodeURIComponent(String(env.GOOGLE_CALENDAR_ID || "primary").trim() || "primary");
  const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?sendUpdates=none`;
  const event = { id: eventId, summary: sanitizeHeader(input.summary).slice(0, 300), description: input.description?.slice(0, 2000) || undefined, location: input.location?.slice(0, 500) || undefined, start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() }, extendedProperties: { private: { legacyWorkspaceId: input.workspaceId, legacyProjectId: input.projectId || "", legacyClientId: input.clientId || "" } } };
  const response = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" }, body: JSON.stringify(event) });
  if (response.status === 409) return { id: eventId, reused: true };
  const result = await response.json() as { id?: string; htmlLink?: string; error?: { message?: string } };
  if (!response.ok || !result.id) throw new Error(result.error?.message || "Google Calendar event creation failed");
  return { id: result.id, htmlLink: result.htmlLink || null, reused: false };
}

export async function disconnectGoogleConnector(workspaceId: string, connectorKey: GoogleConnectorKey, db: Db = getDb()) {
  const account = await db.select().from(connectorAccounts).where(and(eq(connectorAccounts.workspaceId, workspaceId), eq(connectorAccounts.connectorKey, connectorKey))).get();
  if (!account) return false;
  try {
    const credential = await decryptCredential(account.encryptedCredentialJson);
    if (credential.refreshToken || credential.accessToken) await fetch("https://oauth2.googleapis.com/revoke", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: credential.refreshToken || credential.accessToken }) });
  } catch { /* Local revocation still removes usable credentials. */ }
  const now = new Date().toISOString();
  await db.batch([
    db.update(connectorAccounts).set({ encryptedCredentialJson: "", status: "revoked", revokedAt: now, tokenExpiresAt: null, updatedAt: now }).where(eq(connectorAccounts.id, account.id)),
    db.update(connectorDefinitions).set({ credentialState: "missing", status: "configuration_required", healthStatus: "not_connected", lastCheckedAt: now, updatedAt: now }).where(and(eq(connectorDefinitions.workspaceId, workspaceId), eq(connectorDefinitions.connectorKey, connectorKey))),
    db.insert(auditEvents).values({ id: makeId("audit"), workspaceId, actorType: "owner", action: "connector.oauth_disconnected", targetType: "connector_account", targetId: account.id, riskLevel: "high", outcome: "succeeded", metadataJson: JSON.stringify({ connectorKey, provider: "google", credentialRetained: false }), occurredAt: now }),
  ]);
  return true;
}
