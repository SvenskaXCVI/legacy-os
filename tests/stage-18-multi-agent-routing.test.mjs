import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Stage 18 defines a durable nine-agent staff and bounded routing contract", async () => {
  const [schema, engine] = await Promise.all([read("db/schema.ts"), read("lib/agent-engine.ts")]);
  assert.match(schema, /export const agentDefinitions/);
  assert.match(schema, /export const agentTasks/);
  assert.match(schema, /export const agentHandoffs/);
  for (const agent of ["chief_of_staff", "client_manager", "design_director", "operations_manager", "scheduling_coordinator", "finance_manager", "content_producer", "knowledge_librarian", "analytics_advisor"]) assert.match(engine, new RegExp(agent));
  for (const field of ["contextMemoryIdsJson", "approvalRequired", "idempotencyKey", "correlationId", "resultSummary"]) assert.match(schema, new RegExp(field));
});

test("routing is model-agnostic, scoped, idempotent, and automatically connected to workflow signals", async () => {
  const [schema, engine, automation] = await Promise.all([read("db/schema.ts"), read("lib/agent-engine.ts"), read("lib/automation-engine.ts")]);
  assert.match(engine, /model-agnostic-policy-worker-v1/);
  assert.match(engine, /buildMemoryContext/);
  assert.match(schema, /agent_tasks_workspace_idempotency_uq/);
  assert.match(engine, /bounded-handoff-v1/);
  assert.match(automation, /routeAgentTask/);
  assert.match(automation, /agentTaskId/);
});

test("externally effective actions stop at approval and connector boundaries", async () => {
  const [engine, authority] = await Promise.all([read("lib/agent-engine.ts"), read("lib/tool-authority-engine.ts")]);
  assert.match(authority, /send_client_message/);
  assert.match(authority, /publish_content/);
  assert.match(authority, /schedule_appointment/);
  assert.match(authority, /refund_payment/);
  assert.match(engine, /held_for_approval/);
  assert.match(engine, /assertToolExecutionAuthorized/);
  assert.match(engine, /ready_for_connector/);
  assert.match(engine, /approval_verified_no_external_side_effect/);
});

test("owner can delegate, inspect, run, retry, and cancel staff tasks", async () => {
  const [route, workspace, ui] = await Promise.all([read("app/api/agents/route.ts"), read("app/api/workspace/route.ts"), read("app/legacy-app.tsx")]);
  assert.match(route, /"run" \| "retry" \| "cancel"/);
  assert.match(route, /requireOwner/);
  assert.match(workspace, /agentDefinitions: agentRows/);
  assert.match(workspace, /agentTasks: agentTaskRows/);
  assert.match(ui, /AI STAFF OPERATIONS/);
  assert.match(ui, /Delegation ledger/);
});

test("Stage 18 migration is additive and preserves existing alpha records", async () => {
  const migration = await read("drizzle/0012_gray_serpent_society.sql");
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|UPDATE `/i);
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("CREATE TABLE workspaces (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE clients (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE projects (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE approvals (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE capture_events (id text PRIMARY KEY NOT NULL, title text NOT NULL)");
  database.exec("INSERT INTO workspaces VALUES ('legacy-lines')");
  database.exec("INSERT INTO capture_events VALUES ('capture-existing', 'Existing evidence')");
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  assert.equal(database.prepare("SELECT count(*) AS count FROM capture_events").get().count, 1);
  assert.equal(database.prepare("SELECT count(*) AS count FROM agent_tasks").get().count, 0);
});

test("Stage 18 release and operational limits are documented", async () => {
  const [changelog, pkg, notes] = await Promise.all([read("CHANGELOG.md"), read("package.json"), read("docs/MULTI_AGENT_STAFF_AND_ROUTING.md")]);
  assert.match(JSON.parse(pkg).version, /^0\.7\.0-alpha\.(?:19|[2-9]\d)$/);
  assert.match(changelog, /0\.7\.0-alpha\.18/);
  assert.match(notes, /no external side effect occurred/i);
  assert.match(notes, /does not drop, delete, update, or rewrite/i);
});
