import { sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { workspaces } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { authConfiguration, WORKSPACE_ID } from "../_lib";
import { LEGACY_OS_RELEASE, LEGACY_OS_VERSION } from "../../../lib/version";
import { stripeConfiguration } from "../../../lib/stripe";
import { getModelRuntimeStatus } from "../../../lib/model-adapter";

export async function GET() {
  const checkedAt = new Date().toISOString();
  try {
    await getDb().run(sql`select 1`);
    const workspace = await getDb()
      .select({
        automationStatus: workspaces.automationStatus,
        lastAutomationAt: workspaces.lastAutomationAt,
      })
      .from(workspaces)
      .where(eq(workspaces.id, WORKSPACE_ID))
      .get();
    const auth = authConfiguration();
    const modelRuntime = getModelRuntimeStatus();
    const stripe = stripeConfiguration();
    const configurationIssues = [
      auth.ownerAccessCodeMisconfigured
        ? "OWNER_ACCESS_CODE_HASH must be a 64-character SHA-256 hex digest"
        : null,
      auth.supabasePartiallyConfigured
        ? "SUPABASE_URL and the Supabase public key must be configured together"
        : null,
    ].filter(Boolean);
    return Response.json({
      status: configurationIssues.length > 0 ? "limited" : "healthy",
      version: LEGACY_OS_VERSION,
      release: LEGACY_OS_RELEASE,
      checkedAt,
      services: {
        application: "healthy",
        database: "healthy",
        file_storage: env.MEDIA ? "healthy" : "unavailable",
        audit_and_usage_ledger: "healthy",
        automations:
          workspace?.automationStatus === "active" ? "active" : "paused",
        background_worker: env.AUTOMATION_WORKER_SECRET?.trim()
          ? "authenticated endpoint ready"
          : "owner wake-up only",
        secure_identity:
          auth.mode === "supabase"
            ? "Supabase account authentication and role registry configured"
            : auth.mode === "access_code"
              ? "owner access code configured"
              : "private deployment only",
        external_client_accounts: auth.externalClientReady
          ? "ready"
          : "configuration required",
        model_provider: modelRuntime.configured
          ? `${modelRuntime.provider} · ${modelRuntime.model}`
          : "deterministic local intelligence",
        instagram_connection: auth.instagramConnection
          ? "configured"
          : "configuration required",
        payments: stripe.configured
          ? stripe.testMode
            ? "Stripe test mode ready"
            : stripe.liveEnabled
              ? "Stripe live mode enabled"
              : "live mode locked"
          : "configuration required",
      },
      readiness: {
        ownerPrivateAlpha:
          auth.mode === "access_code" ||
          auth.mode === "supabase",
        externalClientAlpha: auth.externalClientReady,
        modelProviderConfigured: modelRuntime.configured,
        modelRuntime,
        instagramConfigured: auth.instagramConnection,
        stripeConfigured: stripe.configured,
        stripeTestMode: stripe.testMode,
        stripeLiveEnabled: stripe.liveEnabled,
        lastAutomationAt: workspace?.lastAutomationAt || null,
        backgroundWorkerConfigured: Boolean(env.AUTOMATION_WORKER_SECRET?.trim()),
        configurationIssues,
      },
    }, {
      headers: {
        "cache-control": "no-store, max-age=0",
        pragma: "no-cache",
      },
    });
  } catch {
    return Response.json(
      {
        status: "degraded",
        version: LEGACY_OS_VERSION,
        release: LEGACY_OS_RELEASE,
        checkedAt,
        services: {
          application: "healthy",
          database: "unavailable",
          telemetry: "unavailable",
        },
      },
      { status: 503 },
    );
  }
}
