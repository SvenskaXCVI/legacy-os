import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Stage 25 defines all eight bounded specialists and a common trustworthy contract", async () => {
  const engine = await read("lib/specialist-intelligence-engine.ts");
  for (const specialist of ["client_manager", "design_director", "knowledge_librarian", "operations_manager", "scheduling_coordinator", "finance_manager", "content_producer", "analytics_advisor"]) {
    assert.match(engine, new RegExp(`agentKey: "${specialist}"`));
  }
  assert.match(engine, /facts: Record<string/);
  assert.match(engine, /findings: Finding\[\]/);
  assert.match(engine, /recommendations: SuggestedAction\[\]/);
  assert.match(engine, /evidenceRefs: string\[\]/);
  assert.match(engine, /limitations: string\[\]/);
  assert.match(engine, /confidenceBps: number/);
});

test("Stage 25 reads real state, isolates non-operational projects, and validates scope", async () => {
  const engine = await read("lib/specialist-intelligence-engine.ts");
  assert.match(engine, /eq\(projects\.isTest, false\)/);
  assert.match(engine, /isNull\(projects\.archivedAt\)/);
  assert.match(engine, /Specialist project scope is unavailable or excluded from intelligence/);
  assert.match(engine, /Specialist project and client scopes do not match/);
  for (const table of ["appointments", "approvals", "assets", "clientMessages", "paymentRequests", "tattooSessions", "healingCheckins", "contentCandidates", "consentGrants", "knowledgeItems", "memoryRecords", "patterns", "outcomes"]) {
    assert.match(engine, new RegExp(`from\\(${table}\\)`));
  }
});

test("Stage 25 preserves domain boundaries and deterministic financial truth", async () => {
  const engine = await read("lib/specialist-intelligence-engine.ts");
  assert.match(engine, /unreadClientMessages/);
  assert.match(engine, /exactApprovedVersions/);
  assert.match(engine, /preservedDisagreements/);
  assert.match(engine, /projectsMissingNextAction/);
  assert.match(engine, /Calendar overlap detected/);
  assert.match(engine, /realizedNetCents = collected - refunded/);
  assert.match(engine, /do not treat requested or quoted amounts as collected revenue/i);
  assert.match(engine, /rights or consent evidence is insufficient/i);
  assert.match(engine, /Correlation remains distinct from causation/);
});

test("Stage 25 model interpretation is structured, evidence-bound, confidence-capped, and optional", async () => {
  const engine = await read("lib/specialist-intelligence-engine.ts");
  assert.match(engine, /runStructuredModel/);
  assert.match(engine, /successCriteria: profile\.success/);
  assert.match(engine, /stopRule: profile\.stop/);
  assert.match(engine, /item\.evidenceRefs\.every\(\(ref\) => allowedEvidence\.has\(ref\)\)/);
  assert.match(engine, /Math\.min\(result\.confidenceBps, model\.data\.confidenceBps\)/);
  assert.match(engine, /deterministic specialist remains fully operational when a provider is unavailable/i);
  assert.doesNotMatch(engine, /messageRows\.map\(.*body/s);
});

test("Stage 25 routes specialist work through existing tasks, authority, traces, and usage", async () => {
  const [agent, route] = await Promise.all([read("lib/agent-engine.ts"), read("app/api/specialists/route.ts")]);
  assert.match(agent, /evaluateSpecialistTask/);
  assert.match(agent, /specialistEvaluations/);
  assert.match(agent, /usageEvents/);
  assert.match(agent, /evaluateToolAuthority/);
  assert.match(agent, /assertToolExecutionAuthorized/);
  assert.match(route, /requireOwner\(request\)/);
  assert.match(route, /routeAgentTask/);
  assert.match(route, /payload\.domain === "all"/);
  assert.match(route, /idempotencyKey: `specialist:/);
});

test("Stage 25 exposes an owner console for scoped runs and all eight evaluations", async () => {
  const [ui, css, workspace] = await Promise.all([read("app/legacy-app.tsx"), read("app/globals.css"), read("app/api/workspace/route.ts")]);
  assert.match(ui, /SPECIALIST INTELLIGENCE/);
  assert.match(ui, /runSpecialistIntelligence/);
  assert.match(ui, /value="all"/);
  assert.match(ui, /specialistDomains\.map/);
  assert.match(css, /\.specialist-run-form/);
  assert.match(css, /\.specialist-domain-grid/);
  assert.match(workspace, /specialistEvaluationRows/);
});

test("Stage 25 migration is additive and preserves existing alpha records", async () => {
  const migration = await read("drizzle/0019_closed_captain_midlands.sql");
  assert.doesNotMatch(migration, /^\s*(?:DROP TABLE|DELETE FROM|UPDATE\s)/im);
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("CREATE TABLE workspaces (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE agent_tasks (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE ai_runs (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE projects (id text PRIMARY KEY NOT NULL, title text)");
  database.exec("CREATE TABLE clients (id text PRIMARY KEY NOT NULL)");
  database.exec("INSERT INTO projects (id, title) VALUES ('project-existing', 'Alpha project')");
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  assert.equal(database.prepare("SELECT title FROM projects WHERE id = 'project-existing'").get().title, "Alpha project");
  assert.equal(database.prepare("SELECT count(*) AS count FROM specialist_evaluations").get().count, 0);
});

test("Stage 25 release notes state its capabilities and honest external boundary", async () => {
  const [pkg, version, changelog, notes, api] = await Promise.all([read("package.json"), read("lib/version.ts"), read("CHANGELOG.md"), read("docs/SPECIALIST_INTELLIGENCE.md"), read("docs/API.md")]);
  assert.ok(Number(JSON.parse(pkg).version.match(/alpha\.(\d+)/)?.[1]) >= 25);
  assert.match(version, /Stage \d+ ·/);
  assert.match(changelog, /0\.7\.0-alpha\.25/);
  assert.match(notes, /does not claim that every external service is connected/i);
  assert.match(notes, /does not receive raw client-message bodies/i);
  assert.match(api, /GET \/api\/specialists/);
});
