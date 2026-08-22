import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("payment settlement trusts signed Stripe webhooks instead of redirect parameters", async () => {
  const checkout = await read("app/api/payments/checkout/route.ts");
  const webhook = await read("app/api/payments/webhook/route.ts");
  assert.match(checkout, /stripe\.checkout\.sessions\.create/);
  assert.doesNotMatch(checkout, /payment_method_types/);
  assert.match(webhook, /stripe-signature/);
  assert.match(webhook, /constructEventAsync/);
  assert.match(webhook, /checkout\.session\.completed/);
  assert.match(webhook, /session\.payment_status/);
  assert.match(webhook, /charge\.refunded/);
  assert.match(webhook, /externalEventId: event\.id/);
  assert.match(webhook, /payloadDigest: digest/);
  assert.doesNotMatch(webhook, /payloadJson:\s*body/);
});

test("live charging is locked and owner approval gates client checkout", async () => {
  const stripe = await read("lib/stripe.ts");
  const payments = await read("app/api/payments/route.ts");
  const checkout = await read("app/api/payments/checkout/route.ts");
  assert.match(stripe, /STRIPE_LIVE_PAYMENTS_ENABLED === "true"/);
  assert.match(stripe, /Live Stripe payments are locked/);
  assert.match(payments, /payment_request\.approved/);
  assert.match(payments, /Only draft requests can be approved/);
  assert.match(checkout, /\["approved", "open", "expired"\]/);
  assert.match(payments, /action === "refund"/);
});

test("Stage 4 migration is additive and preserves alpha client and project data", async () => {
  const migration = await read("drizzle/0006_fine_madame_web.sql");
  assert.doesNotMatch(migration, /\bDROP\s+TABLE\b/i);
  assert.doesNotMatch(migration, /\bDELETE\s+FROM\b/i);
  assert.match(migration, /CREATE TABLE `payment_requests`/);
  assert.match(migration, /CREATE TABLE `payment_events`/);
  assert.match(migration, /CREATE TABLE `payment_customers`/);

  const database = new DatabaseSync(":memory:");
  for (const path of [
    "drizzle/0000_past_alice.sql", "drizzle/0001_free_runaways.sql",
    "drizzle/0002_chubby_bruce_banner.sql", "drizzle/0003_careless_sunfire.sql",
    "drizzle/0004_parallel_pyro.sql", "drizzle/0005_tiresome_calypso.sql",
  ]) database.exec((await read(path)).replaceAll("--> statement-breakpoint", ""));
  database.exec(`
    INSERT INTO clients (id, workspace_id, first_name, last_name, email, display_name)
    VALUES ('stage-four-client', 'legacy-lines', 'Alpha', '', 'alpha@example.com', 'Alpha');
    INSERT INTO projects (id, workspace_id, client_id, title, summary)
    VALUES ('stage-four-project', 'legacy-lines', 'stage-four-client', 'Existing tattoo', 'Preserve me');
  `);
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  const project = database.prepare("SELECT title, summary FROM projects WHERE id = ?").get("stage-four-project");
  assert.deepEqual({ ...project }, { title: "Existing tattoo", summary: "Preserve me" });
  assert.equal(database.prepare("SELECT count(*) AS count FROM payment_requests").get().count, 0);
  database.close();
});

test("Stripe credentials remain server-only placeholders", async () => {
  const env = await read(".env.example");
  const client = await read("app/legacy-app.tsx");
  const stripe = await read("lib/stripe.ts");
  assert.match(env, /STRIPE_RESTRICTED_KEY=\s*$/m);
  assert.match(env, /STRIPE_LIVE_PAYMENTS_ENABLED=false/);
  assert.doesNotMatch(client, /STRIPE_(?:SECRET|RESTRICTED|WEBHOOK)/);
  assert.doesNotMatch(stripe, /(?:sk|rk)_(?:test|live)_[A-Za-z0-9]{8,}/);
});

test("Stage 4 version and payment runbook are published", async () => {
  const version = await read("lib/version.ts");
  const pkg = JSON.parse(await read("package.json"));
  const runbook = await read("docs/STRIPE_ROLLOUT.md");
  assert.equal(pkg.version, "0.6.0-alpha.4");
  assert.match(version, /0\.6\.0-alpha\.4/);
  assert.match(version, /Stage 4 · Payments/);
  assert.match(runbook, /signed webhook is the source of truth/i);
});
