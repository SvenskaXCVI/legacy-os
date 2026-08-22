import { latestRealtimeCursor, realtimeBatch } from "../../../lib/realtime-engine";
import { requireOwner, resolveClientAccess, routeError, WORKSPACE_ID } from "../_lib";

const encoder = new TextEncoder();
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope") === "client" ? "client" : "owner";
    const token = url.searchParams.get("token");
    let clientId: string | null = null;
    if (scope === "client") {
      const access = await resolveClientAccess(request, token && token !== "__authenticated__" ? token : null);
      if (!access) return Response.json({ error: "Verified client access is required" }, { status: 403 });
      clientId = access.clientId;
    } else {
      await requireOwner(request);
    }

    const suppliedCursor = Number(url.searchParams.get("after") || request.headers.get("last-event-id") || 0);
    let cursor = Number.isSafeInteger(suppliedCursor) && suppliedCursor > 0 ? suppliedCursor : 0;
    if (!cursor) cursor = await latestRealtimeCursor({ workspaceId: WORKSPACE_ID, audience: scope, clientId });
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`event: connected\ndata: {"scope":"${scope}"}\n\n`));
        try {
          for (let cycle = 0; cycle < 20 && !request.signal.aborted; cycle += 1) {
            const events = await realtimeBatch({ workspaceId: WORKSPACE_ID, audience: scope, clientId, after: cursor });
            for (const event of events) {
              cursor = event.sequence;
              controller.enqueue(encoder.encode(`id: ${event.sequence}\nevent: change\ndata: ${JSON.stringify({ sequence: event.sequence, eventType: event.eventType, entityType: event.entityType, entityId: event.entityId, projectId: event.projectId, title: event.title, changedFields: JSON.parse(event.changedFieldsJson), createdAt: event.createdAt })}\n\n`));
            }
            if (!events.length) controller.enqueue(encoder.encode(`event: heartbeat\ndata: {"cursor":${cursor}}\n\n`));
            await sleep(1_500);
          }
        } catch {
          controller.enqueue(encoder.encode(`event: unavailable\ndata: {"reconnect":true}\n\n`));
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store, no-cache, must-revalidate",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      },
    });
  } catch (error) {
    return routeError(error, "Unable to open realtime channel");
  }
}
