import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Stage 28 stores explicit capacity, project requirements, evaluations, and approval-gated opportunities", async () => {
  const schema = await read("db/schema.ts");
  for (const table of ["schedulingProfiles", "projectScheduleRequirements", "availabilityWindows", "scheduleEvaluationRuns", "scheduleOpportunities"]) assert.match(schema, new RegExp(`export const ${table}`));
  for (const field of ["estimatedSessionMinutes", "prepMinutes", "travelMinutes", "bufferBeforeMinutes", "bufferAfterMinutes", "energyDemand", "maximumTattooMinutesPerDay", "maximumHighEnergySessionsPerDay", "weeklyRevenueTargetCents", "approvalRequired"]) assert.match(schema, new RegExp(`${field}:`));
  assert.match(schema, /uniqueIndex\("project_schedule_requirements_project_uq"\)/);
  assert.match(schema, /index\("schedule_opportunities_workspace_status_idx"\)/);
});

test("capacity is owner-defined and empty calendar time is never assumed to be available", async () => {
  const [engine, route] = await Promise.all([read("lib/scheduling-intelligence.ts"), read("app/api/scheduling/route.ts")]);
  assert.match(engine, /row\.status === "open" && row\.windowType === "tattoo"/);
  assert.match(engine, /row\.status === "protected"/);
  assert.match(engine, /Add explicit availability windows before Legacy can recommend appointment times/);
  assert.match(route, /requireOwner\(request\)/);
  assert.match(route, /source: "owner"/);
  assert.match(route, /new Set\(\["tattoo", "design", "admin", "personal"\]\)/);
});

test("scheduling readiness requires a real session-stage project, exact approval, and positive settled deposit", async () => {
  const engine = await read("lib/scheduling-intelligence.ts");
  assert.match(engine, /eq\(projects\.isTest, false\)/);
  assert.match(engine, /isNull\(projects\.archivedAt\)/);
  assert.match(engine, /project\.lifecyclePhase !== "session"/);
  assert.match(engine, /Boolean\(row\.assetId && row\.assetSha256\)/);
  assert.match(engine, /new Set\(\["paid", "partially_refunded"\]\)/);
  assert.match(engine, /row\.amountPaidCents - row\.amountRefundedCents > 0/);
  assert.doesNotMatch(engine, /new Set\(\["paid", "partially_refunded", "refunded"\]\)/);
});

test("the evaluator accounts for preparation, travel, buffers, protected time, conflicts, energy, and daily workload", async () => {
  const engine = await read("lib/scheduling-intelligence.ts");
  for (const signal of ["defaultPrepMinutes", "defaultTravelMinutes", "defaultBufferBeforeMinutes", "defaultBufferAfterMinutes", "maximumHighEnergySessionsPerDay", "maximumTattooMinutesPerDay", "energyRank", "openSegments"]) assert.match(engine, new RegExp(signal));
  assert.match(engine, /activeAppointments\.has\(row\.status\)/);
  assert.match(engine, /conflicts\.push\(\{ start: best\.reservedFrom, end: best\.reservedUntil/);
  assert.match(engine, /aTarget - bTarget \|\| b\.projectedRevenueCents/);
});

test("financial goals use net settled collections and never describe projected value as collected revenue", async () => {
  const engine = await read("lib/scheduling-intelligence.ts");
  assert.match(engine, /settledPayments\.has\(row\.status\) && row\.paidAt/);
  assert.match(engine, /Math\.max\(0, row\.amountPaidCents - row\.amountRefundedCents\)/);
  assert.match(engine, /weeklyRevenueGapCents/);
  assert.match(engine, /projected value is used only to rank otherwise ready fits/);
  assert.match(engine, /not treated as collected revenue/);
});

test("a scheduling proposal cannot book directly and is revalidated before exact owner approval", async () => {
  const route = await read("app/api/scheduling/route.ts");
  assert.match(route, /action === "request_booking"/);
  assert.match(route, /The supporting availability window is no longer open/);
  assert.match(route, /reservedStart < new Date\(window\.startsAt\)/);
  assert.match(route, /protectedRows\.some/);
  assert.match(route, /suggested time now conflicts with an existing appointment/);
  assert.match(route, /Approval or deposit evidence changed/);
  assert.match(route, /routeAgentTask\(\{/);
  assert.match(route, /requestedAction: "schedule_appointment"/);
  assert.match(route, /idempotencyKey: `schedule-opportunity:\$\{opportunity\.id\}`/);
  assert.match(route, /status: "held_for_approval"/);
  assert.doesNotMatch(route, /db\.insert\(appointments\)/);
});

test("the owner calendar exposes usable capacity controls and responsive scheduling evidence", async () => {
  const [ui, css, workspace] = await Promise.all([read("app/legacy-app.tsx"), read("app/globals.css"), read("app/api/workspace/route.ts")]);
  assert.match(ui, /CAPACITY INTELLIGENCE/);
  assert.match(ui, /Empty time is not automatically usable time/);
  assert.match(ui, /createCapacityWindow/);
  assert.match(ui, /saveProjectRequirement/);
  assert.match(ui, /saveSchedulingPolicy/);
  assert.match(ui, /Every booking requires exact owner approval/);
  assert.match(css, /\.scheduling-control-grid/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.scheduling-policy-form/);
  assert.match(workspace, /schedulingIntelligence/);
});

test("Stage 28 migration is additive and preserves existing alpha records", async () => {
  const migration = await read("drizzle/0022_tense_the_professor.sql");
  assert.doesNotMatch(migration, /^\s*(?:DROP TABLE|DELETE FROM|UPDATE\s)/im);
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("CREATE TABLE workspaces (id text PRIMARY KEY NOT NULL, name text); CREATE TABLE projects (id text PRIMARY KEY NOT NULL); CREATE TABLE clients (id text PRIMARY KEY NOT NULL); CREATE TABLE agent_tasks (id text PRIMARY KEY NOT NULL);");
  database.exec("INSERT INTO workspaces (id, name) VALUES ('legacy-lines', 'Legacy Lines')");
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  assert.equal(database.prepare("SELECT name FROM workspaces WHERE id = 'legacy-lines'").get().name, "Legacy Lines");
  for (const table of ["scheduling_profiles", "project_schedule_requirements", "availability_windows", "schedule_evaluation_runs", "schedule_opportunities"]) assert.equal(database.prepare(`SELECT count(*) AS count FROM ${table}`).get().count, 0);
});

test("Stage 28 is versioned and documents scheduling authority and persistence boundaries", async () => {
  const [pkg, version, changelog, notes, api] = await Promise.all([read("package.json"), read("lib/version.ts"), read("CHANGELOG.md"), read("docs/SCHEDULING_AND_CAPACITY_INTELLIGENCE.md"), read("docs/API.md")]);
  assert.ok(Number(JSON.parse(pkg).version.match(/alpha\.(\d+)/)?.[1]) >= 28);
  assert.match(version, /LEGACY_OS_RELEASE/);
  assert.match(changelog, /0\.7\.0-alpha\.28/);
  assert.match(notes, /The evaluator itself never inserts an appointment/);
  assert.match(notes, /does not update, delete, or replace existing alpha records/);
  assert.match(api, /GET \/api\/scheduling/);
});
