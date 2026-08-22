import { env } from "cloudflare:workers";
import { replayAutomationJob } from "../../../lib/automation-engine";
import { alwaysOnRuntimeSnapshot, runAlwaysOnWorker } from "../../../lib/worker-engine";
import { requireOwner, routeError, WORKSPACE_ID } from "../_lib";

async function secureEquals(left: string, right: string) {
  const encode = (value: string) => new TextEncoder().encode(value);
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", encode(left)), crypto.subtle.digest("SHA-256", encode(right))]);
  const first = new Uint8Array(a);
  const second = new Uint8Array(b);
  let mismatch = first.length ^ second.length;
  for (let index = 0; index < Math.min(first.length, second.length); index += 1) mismatch |= first[index] ^ second[index];
  return mismatch === 0;
}

async function requireWorkerOrOwner(request: Request) {
  const configured = env.AUTOMATION_WORKER_SECRET?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  if (configured && supplied && await secureEquals(supplied, configured)) return "worker";
  await requireOwner(request);
  return "owner";
}

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    return Response.json(await alwaysOnRuntimeSnapshot(WORKSPACE_ID));
  } catch (error) {
    return routeError(error, "Unable to load Always On runtime");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireWorkerOrOwner(request);
    const payload = (await request.json().catch(() => ({}))) as { action?: "run" | "replay"; jobId?: string };
    if (payload.action === "replay") {
      if (actor !== "owner") return Response.json({ error: "Only an owner can replay dead-letter work" }, { status: 403 });
      if (!payload.jobId) return Response.json({ error: "A dead-letter job is required" }, { status: 400 });
      return Response.json({ replayJobId: await replayAutomationJob(WORKSPACE_ID, payload.jobId) });
    }
    return Response.json({ run: await runAlwaysOnWorker(WORKSPACE_ID, actor === "worker" ? "scheduled_worker" : "owner_requested_worker") });
  } catch (error) {
    return routeError(error, "Unable to run Always On worker");
  }
}
