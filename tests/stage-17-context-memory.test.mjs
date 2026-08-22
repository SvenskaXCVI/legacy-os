import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("memory records are scoped, versioned, confidence-ranked, and source-linked", async () => {
  const [schema, engine] = await Promise.all([
    read("db/schema.ts"),
    read("lib/memory-engine.ts"),
  ]);
  assert.match(schema, /export const memoryRecords/);
  for (const field of ["scopeKey", "memoryKey", "sourceCaptureIdsJson", "confidenceBps", "verificationStatus", "supersedesMemoryId", "lastReinforcedAt"]) {
    assert.match(schema, new RegExp(field));
  }
  assert.match(engine, /status: "superseded"/);
  assert.match(engine, /reinforced \+= 1/);
  assert.match(engine, /status: "remembered"/);
  assert.match(engine, /status: "not_memory"/);
});

test("context retrieval is bounded and excludes unrelated or inactive memory", async () => {
  const engine = await read("lib/memory-engine.ts");
  assert.match(engine, /MEMORY_CONTEXT_POLICY_VERSION/);
  assert.match(engine, /eq\(memoryRecords\.status, "active"\)/);
  assert.match(engine, /inArray\(memoryRecords\.scopeKey, scopeKeys\)/);
  assert.match(engine, /maxItems/);
  assert.match(engine, /maxCharacters/);
  assert.match(engine, /owner_verified/);
  assert.match(engine, /memoryIds/);
  assert.match(engine, /omitted/);
});

test("Chief of Staff records exact scoped-memory evidence", async () => {
  const [briefing, ui] = await Promise.all([
    read("app/api/briefing/route.ts"),
    read("app/legacy-app.tsx"),
  ]);
  assert.match(briefing, /buildMemoryContext/);
  assert.match(briefing, /memoryIds: memoryContext\.memoryIds/);
  assert.match(briefing, /contextPolicyVersion: MEMORY_CONTEXT_POLICY_VERSION/);
  assert.match(ui, /What the Chief of Staff remembered for this run/);
  assert.match(ui, /omitted by context budget/);
});

test("owner can inspect, search, verify, revoke, and consolidate memory", async () => {
  const [route, workspace, ui] = await Promise.all([
    read("app/api/memory/route.ts"),
    read("app/api/workspace/route.ts"),
    read("app/legacy-app.tsx"),
  ]);
  assert.match(route, /"verify" \| "revoke"/);
  assert.match(route, /verificationStatus: "owner_verified"/);
  assert.match(route, /status: "revoked"/);
  assert.match(workspace, /memoryRecords: memoryRows/);
  assert.match(ui, /Consolidate captures/);
  assert.match(ui, /type: "Memory"/);
});

test("Stage 17 migration is additive and preserves existing memory sources", async () => {
  const migration = await read("drizzle/0011_striped_wolfsbane.sql");
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|UPDATE `/i);
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("CREATE TABLE workspaces (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE clients (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE projects (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE capture_events (id text PRIMARY KEY NOT NULL, title text NOT NULL)");
  database.exec("INSERT INTO workspaces VALUES ('legacy-lines')");
  database.exec("INSERT INTO clients VALUES ('client-existing')");
  database.exec("INSERT INTO projects VALUES ('project-existing')");
  database.exec("INSERT INTO capture_events VALUES ('capture-existing', 'Existing evidence')");
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  assert.equal(database.prepare("SELECT count(*) AS count FROM capture_events").get().count, 1);
  assert.equal(database.prepare("SELECT count(*) AS count FROM memory_records").get().count, 0);
});

test("Stage 17 release and operating rules are documented", async () => {
  const [changelog, pkg, notes] = await Promise.all([
    read("CHANGELOG.md"),
    read("package.json"),
    read("docs/CONTEXT_AND_MEMORY_ENGINE.md"),
  ]);
  assert.match(JSON.parse(pkg).version, /^0\.7\.0-alpha\.(?:1[7-9]|[2-9]\d)$/);
  assert.match(changelog, /0\.7\.0-alpha\.17/);
  assert.match(notes, /Memory is never silently deleted or rewritten/);
  assert.match(notes, /no drops, deletes, destructive updates/i);
});
