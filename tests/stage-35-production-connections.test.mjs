import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Stage 35 adds a protected production connections control surface", async () => {
  const app = await read("app/legacy-app.tsx");
  const route = await read("app/api/integrations/route.ts");
  assert.match(app, /Connections/);
  assert.match(app, /Supabase Auth/);
  assert.match(app, /Stripe Checkout/);
  assert.match(app, /Credentials stay in the server vault/);
  assert.match(route, /requireOwner/);
  assert.match(route, /verify_supabase/);
  assert.match(route, /verify_stripe/);
  assert.doesNotMatch(route, /service_role/i);
});

test("Stage 35 preserves the operational database and Stripe safety boundaries", async () => {
  const route = await read("app/api/integrations/route.ts");
  const stripe = await read("lib/stripe.ts");
  const auth = await read("app/api/_lib.ts");
  assert.match(route, /alphaDataPreserved: true/);
  assert.match(route, /Cloudflare D1/);
  assert.match(stripe, /STRIPE_RESTRICTED_KEY/);
  assert.match(stripe, /STRIPE_WEBHOOK_SECRET/);
  assert.match(stripe, /Live Stripe payments are locked/);
  assert.match(auth, /configuration\.ownerAccessCode && \(await hasValidOwnerSession\(request\)\)/);
});
