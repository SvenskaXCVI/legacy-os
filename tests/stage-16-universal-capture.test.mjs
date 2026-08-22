import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("universal capture is durable, source-linked, consent-aware, and idempotent", async () => {
  const [schema, engine, migration] = await Promise.all([
    read("db/schema.ts"),
    read("lib/capture-engine.ts"),
    read("drizzle/0010_moaning_nova.sql"),
  ]);
  assert.match(schema, /export const captureEvents/);
  assert.match(schema, /contentPolicy/);
  assert.match(schema, /consentGrantId/);
  assert.match(schema, /idempotencyKey/);
  assert.match(engine, /onConflictDoNothing/);
  assert.match(engine, /backfillAuditCaptureEvents/);
  assert.match(migration, /CREATE TABLE `capture_events`/);
  assert.match(migration, /capture_events_workspace_idempotency_uq/);
});

test("the automation and consented social pipelines feed the shared capture stream", async () => {
  const [automation, social] = await Promise.all([
    read("lib/automation-engine.ts"),
    read("lib/social-sync.ts"),
  ]);
  assert.match(automation, /captureUniversalEvent/);
  assert.match(automation, /captureId/);
  assert.match(social, /eventType: "social_media_observed"/);
  assert.match(social, /consentGrantId: grant\.id/);
  assert.match(social, /rawCaptionRetained: false/);
});

test("owner Universal Capture UI records and displays normalized signals", async () => {
  const [route, workspace, ui, css] = await Promise.all([
    read("app/api/capture/route.ts"),
    read("app/api/workspace/route.ts"),
    read("app/legacy-app.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(route, /explicit_owner_note/);
  assert.match(route, /requireOwner/);
  assert.match(workspace, /captureEvents: captureRows/);
  assert.match(ui, /UNIVERSAL CAPTURE/);
  assert.match(ui, /Capture and connect/);
  assert.match(css, /\.universal-capture-panel/);
  assert.match(css, /\.capture-stream/);
});

test("Stage 16 migration is additive and preserves existing records", async () => {
  const migration = await read("drizzle/0010_moaning_nova.sql");
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|UPDATE `/i);

  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("CREATE TABLE workspaces (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE clients (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE projects (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE audit_events (id text PRIMARY KEY NOT NULL, action text NOT NULL)");
  database.exec("INSERT INTO workspaces VALUES ('legacy-lines')");
  database.exec("INSERT INTO clients VALUES ('client-existing')");
  database.exec("INSERT INTO projects VALUES ('project-existing')");
  database.exec("INSERT INTO audit_events VALUES ('audit-existing', 'project.created')");
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  assert.equal(database.prepare("SELECT count(*) AS count FROM audit_events").get().count, 1);
  assert.equal(database.prepare("SELECT count(*) AS count FROM capture_events").get().count, 0);
});

test("Stage 16 release and privacy documentation are visible", async () => {
  const [version, notes, pkg] = await Promise.all([
    read("lib/version.ts"),
    read("docs/UNIVERSAL_CAPTURE.md"),
    read("package.json"),
  ]);
  assert.match(JSON.parse(pkg).version, /^0\.7\.0-alpha\.\d+$/);
  assert.match(version, /LEGACY_OS_RELEASE/);
  assert.match(notes, /Raw client messages/);
  assert.match(notes, /no table drops, deletes, destructive updates/i);
});
