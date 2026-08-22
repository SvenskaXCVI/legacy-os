import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Stage 26 completes the first six connector priorities without pretending later providers exist", async () => {
  const [engine, google, stripe, files, model, social] = await Promise.all([read("lib/connector-engine.ts"), read("lib/google-connectors.ts"), read("lib/stripe.ts"), read("app/api/files/route.ts"), read("lib/model-adapter.ts"), read("lib/social-sync.ts")]);
  for (const connector of ["gmail", "google_calendar", "stripe", "instagram", "reasoning_model"]) assert.match(engine, new RegExp(`key: "${connector}"`));
  assert.match(google, /sendGmailMessage/);
  assert.match(google, /createGoogleCalendarEvent/);
  assert.match(stripe, /StripeClient|new Stripe/);
  assert.match(files, /env\.MEDIA/);
  assert.match(model, /runStructuredModel/);
  assert.match(social, /syncSocialConnections/);
  assert.doesNotMatch(engine, /key: "contacts"/);
});

test("Google OAuth state is signed, short-lived, single-use, and credentials are encrypted", async () => {
  const [google, schema, callback] = await Promise.all([read("lib/google-connectors.ts"), read("db/schema.ts"), read("app/api/connectors/google/callback/route.ts")]);
  assert.match(google, /expiresAt = Date\.now\(\) \+ 10 \* 60_000/);
  assert.match(google, /name: "HMAC", hash: "SHA-256"/);
  assert.match(google, /isNull\(connectorOauthStates\.consumedAt\)/);
  assert.match(google, /connectorOauthStates\)\.set\(\{ consumedAt: now \}\)/);
  assert.match(google, /name: "AES-GCM"/);
  assert.match(google, /bytes\.length !== 32/);
  assert.match(schema, /encryptedCredentialJson: text\("encrypted_credential_json"\)\.notNull/);
  assert.match(callback, /completeGoogleAuthorization/);
  assert.doesNotMatch(callback, /access_token|refresh_token|encryptedCredentialJson/);
});

test("Google connectors request only bounded task-specific scopes and offline access", async () => {
  const google = await read("lib/google-connectors.ts");
  assert.match(google, /gmail: \["openid", "email", "https:\/\/www\.googleapis\.com\/auth\/gmail\.send"\]/);
  assert.match(google, /google_calendar: \["openid", "email", "https:\/\/www\.googleapis\.com\/auth\/calendar\.events"\]/);
  assert.match(google, /url\.searchParams\.set\("access_type", "offline"\)/);
  assert.match(google, /url\.searchParams\.set\("include_granted_scopes", "true"\)/);
  assert.doesNotMatch(google, /https:\/\/mail\.google\.com\//);
  assert.doesNotMatch(google, /auth\/calendar"/);
});

test("Gmail sends only an exact approved scoped message and keeps content out of connector traces", async () => {
  const [connector, tool, google] = await Promise.all([read("lib/connector-engine.ts"), read("lib/tool-authority-engine.ts"), read("lib/google-connectors.ts")]);
  assert.match(tool, /key: "send_client_email"[\s\S]*authority: "ASK"/);
  assert.match(tool, /send_client_email"[\s\S]*maxAttempts: 1/);
  assert.match(connector, /Project is not scoped to this client/);
  assert.match(connector, /subjectCharacterCount/);
  assert.match(connector, /contentCaptured: false/);
  assert.match(google, /gmail\/v1\/users\/me\/messages\/send/);
  assert.match(google, /bytesToBase64Url\(new TextEncoder\(\)\.encode\(raw\)\)/);
});

test("Google Calendar mirrors approved conflict-free appointments idempotently", async () => {
  const [connector, google] = await Promise.all([read("lib/connector-engine.ts"), read("lib/google-connectors.ts")]);
  assert.match(connector, /An approved owner decision is required before connector execution/);
  assert.match(connector, /The approved time conflicts with an existing appointment/);
  assert.match(connector, /createGoogleCalendarEvent/);
  assert.match(google, /legacy-calendar:\$\{input\.workspaceId\}:\$\{input\.idempotencyKey\}/);
  assert.match(google, /if \(response\.status === 409\) return \{ id: eventId, reused: true \}/);
  assert.match(google, /sendUpdates=none/);
});

test("Stripe retains hosted Checkout, dynamic methods, restricted keys, webhooks, and live lockout", async () => {
  const [stripe, checkout, webhook] = await Promise.all([read("lib/stripe.ts"), read("app/api/payments/checkout/route.ts"), read("app/api/payments/webhook/route.ts")]);
  assert.match(stripe, /2026-07-29\.dahlia/);
  assert.match(stripe, /restrictedKey \|\| secretKey/);
  assert.match(stripe, /Live Stripe payments are locked/);
  assert.match(checkout, /checkout\.sessions\.create/);
  assert.match(checkout, /integration_identifier/);
  assert.doesNotMatch(checkout, /payment_method_types/);
  assert.match(webhook, /constructEventAsync/);
});

test("Owner UI exposes account-aware Google connect and secure disconnect controls", async () => {
  const [ui, workspace, route] = await Promise.all([read("app/legacy-app.tsx"), read("app/api/workspace/route.ts"), read("app/api/connectors/google/route.ts")]);
  assert.match(ui, /manageGoogleConnector/);
  assert.match(ui, /Connect Google/);
  assert.match(ui, /Disconnect/);
  assert.match(ui, /accountEmail/);
  assert.match(workspace, /connectorAccounts\.accountEmail/);
  assert.doesNotMatch(workspace, /connectorAccounts\.encryptedCredentialJson/);
  assert.match(route, /requireOwner\(request\)/);
  assert.match(route, /disconnectGoogleConnector/);
});

test("Stage 26 migration is additive and preserves existing alpha records", async () => {
  const migration = await read("drizzle/0020_violet_sleeper.sql");
  assert.doesNotMatch(migration, /^\s*(?:DROP TABLE|DELETE FROM|UPDATE\s)/im);
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("CREATE TABLE workspaces (id text PRIMARY KEY NOT NULL, name text)");
  database.exec("INSERT INTO workspaces (id, name) VALUES ('legacy-lines', 'Legacy Lines')");
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  assert.equal(database.prepare("SELECT name FROM workspaces WHERE id = 'legacy-lines'").get().name, "Legacy Lines");
  assert.equal(database.prepare("SELECT count(*) AS count FROM connector_accounts").get().count, 0);
  assert.equal(database.prepare("SELECT count(*) AS count FROM connector_oauth_states").get().count, 0);
});

test("Stage 26 is versioned and documents its honest release boundary", async () => {
  const [pkg, version, changelog, notes, api] = await Promise.all([read("package.json"), read("lib/version.ts"), read("CHANGELOG.md"), read("docs/PRODUCTION_EXTERNAL_CONNECTORS.md"), read("docs/API.md")]);
  assert.ok(Number(JSON.parse(pkg).version.match(/alpha\.(\d+)/)?.[1]) >= 26);
  assert.match(version, /LEGACY_OS_VERSION/);
  assert.match(changelog, /0\.7\.0-alpha\.26/);
  assert.match(notes, /Contacts, additional social networks, and research\/search providers remain later connector work/);
  assert.match(notes, /AI cannot send email or create an appointment without an exact owner approval/);
  assert.match(api, /POST \/api\/connectors\/google/);
});
