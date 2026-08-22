import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Stage 27 stores session conditions and owner-reviewed healing outcomes as separate evidence", async () => {
  const schema = await read("db/schema.ts");
  for (const field of ["machineName", "machineType", "needleGroupingsJson", "inkWashJson", "voltageMinMv", "voltageMaxMv", "techniquesJson", "skinResponse", "clientResponse", "freshOutcomeRating", "ownerAssessment", "freshAssetIdsJson", "completenessBps"]) assert.match(schema, new RegExp(`${field}:`));
  for (const field of ["healingPhase", "retentionRating", "saturationRating", "lineQualityRating", "smoothnessRating", "healedOutcomeRating", "touchupRequired", "clientFeedbackSummary", "photoAssetIdsJson"]) assert.match(schema, new RegExp(`${field}:`));
  assert.match(schema, /uniqueIndex\("session_craft_records_session_uq"\)/);
  assert.match(schema, /uniqueIndex\("healing_assessments_checkin_uq"\)/);
});

test("craft capture is owner-only, scope-checked, bounded, and keeps private evidence out of the client portal", async () => {
  const [route, portal] = await Promise.all([read("app/api/craft/route.ts"), read("app/api/portal/lifecycle/route.ts")]);
  assert.match(route, /requireOwner\(request\)/);
  assert.match(route, /Test and archived projects cannot contribute craft evidence/);
  assert.match(route, /Every fresh-result photo must belong to this project/);
  assert.match(route, /Every healing photo must belong to this project/);
  assert.match(route, /Voltage must be between 3\.0 and 15\.0 V/);
  assert.match(route, /medicalDiagnosisGenerated: false/);
  assert.doesNotMatch(portal, /sessionCraftRecords|healingAssessments|ownerAssessment|voltageMinMv/);
});

test("meaningful craft patterns require repeated independent healed evidence", async () => {
  const engine = await read("lib/craft-intelligence.ts");
  assert.match(engine, /completedProjects: 3/);
  assert.match(engine, /distinctClients: 2/);
  assert.match(engine, /effectBps: 1000/);
  assert.match(engine, /confidenceBps: 6500/);
  assert.match(engine, /recordCompletenessBps: 7000/);
  assert.match(engine, /projectCount >= CRAFT_PROMOTION_THRESHOLDS\.completedProjects/);
  assert.match(engine, /clientCount >= CRAFT_PROMOTION_THRESHOLDS\.distinctClients/);
});

test("the evaluator excludes test work and incomplete or unhealed sessions", async () => {
  const engine = await read("lib/craft-intelligence.ts");
  assert.match(engine, /eq\(projects\.isTest, false\)/);
  assert.match(engine, /row\.status === "completed"/);
  assert.match(engine, /\["healed", "late_healing"\]\.includes\(row\.healingPhase\)/);
  assert.match(engine, /craft\.completenessBps < CRAFT_PROMOTION_THRESHOLDS\.recordCompletenessBps/);
  assert.doesNotMatch(engine, /eq\(projects\.isTest, true\)/);
});

test("craft recommendations stay association-based and owner-controlled", async () => {
  const engine = await read("lib/craft-intelligence.ts");
  assert.match(engine, /is associated with an average healed outcome rating/);
  assert.match(engine, /it does not prove causation/);
  assert.match(engine, /if \(qualifies && stored\)/);
  assert.match(engine, /actionType: "review_craft_setup"/);
  assert.match(engine, /autonomyLevel: "owner_decision", approvalRequired: true/);
  assert.doesNotMatch(engine, /caused stronger healed outcomes/);
});

test("saving eligible evidence automatically closes the learning loop with an audit trail", async () => {
  const route = await read("app/api/craft/route.ts");
  assert.match(route, /eventType: "craft_session_recorded"/);
  assert.match(route, /eventType: "craft_healing_assessed"/);
  assert.match(route, /runCraftIntelligence\(WORKSPACE_ID, "analytics-advisor:auto", db\)/);
  assert.match(route, /action: "craft\.analysis_completed"/);
  assert.match(route, /targetType: "craft_analysis_run"/);
});

test("the owner workspace exposes complete capture, visible thresholds, candidate status, and responsive layout", async () => {
  const [ui, css, workspace] = await Promise.all([read("app/legacy-app.tsx"), read("app/globals.css"), read("app/api/workspace/route.ts")]);
  assert.match(ui, /PROFESSIONAL CRAFT INTELLIGENCE/);
  assert.match(ui, /saveSessionCraft/);
  assert.match(ui, /saveHealingAssessment/);
  assert.match(ui, /Evaluate craft evidence/);
  assert.match(ui, /minimum confidence/);
  assert.match(ui, /Owner-observed evidence, not medical advice/);
  assert.match(css, /\.craft-capture-grid/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.craft-rating-grid/);
  assert.match(workspace, /craftIntelligence/);
});

test("Stage 27 migration is additive and preserves existing alpha records", async () => {
  const migration = await read("drizzle/0021_short_wolverine.sql");
  assert.doesNotMatch(migration, /^\s*(?:DROP TABLE|DELETE FROM|UPDATE\s)/im);
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("CREATE TABLE workspaces (id text PRIMARY KEY NOT NULL, name text); CREATE TABLE clients (id text PRIMARY KEY NOT NULL); CREATE TABLE projects (id text PRIMARY KEY NOT NULL); CREATE TABLE tattoo_sessions (id text PRIMARY KEY NOT NULL); CREATE TABLE healing_checkins (id text PRIMARY KEY NOT NULL);");
  database.exec("INSERT INTO workspaces (id, name) VALUES ('legacy-lines', 'Legacy Lines')");
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  assert.equal(database.prepare("SELECT name FROM workspaces WHERE id = 'legacy-lines'").get().name, "Legacy Lines");
  for (const table of ["session_craft_records", "healing_assessments", "craft_analysis_runs"]) assert.equal(database.prepare(`SELECT count(*) AS count FROM ${table}`).get().count, 0);
});

test("Stage 27 is versioned and documents the evidence boundary", async () => {
  const [pkg, version, changelog, notes, api] = await Promise.all([read("package.json"), read("lib/version.ts"), read("CHANGELOG.md"), read("docs/PROFESSIONAL_CRAFT_INTELLIGENCE.md"), read("docs/API.md")]);
  assert.ok(Number(JSON.parse(pkg).version.match(/alpha\.(\d+)/)?.[1]) >= 27);
  assert.match(version, /LEGACY_OS_RELEASE/);
  assert.match(changelog, /0\.7\.0-alpha\.27/);
  assert.match(notes, /candidate pattern → evidence threshold → owner-reviewed recommendation/);
  assert.match(notes, /It never represents statistical proof or causation/);
  assert.match(api, /POST \/api\/craft/);
});
