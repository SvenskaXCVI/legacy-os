import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("normalized capture publishes durable idempotent realtime notifications", async () => {
  const [schema, capture, engine] = await Promise.all([read("db/schema.ts"), read("lib/capture-engine.ts"), read("lib/realtime-engine.ts")]);
  assert.match(schema, /export const realtimeEvents/);
  assert.match(schema, /autoIncrement: true/);
  assert.match(schema, /realtime_events_workspace_idempotency_uq/);
  assert.match(capture, /publishRealtimeCapture/);
  assert.match(engine, /capture:\$\{input\.captureId\}:owner/);
  assert.match(engine, /capture:\$\{input\.captureId\}:client/);
});

test("realtime stream is authenticated, resumable, bounded, and non-cacheable", async () => {
  const route = await read("app/api/realtime/route.ts");
  assert.match(route, /requireOwner/);
  assert.match(route, /resolveClientAccess/);
  assert.match(route, /last-event-id/);
  assert.match(route, /latestRealtimeCursor/);
  assert.match(route, /text\/event-stream/);
  assert.match(route, /event: heartbeat/);
  assert.match(route, /cycle < 20/);
  assert.match(route, /cache-control.*no-store/i);
});

test("client event access is server-scoped and excludes internal intelligence", async () => {
  const [route, engine] = await Promise.all([read("app/api/realtime/route.ts"), read("lib/realtime-engine.ts")]);
  assert.match(route, /clientId = access\.clientId/);
  assert.match(engine, /eq\(realtimeEvents\.clientId, input\.clientId/);
  assert.match(engine, /CLIENT_VISIBLE_EVENTS/);
  assert.doesNotMatch(engine, /\^agent_|\^memory_|\^learning_|\^worker_|\^audit_/);
  assert.match(engine, /title: "Your Legacy project has an update"/);
});

test("owner and client interfaces reconnect and coalesce live refreshes", async () => {
  const ui = await read("app/legacy-app.tsx");
  assert.match(ui, /function useRealtimeFeed/);
  assert.match(ui, /activeApiAccessToken/);
  assert.match(ui, /cache: "no-store"/);
  assert.match(ui, /window\.setTimeout\(onChange, 220\)/);
  assert.match(ui, /"reconnecting"/);
  assert.match(ui, /useRealtimeFeed\("owner"/);
  assert.match(ui, /useRealtimeFeed\("client"/);
});

test("realtime indicators communicate connection state accessibly", async () => {
  const [ui, css] = await Promise.all([read("app/legacy-app.tsx"), read("app/globals.css")]);
  assert.match(ui, /Secure backend event channel/);
  assert.match(ui, /realtime-status/);
  assert.match(css, /\.realtime-status\.live/);
  assert.match(css, /@keyframes realtime-pulse/);
  assert.match(css, /prefers-reduced-motion/);
});

test("Stage 22 migration is additive and leaves existing records untouched", async () => {
  const migration = await read("drizzle/0016_reflective_iron_fist.sql");
  assert.doesNotMatch(migration, /^\s*(?:DROP TABLE|DELETE FROM|ALTER TABLE|UPDATE\s)/im);
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("CREATE TABLE workspaces (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE clients (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE projects (id text PRIMARY KEY NOT NULL)");
  database.exec("INSERT INTO workspaces VALUES ('legacy-lines')");
  database.exec("INSERT INTO clients VALUES ('client-existing')");
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  assert.equal(database.prepare("SELECT count(*) AS count FROM clients").get().count, 1);
  assert.equal(database.prepare("SELECT count(*) AS count FROM realtime_events").get().count, 0);
});

test("Stage 22 release documents the implementation boundary", async () => {
  const [changelog, pkg, notes] = await Promise.all([read("CHANGELOG.md"), read("package.json"), read("docs/SECURE_REALTIME_STATE_DELIVERY.md")]);
  assert.match(JSON.parse(pkg).version, /^0\.7\.0-alpha\.(?:2[3-9]|[3-9]\d)$/);
  assert.match(changelog, /0\.7\.0-alpha\.22/);
  assert.match(notes, /does not claim WebSocket or Durable Object infrastructure/i);
  assert.match(notes, /no drops, deletes, table rewrites/i);
});
