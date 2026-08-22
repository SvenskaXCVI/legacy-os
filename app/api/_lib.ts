import { and, eq, gt, or } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../db";
import {
  clients,
  portalInvitations,
  users,
} from "../../db/schema";

export const WORKSPACE_ID = "legacy-lines";
export const OWNER_SESSION_COOKIE = "legacy_owner_session";
const OWNER_SESSION_TTL_SECONDS = 12 * 60 * 60;

export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function actorFrom(request: Request) {
  return (
    request.headers.get("oai-authenticated-user-email") ??
    "local-owner@legacy.local"
  );
}

type SupabaseIdentity = {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  app_metadata?: { provider?: string; providers?: string[] };
};

export function authConfiguration() {
  const supabase =
    Boolean(env.SUPABASE_URL?.trim()) && Boolean(env.SUPABASE_ANON_KEY?.trim());
  const ownerAccessCode = Boolean(env.OWNER_ACCESS_CODE_HASH?.trim());
  const ownerAllowlistConfigured = ownerAllowlist().size > 0;
  return {
    mode: supabase
      ? "supabase"
      : ownerAccessCode
        ? "access_code"
        : "private_preview",
    email: supabase,
    emailVerification: supabase,
    totpMfa: supabase,
    google: supabase,
    apple: supabase,
    instagramIdentity: false,
    instagramConnection:
      Boolean(env.INSTAGRAM_CLIENT_ID?.trim()) &&
      Boolean(env.INSTAGRAM_CLIENT_SECRET?.trim()) &&
      Boolean(env.INSTAGRAM_REDIRECT_URI?.trim()) &&
      Boolean(env.SOCIAL_TOKEN_ENCRYPTION_KEY?.trim()),
    ownerAllowlistConfigured,
    ownerAccessCode,
    externalClientReady:
      (supabase && ownerAllowlistConfigured) || ownerAccessCode,
  };
}

async function supabaseIdentity(request: Request) {
  if (authConfiguration().mode !== "supabase") return null;
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      authorization,
      apikey: String(env.SUPABASE_ANON_KEY),
    },
  });
  if (!response.ok) return null;
  return (await response.json()) as SupabaseIdentity;
}

function bearerAssuranceLevel(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    return (JSON.parse(decoded) as { aal?: string }).aal ?? null;
  } catch {
    return null;
  }
}

function ownerAllowlist() {
  return new Set(
    String(env.OWNER_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function resolveUser(request: Request) {
  const db = getDb();
  const identity = await supabaseIdentity(request);
  if (identity) {
    const email = identity.email?.trim().toLowerCase();
    const user = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.authSubject, identity.id),
          email ? eq(users.email, email) : eq(users.authSubject, identity.id),
        ),
      )
      .get();
    const boundUser =
      user?.authSubject === identity.id &&
      (user.role !== "owner" || (email ? ownerAllowlist().has(email) : false))
        ? user
        : null;
    return {
      identity,
      user: boundUser,
      emailVerified: Boolean(identity.email_confirmed_at),
      assuranceLevel: bearerAssuranceLevel(request),
    };
  }

  const configuration = authConfiguration();
  if (
    configuration.mode === "private_preview" ||
    configuration.mode === "access_code"
  ) {
    const url = new URL(request.url);
    const localPreview = ["localhost", "127.0.0.1", "::1"].includes(
      url.hostname,
    );
    const platformEmail = request.headers
      .get("oai-authenticated-user-email")
      ?.trim()
      .toLowerCase();
    const codeSession =
      configuration.mode === "access_code" &&
      (await hasValidOwnerSession(request));
    if (!localPreview && !platformEmail && !codeSession) return null;
    const allowlist = ownerAllowlist();
    if (
      platformEmail &&
      allowlist.size > 0 &&
      !allowlist.has(platformEmail) &&
      !codeSession
    ) {
      return null;
    }
    const email =
      platformEmail ||
      [...allowlist][0] ||
      "owner-access@legacy.local";
    const user = await db
      .select()
      .from(users)
      .where(
        and(eq(users.workspaceId, WORKSPACE_ID), eq(users.email, email)),
      )
      .get();
    return {
      identity: null,
      user:
        user ??
        ({
          id: email,
          workspaceId: WORKSPACE_ID,
          email,
          displayName: displayNameFrom(request),
          role: "owner",
          status: "active",
          clientId: null,
          mfaRequired: false,
        } as typeof users.$inferSelect),
      emailVerified: true,
      assuranceLevel: "aal2",
    };
  }
  return null;
}

export async function requireOwner(request: Request) {
  const access = await resolveUser(request);
  if (
    !access?.user ||
    access.user.role !== "owner" ||
    access.user.status !== "active" ||
    !access.emailVerified ||
    (authConfiguration().mode === "supabase" &&
      access.user.mfaRequired &&
      access.assuranceLevel !== "aal2")
  ) {
    throw new Response(
      JSON.stringify({ error: "Verified owner access is required" }),
      { status: 403, headers: { "content-type": "application/json" } },
    );
  }
  return access;
}

export async function resolveClientAccess(
  request: Request,
  token: string | null,
) {
  const invitation = await validatePortalToken(token);
  if (invitation) {
    return {
      workspaceId: invitation.workspaceId,
      clientId: invitation.clientId,
      invitation,
      user: null,
    };
  }
  const access = await resolveUser(request);
  if (
    access?.user?.role === "client" &&
    access.user.status === "active" &&
    access.user.clientId &&
    access.emailVerified &&
    (authConfiguration().mode !== "supabase" ||
      !access.user.mfaRequired ||
      access.assuranceLevel === "aal2")
  ) {
    return {
      workspaceId: access.user.workspaceId,
      clientId: access.user.clientId,
      invitation: null,
      user: access.user,
    };
  }
  return null;
}

export async function bootstrapAuthenticatedUser(
  request: Request,
  invitationToken?: string | null,
) {
  const identity = await supabaseIdentity(request);
  if (!identity?.id || !identity.email || !identity.email_confirmed_at) {
    throw new Response(
      JSON.stringify({ error: "Verify your email before continuing" }),
      { status: 403, headers: { "content-type": "application/json" } },
    );
  }
  const db = getDb();
  const email = identity.email.toLowerCase();
  const now = new Date().toISOString();
  const existing = await db
    .select()
    .from(users)
    .where(
      or(eq(users.authSubject, identity.id), eq(users.email, email)),
    )
    .get();
  if (existing) {
    if (existing.role === "owner" && !ownerAllowlist().has(email)) {
      throw new Response(
        JSON.stringify({
          error: "This verified email is not authorized as an owner",
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      );
    }
    if (
      existing.authSubject &&
      existing.authSubject !== identity.id
    ) {
      throw new Response(
        JSON.stringify({
          error: "This account is already bound to another identity",
        }),
        { status: 409, headers: { "content-type": "application/json" } },
      );
    }
    if (existing.role === "client" && !existing.authSubject) {
      const invitation = await validatePortalToken(invitationToken ?? null);
      if (
        !invitation ||
        invitation.clientId !== existing.clientId ||
        invitation.workspaceId !== existing.workspaceId
      ) {
        throw new Response(
          JSON.stringify({
            error:
              "Binding this client account requires its active studio invitation",
          }),
          { status: 403, headers: { "content-type": "application/json" } },
        );
      }
    }
    await db
      .update(users)
      .set({
        authSubject: identity.id,
        emailVerifiedAt: identity.email_confirmed_at,
        lastLoginAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, existing.id));
    return { ...existing, authSubject: identity.id };
  }

  const provider =
    identity.app_metadata?.provider ||
    identity.app_metadata?.providers?.[0] ||
    "email";
  if (ownerAllowlist().has(email)) {
    const id = makeId("usr");
    const owner = {
      id,
      workspaceId: WORKSPACE_ID,
      email,
      displayName: email.split("@")[0],
      role: "owner",
      authSubject: identity.id,
      authProvider: provider,
      clientId: null,
      emailVerifiedAt: identity.email_confirmed_at,
      mfaRequired: true,
      lastLoginAt: now,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(users).values(owner);
    return owner;
  }

  const invitation = await validatePortalToken(invitationToken ?? null);
  if (!invitation) {
    throw new Response(
      JSON.stringify({
        error:
          "Client registration requires an active invitation from the studio",
      }),
      { status: 403, headers: { "content-type": "application/json" } },
    );
  }
  const client = await db
    .select()
    .from(clients)
    .where(eq(clients.id, invitation.clientId))
    .get();
  if (!client?.email || client.email.toLowerCase() !== email) {
    throw new Response(
      JSON.stringify({
        error: "This verified email does not match the invited client",
      }),
      { status: 403, headers: { "content-type": "application/json" } },
    );
  }
  const id = makeId("usr");
  const clientUser = {
    id,
    workspaceId: invitation.workspaceId,
    email,
    displayName:
      client.preferredName ||
      client.displayName ||
      `${client.firstName} ${client.lastName}`.trim(),
    role: "client",
    authSubject: identity.id,
    authProvider: provider,
    clientId: client.id,
    emailVerifiedAt: identity.email_confirmed_at,
    mfaRequired: true,
    lastLoginAt: now,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  await db.batch([
    db.insert(users).values(clientUser),
    db
      .update(portalInvitations)
      .set({ status: "redeemed", lastUsedAt: now })
      .where(eq(portalInvitations.id, invitation.id)),
  ]);
  return clientUser;
}

export function displayNameFrom(request: Request) {
  const encoded = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get(
    "oai-authenticated-user-full-name-encoding",
  );
  if (encoded && encoding === "percent-encoded-utf-8") {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return actorFrom(request).split("@")[0];
    }
  }
  return actorFrom(request).split("@")[0];
}

export async function sha256(value: string | ArrayBuffer) {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function ownerCodeHash() {
  return String(env.OWNER_ACCESS_CODE_HASH || "").trim().toLowerCase();
}

export async function verifyOwnerAccessCode(code: string) {
  const expected = ownerCodeHash();
  if (!expected || !/^[a-f0-9]{64}$/.test(expected)) return false;
  return constantTimeEqual(await sha256(code), expected);
}

function encodeBase64Url(value: string | ArrayBuffer) {
  const bytes =
    typeof value === "string"
      ? new TextEncoder().encode(value)
      : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(
    normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="),
  );
  return new TextDecoder().decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
}

async function signOwnerSession(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ownerCodeHash()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return encodeBase64Url(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)),
  );
}

export async function createOwnerSessionToken() {
  if (!ownerCodeHash()) throw new Error("Owner access is not configured");
  const payload = encodeBase64Url(
    JSON.stringify({
      version: 1,
      expiresAt: Math.floor(Date.now() / 1000) + OWNER_SESSION_TTL_SECONDS,
      nonce: crypto.randomUUID(),
    }),
  );
  return `${payload}.${await signOwnerSession(payload)}`;
}

export async function hasValidOwnerSession(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${OWNER_SESSION_COOKIE}=`))
    ?.slice(OWNER_SESSION_COOKIE.length + 1);
  if (!token || !ownerCodeHash()) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  const expected = await signOwnerSession(payload);
  if (!constantTimeEqual(signature, expected)) return false;
  try {
    const decoded = JSON.parse(decodeBase64Url(payload)) as {
      version?: number;
      expiresAt?: number;
    };
    return (
      decoded.version === 1 &&
      typeof decoded.expiresAt === "number" &&
      decoded.expiresAt > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export function ownerSessionCookie(token: string) {
  return `${OWNER_SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${OWNER_SESSION_TTL_SECONDS}`;
}

export function clearOwnerSessionCookie() {
  return `${OWNER_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function validatePortalToken(token: string | null) {
  if (!token) return null;
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const db = getDb();
  const invitation = await db
    .select()
    .from(portalInvitations)
    .where(
      and(
        eq(portalInvitations.tokenHash, tokenHash),
        eq(portalInvitations.status, "active"),
        gt(portalInvitations.expiresAt, now),
      ),
    )
    .get();
  return invitation ?? null;
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function routeError(
  error: unknown,
  fallback: string,
  status = 500,
) {
  if (error instanceof Response) return error;
  return jsonError(error instanceof Error ? error.message : fallback, status);
}
