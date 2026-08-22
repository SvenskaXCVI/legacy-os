import { actorFrom, jsonError, requireOwner, routeError, WORKSPACE_ID } from "../../_lib";
import { createGoogleAuthorization, disconnectGoogleConnector, googleOAuthConfigured, type GoogleConnectorKey } from "../../../../lib/google-connectors";

const supported = (value: unknown): value is GoogleConnectorKey => value === "gmail" || value === "google_calendar";

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    return Response.json({ configured: googleOAuthConfigured(), connectors: ["gmail", "google_calendar"] });
  } catch (error) {
    return routeError(error, "Unable to inspect Google connector readiness");
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json().catch(() => ({}))) as { connectorKey?: string };
    if (!supported(payload.connectorKey)) return jsonError("Choose Gmail or Google Calendar");
    const authorizationUrl = await createGoogleAuthorization({ workspaceId: WORKSPACE_ID, connectorKey: payload.connectorKey, requestedBy: actorFrom(request) });
    return Response.json({ authorizationUrl });
  } catch (error) {
    return routeError(error, "Unable to start Google connection");
  }
}

export async function DELETE(request: Request) {
  try {
    await requireOwner(request);
    const payload = (await request.json().catch(() => ({}))) as { connectorKey?: string };
    if (!supported(payload.connectorKey)) return jsonError("Choose Gmail or Google Calendar");
    await disconnectGoogleConnector(WORKSPACE_ID, payload.connectorKey);
    return Response.json({ disconnected: true, connectorKey: payload.connectorKey });
  } catch (error) {
    return routeError(error, "Unable to disconnect Google account");
  }
}
