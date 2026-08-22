import Stripe from "stripe";
import { env } from "cloudflare:workers";

export const STRIPE_API_VERSION = "2026-07-29.dahlia" as const;

export function stripeConfiguration() {
  const restrictedKey = String(env.STRIPE_RESTRICTED_KEY || "").trim();
  const secretKey = String(env.STRIPE_SECRET_KEY || "").trim();
  const key = restrictedKey || secretKey;
  const testMode = key.startsWith("rk_test_") || key.startsWith("sk_test_");
  const liveMode = key.startsWith("rk_live_") || key.startsWith("sk_live_");
  return {
    configured: Boolean(key) && Boolean(env.STRIPE_WEBHOOK_SECRET?.trim()),
    key,
    keyType: restrictedKey ? "restricted" : secretKey ? "secret" : "none",
    testMode,
    liveMode,
    liveEnabled: env.STRIPE_LIVE_PAYMENTS_ENABLED === "true",
    webhookConfigured: Boolean(env.STRIPE_WEBHOOK_SECRET?.trim()),
  };
}

export function getStripe() {
  const configuration = stripeConfiguration();
  if (!configuration.key) throw new Error("Stripe is not configured");
  if (configuration.liveMode && !configuration.liveEnabled) {
    throw new Error("Live Stripe payments are locked. Use test credentials for alpha testing.");
  }
  if (!configuration.testMode && !configuration.liveMode) {
    throw new Error("Stripe key type is not recognized");
  }
  return new Stripe(configuration.key, {
    apiVersion: STRIPE_API_VERSION,
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 2,
  });
}

export function stripeWebhookSecret() {
  const secret = String(env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!secret) throw new Error("Stripe webhook signing secret is not configured");
  return secret;
}

export function integrationIdentifier() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `legacy_os_${[...bytes].map((byte) => alphabet[byte % alphabet.length]).join("")}`;
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
