import { getDb } from "../../../../db";
import { auditEvents } from "../../../../db/schema";
import {
  clearOwnerSessionCookie,
  createOwnerSessionToken,
  authConfiguration,
  hasValidOwnerSession,
  makeId,
  ownerSessionCookie,
  sha256,
  verifyOwnerAccessCode,
  WORKSPACE_ID,
} from "../../_lib";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetsAt: number }>();

function requestKey(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  if (origin === "null") {
    const fetchSite = request.headers.get("sec-fetch-site");
    return !fetchSite || fetchSite === "same-origin" || fetchSite === "none";
  }
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetsAt <= now) {
    attempts.set(key, { count: 0, resetsAt: now + WINDOW_MS });
    return false;
  }
  return current.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string) {
  const current = attempts.get(key) || {
    count: 0,
    resetsAt: Date.now() + WINDOW_MS,
  };
  attempts.set(key, { ...current, count: current.count + 1 });
}

async function audit(request: Request, outcome: "success" | "denied") {
  try {
    const ip = requestKey(request);
    const userAgent = request.headers.get("user-agent") || "unknown";
    await getDb()
      .insert(auditEvents)
      .values({
        id: makeId("audit"),
        workspaceId: WORKSPACE_ID,
        actorType: "owner_access_code",
        actorId: null,
        action: "auth.owner_access_code",
        targetType: "workspace",
        targetId: WORKSPACE_ID,
        riskLevel: outcome === "success" ? "medium" : "high",
        outcome,
        ipHash: await sha256(ip),
        userAgentHash: await sha256(userAgent),
        metadataJson: JSON.stringify({ method: "access_code" }),
      });
  } catch {
    // Authentication remains available if noncritical audit persistence fails.
  }
}

export async function GET(request: Request) {
  return Response.json({
    configured: authConfiguration().ownerAccessCode,
    authenticated: await hasValidOwnerSession(request),
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ error: "Unable to verify owner access" }, { status: 403 });
  }
  const key = requestKey(request);
  if (isRateLimited(key)) {
    return Response.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "retry-after": "900" } },
    );
  }
  const payload = (await request.json().catch(() => null)) as {
    code?: unknown;
  } | null;
  const code = typeof payload?.code === "string" ? payload.code.trim() : "";
  if (!code || !(await verifyOwnerAccessCode(code))) {
    recordFailure(key);
    await audit(request, "denied");
    return Response.json({ error: "Unable to verify owner access" }, { status: 403 });
  }
  attempts.delete(key);
  await audit(request, "success");
  const token = await createOwnerSessionToken();
  return Response.json(
    { authenticated: true },
    { headers: { "set-cookie": ownerSessionCookie(token) } },
  );
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ error: "Unable to sign out" }, { status: 403 });
  }
  return Response.json(
    { authenticated: false },
    { headers: { "set-cookie": clearOwnerSessionCookie() } },
  );
}
