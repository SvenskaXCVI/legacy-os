import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Stage 24 stores durable manager runs, ordered steps, and parent run provenance", async () => {
  const [schema, chief, agents] = await Promise.all([read("db/schema.ts"), read("lib/chief-manager-engine.ts"), read("lib/agent-engine.ts")]);
  assert.match(schema, /export const chiefManagerRuns/);
  assert.match(schema, /export const chiefManagerSteps/);
  assert.match(schema, /parentRunId: text\("parent_run_id"\)/);
  assert.match(chief, /parentRunId: aiRunId/);
  assert.match(agents, /parentRunId: task\.parentRunId/);
  for (const record of ["aiEvents", "toolCalls", "usageEvents", "auditEvents"]) assert.match(chief, new RegExp(`db\\.insert\\(${record}\\)`));
});

test("the optional planner uses strict structured output without provider persistence", async () => {
  const adapter = await read("lib/model-adapter.ts");
  assert.match(adapter, /runStructuredModel/);
  assert.match(adapter, /"responses" : "chat\/completions"/);
  assert.match(adapter, /store: false/);
  assert.match(adapter, /type: "json_schema"/);
  assert.match(adapter, /deterministic-chief-planner-v1/);
  assert.doesNotMatch(adapter, /sk-[A-Za-z0-9]/);
});

test("the Chief plans from authorized real state and metadata-only scoped memory", async () => {
  const chief = await read("lib/chief-manager-engine.ts");
  assert.match(chief, /eq\(projects\.isTest, false\)/);
  assert.match(chief, /isNull\(projects\.archivedAt\)/);
  assert.match(chief, /buildMemoryContext/);
  assert.match(chief, /memory: context\.memory\.items\.map/);
  assert.doesNotMatch(chief, /messageRows\.map\(.*body/s);
  assert.match(chief, /contentCaptured: false/);
});

test("model suggestions are constrained to registered tools and real entity ids", async () => {
  const chief = await read("lib/chief-manager-engine.ts");
  assert.match(chief, /TOOL_CATALOG\.filter/);
  assert.match(chief, /\["AUTO", "AUTO_WITH_LOG"\]/);
  assert.match(chief, /validProjectIds\.has\(step\.projectId\)/);
  assert.match(chief, /validClientIds\.has\(step\.clientId\)/);
  assert.match(chief, /routeAgentTask/);
  assert.match(chief, /Array\.isArray\(result\.data\.steps\)/);
});

test("exact external actions pause for authority and resume without bypassing connectors", async () => {
  const [chief, route] = await Promise.all([read("lib/chief-manager-engine.ts"), read("app/api/chief/route.ts")]);
  assert.match(route, /send_client_message/);
  assert.match(route, /exact message/i);
  assert.match(route, /schedule_appointment/);
  assert.match(chief, /awaiting_approval/);
  assert.match(chief, /awaiting_execution/);
  assert.match(chief, /executeAgentTask/);
  assert.doesNotMatch(chief, /executeConnectorAction/);
});

test("owner API and manager console expose runnable, resumable traces", async () => {
  const [route, ui, css] = await Promise.all([read("app/api/chief/route.ts"), read("app/legacy-app.tsx"), read("app/globals.css")]);
  assert.match(route, /requireOwner/);
  assert.match(route, /idempotencyKey/);
  assert.match(ui, /runChiefCommand/);
  assert.match(ui, /Run Chief of Staff/);
  assert.match(ui, /Manager traces/);
  assert.match(ui, /resumeChief/);
  assert.match(css, /\.chief-manager-console/);
  assert.match(css, /\.chief-command-form/);
});

test("Stage 24 migration is additive and preserves prior agent tasks", async () => {
  const migration = await read("drizzle/0018_cloudy_martin_li.sql");
  assert.doesNotMatch(migration, /^\s*(?:DROP TABLE|DELETE FROM|UPDATE\s)/im);
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("CREATE TABLE workspaces (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE ai_runs (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE projects (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE clients (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE approvals (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE agent_tasks (id text PRIMARY KEY NOT NULL, created_at text NOT NULL)");
  database.exec("INSERT INTO agent_tasks (id, created_at) VALUES ('task-existing', '2026-08-22T00:00:00.000Z')");
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  assert.equal(database.prepare("SELECT count(*) AS count FROM agent_tasks").get().count, 1);
  assert.equal(database.prepare("SELECT parent_run_id FROM agent_tasks WHERE id = 'task-existing'").get().parent_run_id, null);
  assert.equal(database.prepare("SELECT count(*) AS count FROM chief_manager_runs").get().count, 0);
  assert.equal(database.prepare("SELECT count(*) AS count FROM chief_manager_steps").get().count, 0);
});

test("Stage 24 release documents the real manager and honest connector boundary", async () => {
  const [pkg, version, changelog, notes, api] = await Promise.all([read("package.json"), read("lib/version.ts"), read("CHANGELOG.md"), read("docs/REAL_CHIEF_OF_STAFF_MANAGER.md"), read("docs/API.md")]);
  assert.ok(Number(JSON.parse(pkg).version.match(/alpha\.(\d+)/)?.[1]) >= 24);
  assert.match(version, /Stage \d+ ·/);
  assert.match(changelog, /0\.7\.0-alpha\.24/);
  assert.match(notes, /does not pretend that every third-party connector exists/i);
  assert.match(notes, /model cannot send messages, schedule appointments, publish content, move money/i);
  assert.match(api, /GET \/api\/chief/);
});
