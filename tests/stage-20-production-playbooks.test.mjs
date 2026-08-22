import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("nine tattoo operations playbooks cover the production lifecycle", async () => {
  const engine = await read("lib/playbook-engine.ts");
  for (const key of ["inquiry_triage", "project_launch", "design_approval", "payment_to_booking", "appointment_preparation", "session_to_healing", "healing_review", "completion_learning", "daily_studio_brief"]) {
    assert.match(engine, new RegExp(`key: "${key}"`));
  }
  assert.match(engine, /project_candidate_submitted/);
  assert.match(engine, /tattoo_session_completed/);
  assert.match(engine, /project_completed/);
});

test("normalized events start idempotent, evidence-linked playbook runs", async () => {
  const [automation, engine] = await Promise.all([read("lib/automation-engine.ts"), read("lib/playbook-engine.ts")]);
  assert.match(automation, /runPlaybooksForCapture/);
  assert.match(automation, /playbookRunIds/);
  assert.match(engine, /capture:\$\{input\.captureId\}:\$\{match\.playbookKey\}/);
  assert.match(engine, /sourceCaptureId/);
  assert.match(engine, /playbookRunId/);
});

test("playbook steps remain inside policy and approval boundaries", async () => {
  const engine = await read("lib/playbook-engine.ts");
  assert.match(engine, /requestedAction: "analyze_internal"/);
  assert.match(engine, /actionType: "analyze_internal"/);
  assert.doesNotMatch(engine, /executeConnectorAction|checkout\.sessions\.create|publishContent/);
  assert.match(engine, /Do not schedule automatically/);
  assert.match(engine, /Do not publish/);
  assert.match(engine, /Do not create a charge/);
});

test("owner playbook API supports inspection, pause, enable, run, and wake-up sweep", async () => {
  const route = await read("app/api/playbooks/route.ts");
  assert.match(route, /requireOwner/);
  assert.match(route, /listPlaybookOperations/);
  assert.match(route, /payload\.action === "toggle"/);
  assert.match(route, /payload\.action === "sweep"/);
  assert.match(route, /runPlaybook/);
  assert.match(route, /playbook\.enabled|playbook\.disabled/);
});

test("AI Operations exposes functional playbook controls and a run ledger", async () => {
  const [workspace, ui] = await Promise.all([read("app/api/workspace/route.ts"), read("app/legacy-app.tsx")]);
  assert.match(workspace, /automationPlaybooks: playbookOperations\.playbooks/);
  assert.match(workspace, /automationPlaybookRuns: playbookOperations\.runs/);
  assert.match(workspace, /automationPlaybookSteps: playbookOperations\.steps/);
  assert.match(ui, /PRODUCTION AUTOMATIONS/);
  assert.match(ui, /Recent playbook runs/);
  assert.match(ui, /action: "toggle"/);
  assert.match(ui, /action: "run"/);
});

test("Stage 20 migration is additive and preserves existing alpha records", async () => {
  const migration = await read("drizzle/0014_pink_vector.sql");
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|ALTER TABLE/i);
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("CREATE TABLE workspaces (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE capture_events (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE projects (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE clients (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE agent_tasks (id text PRIMARY KEY NOT NULL)");
  database.exec("INSERT INTO workspaces VALUES ('legacy-lines')");
  database.exec("INSERT INTO projects VALUES ('project-existing')");
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  assert.equal(database.prepare("SELECT count(*) AS count FROM projects").get().count, 1);
  assert.equal(database.prepare("SELECT count(*) AS count FROM automation_playbooks").get().count, 0);
  assert.equal(database.prepare("SELECT count(*) AS count FROM automation_playbook_runs").get().count, 0);
  assert.equal(database.prepare("SELECT count(*) AS count FROM automation_playbook_steps").get().count, 0);
});

test("Stage 20 release documents real scheduling and autonomy limits", async () => {
  const [changelog, notes] = await Promise.all([read("CHANGELOG.md"), read("docs/PRODUCTION_AUTOMATION_PLAYBOOKS.md")]);
  assert.match(changelog, /0\.7\.0-alpha\.20/);
  assert.match(changelog, /Production Automation Playbooks|nine production automation playbooks/i);
  assert.match(notes, /does not claim a continuously running external cron service/i);
  assert.match(notes, /cannot yet edit their step graph/i);
  assert.match(notes, /no drops, deletes, table rewrites, or data backfills/i);
});
