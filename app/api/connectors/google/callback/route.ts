import { completeGoogleAuthorization } from "../../../../../lib/google-connectors";

function redirect(request: Request, status: "connected" | "failed", connector?: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("connector", status);
  if (connector) url.searchParams.set("provider", connector);
  return Response.redirect(url, 303);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  if (providerError || !code || !state) return redirect(request, "failed");
  try {
    const result = await completeGoogleAuthorization({ code, state });
    return redirect(request, "connected", result.connectorKey);
  } catch {
    return redirect(request, "failed");
  }
}
