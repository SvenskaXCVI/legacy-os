import { and, eq, gt } from "drizzle-orm";
import { getDb } from "../../db";
import { portalInvitations } from "../../db/schema";

export const WORKSPACE_ID = "legacy-lines";

export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function actorFrom(request: Request) {
  return (
    request.headers.get("oai-authenticated-user-email") ??
    "local-owner@legacy.local"
  );
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
