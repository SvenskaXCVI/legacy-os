import { sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { workspaces } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { authConfiguration, WORKSPACE_ID } from "../_lib";
import { LEGACY_OS_RELEASE, LEGACY_OS_VERSION } from "../../../lib/version";
import { stripeConfiguration } from "../../../lib/stripe";

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
    const modelConfigured = Boolean(
      env.AI_BASE_URL?.trim() &&
        env.AI_API_KEY?.trim() &&
        env.AI_MODEL?.trim(),
    );
    const stripe = stripeConfiguration();
    return Response.json({
      status: "healthy",
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
        secure_identity:
          auth.mode === "supabase"
            ? "account authentication configured"
            : auth.mode === "access_code"
              ? "owner access code configured"
              : "private deployment only",
        external_client_accounts: auth.externalClientReady
          ? "ready"
          : "configuration required",
        model_provider: modelConfigured
          ? "configured"
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
        ownerPrivateAlpha: true,
        externalClientAlpha: auth.externalClientReady,
        modelProviderConfigured: modelConfigured,
        instagramConfigured: auth.instagramConnection,
        stripeConfigured: stripe.configured,
        stripeTestMode: stripe.testMode,
        stripeLiveEnabled: stripe.liveEnabled,
        lastAutomationAt: workspace?.lastAutomationAt || null,
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
