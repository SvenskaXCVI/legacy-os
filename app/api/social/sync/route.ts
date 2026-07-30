import { jsonError, requireOwner, WORKSPACE_ID } from "../../_lib";
import { syncSocialConnections } from "../../../../lib/social-sync";

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json().catch(() => ({}))) as {
      connectionId?: string;
    };
    return Response.json(
      await syncSocialConnections(
        WORKSPACE_ID,
        payload.connectionId ?? null,
      ),
    );
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonError(
      error instanceof Error
        ? error.message
        : "Unable to synchronize social evidence",
      500,
    );
  }
}

