import { env } from "cloudflare:workers";
import { authConfiguration, requireOwner, routeError } from "../_lib";
import { getModelRuntimeStatus } from "../../../lib/model-adapter";
import { getStripe, stripeConfiguration, STRIPE_API_VERSION } from "../../../lib/stripe";

function publicStatus() {
  const auth = authConfiguration();
  const stripe = stripeConfiguration();
  return {
    supabase: {
      configured: auth.mode === "supabase",
      mode: auth.mode,
      projectHost: env.SUPABASE_URL ? new URL(String(env.SUPABASE_URL)).host : null,
      publishableKeyConfigured: Boolean(env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY),
      emailVerification: auth.emailVerification,
      totpMfa: auth.totpMfa,
      ownerAllowlistConfigured: auth.ownerAllowlistConfigured,
      partialConfiguration: auth.supabasePartiallyConfigured,
    },
    stripe: {
      configured: stripe.configured,
      keyType: stripe.keyType,
      mode: stripe.testMode ? "test" : stripe.liveMode ? "live" : "unconfigured",
      liveEnabled: stripe.liveEnabled,
      liveLocked: stripe.liveMode && !stripe.liveEnabled,
      webhookConfigured: stripe.webhookConfigured,
      apiVersion: STRIPE_API_VERSION,
      checkoutPath: "/api/payments/checkout",
      webhookPath: "/api/payments/webhook",
    },
    operationalDatabase: {
      provider: "Cloudflare D1",
      configured: true,
      role: "Authoritative operational system of record",
      alphaDataPreserved: true,
    },
    mediaStorage: {
      provider: "Cloudflare R2",
      configured: true,
      role: "Private project and client media",
    },
    modelRuntime: getModelRuntimeStatus(),
    secretPolicy: "Server vault only; secrets are never returned to the browser.",
  };
}

export async function GET(request: Request) {
  try {
    await requireOwner(request);
    return Response.json(publicStatus(), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return routeError(error, "Unable to load integration status");
  }
}

export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action === "verify_supabase") {
      const status = publicStatus();
      if (!status.supabase.configured || !env.SUPABASE_URL) {
        return Response.json({ error: "Supabase Auth is not fully configured in the server vault.", status }, { status: 409 });
      }
      const response = await fetch(`${String(env.SUPABASE_URL).replace(/\/$/, "")}/auth/v1/health`, {
        headers: { apikey: String(env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || "") },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Supabase Auth health returned ${response.status}`);
      return Response.json({ ok: true, provider: "Supabase Auth", checkedAt: new Date().toISOString(), status: publicStatus() });
    }
    if (body.action === "verify_stripe") {
      const status = publicStatus();
      if (!status.stripe.configured) return Response.json({ error: "Stripe credentials and webhook signing are not fully configured in the server vault.", status }, { status: 409 });
      if (status.stripe.liveLocked) return Response.json({ error: "Live Stripe credentials are present but live charging remains intentionally locked.", status }, { status: 409 });
      const balance = await getStripe().balance.retrieve();
      return Response.json({ ok: true, provider: "Stripe", currencies: [...new Set([...balance.available, ...balance.pending].map((item) => item.currency))], checkedAt: new Date().toISOString(), status: publicStatus() });
    }
    if (body.action === "verify_model") {
      return Response.json({ error: "Use the dedicated model runtime verification endpoint.", endpoint: "/api/model-runtime", status: publicStatus() }, { status: 409 });
    }
    return Response.json({ error: "Unsupported integration action" }, { status: 400 });
  } catch (error) {
    return routeError(error, "Unable to verify integration");
  }
}
