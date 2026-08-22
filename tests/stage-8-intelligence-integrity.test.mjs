import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("learning cycles are fingerprinted and unchanged evidence cannot create duplicate knowledge", async () => {
  const engine = await read("lib/intelligence-engine.ts");
  assert.match(engine, /evidenceFingerprint = await hash/);
  assert.match(engine, /if \(sameEvidenceCycle\)/);
  assert.match(engine, /eventType: "learning\.no_change"/);
  assert.match(engine, /Existing knowledge and confidence scores were left unchanged/);
  assert.match(engine, /status: "no_change", knowledgeChanged: false/);
});

test("pattern versions change only when their own evidence changes", async () => {
  const engine = await read("lib/intelligence-engine.ts");
  assert.match(engine, /existing\.evidenceHash !== evidenceHash/);
  assert.match(engine, /existing\.version \+ \(patternChanged \? 1 : 0\)/);
  assert.match(engine, /if \(patternChanged\) \{/);
  assert.match(engine, /eligibleObservationIds: eligible\.map/);
  assert.match(engine, /newObservationIds: newEvidenceRows\.map/);
});

test("taxonomy aliases converge on creator-facing concepts", async () => {
  const engine = await read("lib/intelligence-engine.ts");
  const ui = await read("app/legacy-app.tsx");
  assert.match(engine, /"black and gray": "black & grey"/);
  assert.match(engine, /fineline: "fine line"/);
  assert.match(engine, /canonicalSignalKey/);
  assert.match(engine, /Inquiry qualification evidence/);
  assert.match(ui, /canonicalKnowledgeTag/);
  assert.match(ui, /"black & gray": "Black & Grey"/);
});

test("Chief of Staff ranks live safety and relationship signals with reasons and evidence", async () => {
  const briefing = await read("app/api/briefing/route.ts");
  const ui = await read("app/legacy-app.tsx");
  assert.match(briefing, /healingAttention/);
  assert.match(briefing, /unreadClientMessages/);
  assert.match(briefing, /openPayments/);
  assert.match(briefing, /score: item\.concernFlag \? 100 : 95/);
  assert.match(briefing, /score: 90/);
  assert.match(briefing, /score: 85/);
  assert.match(briefing, /reason:/);
  assert.match(briefing, /evidence:/);
  assert.match(ui, /priority\.reason/);
  assert.match(ui, /Evidence: \{priority\.evidence\}/);
});

test("superseded taxonomy aliases are hidden from the active intelligence view", async () => {
  const api = await read("app/api/intelligence/route.ts");
  const engine = await read("lib/intelligence-engine.ts");
  assert.match(api, /inArray\(patterns\.status, \["active", "candidate"\]\)/);
  assert.match(engine, /status: "superseded"/);
});

test("Stage 8 migration is additive and preserves existing intelligence rows", async () => {
  const database = new DatabaseSync(":memory:");
  const priorMigrations = [
    "drizzle/0000_past_alice.sql", "drizzle/0001_free_runaways.sql",
    "drizzle/0002_chubby_bruce_banner.sql", "drizzle/0003_careless_sunfire.sql",
    "drizzle/0004_parallel_pyro.sql", "drizzle/0005_tiresome_calypso.sql",
    "drizzle/0006_fine_madame_web.sql", "drizzle/0007_cooing_patch.sql",
    "drizzle/0008_sudden_orphan.sql",
  ];
  for (const migrationPath of priorMigrations) {
    database.exec((await read(migrationPath)).replaceAll("--> statement-breakpoint", ""));
  }
  database.exec("insert into workspaces (id, name) values ('ws-stage8', 'Stage 8 Test')");
  database.exec("insert into learning_cycles (id, workspace_id, trigger_type) values ('cycle-old', 'ws-stage8', 'manual')");
  database.exec("insert into patterns (id, workspace_id, pattern_key, name, description, why_it_matters, first_seen_at, last_seen_at, last_evaluated_at) values ('pattern-old', 'ws-stage8', 'project.style:black-gray', 'Old label', 'Existing description', 'Existing reason', '2026-01-01', '2026-01-01', '2026-01-01')");

  const migration = await read("drizzle/0009_panoramic_peter_parker.sql");
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM/);
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));

  const cycle = database.prepare("select id, eligible_observations, new_evidence_count, knowledge_changed, change_set_json from learning_cycles where id = 'cycle-old'").get();
  const pattern = database.prepare("select id, evidence_hash from patterns where id = 'pattern-old'").get();
  assert.deepEqual({ ...cycle }, { id: "cycle-old", eligible_observations: 0, new_evidence_count: 0, knowledge_changed: 0, change_set_json: "{}" });
  assert.deepEqual({ ...pattern }, { id: "pattern-old", evidence_hash: null });
  database.close();
});

test("Stage 8 release identity is centralized", async () => {
  const version = await read("lib/version.ts");
  const pkg = JSON.parse(await read("package.json"));
  assert.equal(pkg.version, "0.7.0-alpha.8");
  assert.match(version, /0\.7\.0-alpha\.8/);
  assert.match(version, /Stage 8 · Intelligence Integrity/);
  assert.match(await read("docs/INTELLIGENCE_INTEGRITY.md"), /Evidence-aware learning/);
});
