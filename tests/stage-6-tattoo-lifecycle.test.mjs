import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("session completion requires approval and schedules bounded healing follow-ups", async () => {
  const route = await read("app/api/lifecycle/route.ts");
  assert.match(route, /An approved project artifact is required/);
  assert.match(route, /const HEALING_DAYS = \[3, 7, 14, 30\]/);
  assert.match(route, /onConflictDoNothing/);
  assert.match(route, /lifecyclePhase: "healing"/);
  assert.match(route, /session_duration_minutes/);
});

test("client lifecycle data is scoped and private technique notes are not selected", async () => {
  const route = await read("app/api/portal/lifecycle/route.ts");
  assert.match(route, /eq\(tattooSessions\.clientId, access\.clientId\)/);
  assert.match(route, /eq\(healingCheckins\.clientId, access\.clientId\)/);
  assert.doesNotMatch(route, /techniqueNotes: tattooSessions\.techniqueNotes/);
  assert.doesNotMatch(route, /needleSetup: tattooSessions\.needleSetup/);
  assert.match(route, /rating < 1 \|\| rating > 5/);
});

test("content generation requires rights and revocable media consent", async () => {
  const route = await read("app/api/lifecycle/route.ts");
  const portal = await read("app/api/portal/lifecycle/route.ts");
  assert.match(route, /!asset\.contentEligible/);
  assert.match(route, /asset\.consentStatus !== "granted"/);
  assert.match(route, /consentType, "tattoo_media_use"/);
  assert.match(route, /publishingPerformed: false/);
  assert.match(portal, /grant_media_consent/);
  assert.match(portal, /revoke_media_consent/);
});

test("Stage 6 migration is additive and preserves existing project data", async () => {
  const migration = await read("drizzle/0008_sudden_orphan.sql");
  assert.doesNotMatch(migration, /\bDROP\s+TABLE\b/i);
  assert.doesNotMatch(migration, /\bDELETE\s+FROM\b/i);
  assert.match(migration, /CREATE TABLE `tattoo_sessions`/);
  assert.match(migration, /CREATE TABLE `healing_checkins`/);
  assert.match(migration, /CREATE TABLE `content_candidates`/);
  const database = new DatabaseSync(":memory:");
  for (const path of [
    "drizzle/0000_past_alice.sql", "drizzle/0001_free_runaways.sql",
    "drizzle/0002_chubby_bruce_banner.sql", "drizzle/0003_careless_sunfire.sql",
    "drizzle/0004_parallel_pyro.sql", "drizzle/0005_tiresome_calypso.sql",
    "drizzle/0006_fine_madame_web.sql", "drizzle/0007_cooing_patch.sql",
  ]) database.exec((await read(path)).replaceAll("--> statement-breakpoint", ""));
  database.exec(`
    INSERT INTO clients (id, workspace_id, first_name, last_name, display_name) VALUES ('stage6-client', 'legacy-lines', 'Alpha', '', 'Alpha');
    INSERT INTO projects (id, workspace_id, client_id, title) VALUES ('stage6-project', 'legacy-lines', 'stage6-client', 'Existing project');
  `);
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  assert.equal(database.prepare("SELECT title FROM projects WHERE id = ?").get("stage6-project").title, "Existing project");
  assert.equal(database.prepare("SELECT count(*) AS count FROM tattoo_sessions").get().count, 0);
  database.close();
});

test("release identity remains centralized after Stage 6", async () => {
  const version = await read("lib/version.ts");
  const pkg = JSON.parse(await read("package.json"));
  assert.match(version, new RegExp(`LEGACY_OS_VERSION = ["']${pkg.version.replaceAll(".", "\\.")}["']`));
  assert.match(await read("docs/TATTOO_LIFECYCLE.md"), /Stage 6/);
});
