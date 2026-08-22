import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Always On runtime has durable schedules and recorded worker heartbeats", async () => {
  const [schema, engine] = await Promise.all([read("db/schema.ts"), read("lib/worker-engine.ts")]);
  assert.match(schema, /export const automationSchedules/);
  assert.match(schema, /export const automationWorkerRuns/);
  assert.match(engine, /automation_maintenance/);
  assert.match(engine, /daily_studio_brief/);
  assert.match(engine, /schedulesProcessed/);
  assert.match(engine, /playbookStepsProcessed/);
});

test("queue claims are atomic, leased, retry-bounded, and recoverable", async () => {
  const engine = await read("lib/automation-engine.ts");
  assert.match(engine, /\.returning\(\{ id: automationJobs\.id \}\)/);
  assert.match(engine, /leaseExpiresAt/);
  assert.match(engine, /recoverExpiredAutomationLeases/);
  assert.match(engine, /attempt >= job\.maxAttempts/);
  assert.match(engine, /Math\.min\(60, 2 \*\* attempt\)/);
  assert.match(engine, /idempotencyKey/);
});

test("terminal failures are isolated and owner replay creates a new traceable job", async () => {
  const [engine, route] = await Promise.all([read("lib/automation-engine.ts"), read("app/api/worker/route.ts")]);
  assert.match(engine, /status: terminal \? "dead_letter" : "queued"/);
  assert.match(engine, /automationDeadLetters/);
  assert.match(engine, /replayOfJobId: job\.id/);
  assert.match(route, /actor !== "owner"/);
  assert.match(route, /replayAutomationJob/);
});

test("worker endpoint supports a server secret without exposing it", async () => {
  const [route, health, env] = await Promise.all([read("app/api/worker/route.ts"), read("app/api/health/route.ts"), read("cloudflare-env.d.ts")]);
  assert.match(route, /AUTOMATION_WORKER_SECRET/);
  assert.match(route, /crypto\.subtle\.digest/);
  assert.match(route, /requireWorkerOrOwner/);
  assert.doesNotMatch(route, /Response\.json\([^)]*AUTOMATION_WORKER_SECRET/);
  assert.match(health, /backgroundWorkerConfigured/);
  assert.match(env, /AUTOMATION_WORKER_SECRET/);
});

test("owner sees schedules, heartbeats, queue state, and safe failure recovery", async () => {
  const [api, ui] = await Promise.all([read("app/api/automations/route.ts"), read("app/legacy-app.tsx")]);
  assert.match(api, /alwaysOnRuntimeSnapshot/);
  assert.match(api, /runAlwaysOnWorker/);
  assert.match(ui, /DURABLE SCHEDULER/);
  assert.match(ui, /WORKER HEARTBEAT/);
  assert.match(ui, /Dead-letter queue/);
  assert.match(ui, /Replay safely/);
});

test("Stage 21 migration is additive and preserves prior queued work", async () => {
  const migration = await read("drizzle/0015_goofy_skaar.sql");
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM/i);
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("CREATE TABLE workspaces (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE automation_jobs (id text PRIMARY KEY NOT NULL, workspace_id text NOT NULL, job_type text NOT NULL, entity_type text, entity_id text, payload_json text NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'queued', priority integer NOT NULL DEFAULT 50, run_after text NOT NULL, attempts integer NOT NULL DEFAULT 0, max_attempts integer NOT NULL DEFAULT 5, locked_at text, completed_at text, last_error text, created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  database.exec("INSERT INTO workspaces VALUES ('legacy-lines')");
  database.exec("INSERT INTO automation_jobs (id, workspace_id, job_type, run_after) VALUES ('job-existing', 'legacy-lines', 'workflow_event', '2026-08-22T00:00:00.000Z')");
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  assert.equal(database.prepare("SELECT count(*) AS count FROM automation_jobs WHERE id = 'job-existing'").get().count, 1);
  assert.equal(database.prepare("SELECT idempotency_key FROM automation_jobs WHERE id = 'job-existing'").get().idempotency_key, null);
  assert.equal(database.prepare("SELECT count(*) AS count FROM automation_dead_letters").get().count, 0);
});

test("Stage 21 release documents its real hosted-runtime limit", async () => {
  const [changelog, notes] = await Promise.all([read("CHANGELOG.md"), read("docs/DURABLE_ALWAYS_ON_RUNTIME.md")]);
  assert.match(changelog, /0\.7\.0-alpha\.21/);
  assert.match(changelog, /Durable Always On Runtime|durable Always On scheduler/i);
  assert.match(notes, /must not claim unattended 24\/7 execution/i);
  assert.match(notes, /Always On increases availability, not authority/i);
  assert.match(notes, /no drops, deletes, table rewrites/i);
});
