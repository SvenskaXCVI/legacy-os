import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Stage 31 stores historical provenance without replaying current automations", async () => {
  const [schema, route, migration] = await Promise.all([
    read("db/schema.ts"),
    read("app/api/projects/route.ts"),
    read("drizzle/0024_windy_rocket_racer.sql"),
  ]);

  assert.match(schema, /originMode: text\("origin_mode"\)/);
  assert.match(schema, /historicalStartedAt: text\("historical_started_at"\)/);
  assert.match(schema, /financialClassification: text\("financial_classification"\)/);
  assert.match(route, /action: originMode === "imported" \? "project\.imported" : "project\.created"/);
  assert.match(route, /if \(originMode === "new"\)[\s\S]*captureAutomationSignal/);
  assert.match(migration, /ALTER TABLE `projects` ADD `origin_mode`/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|UPDATE `projects`/);
});

test("Stage 31 labels unavailable historical evidence instead of inventing it", async () => {
  const [journey, app] = await Promise.all([
    read("lib/tattoo-journey.ts"),
    read("app/legacy-app.tsx"),
  ]);

  assert.match(journey, /JourneyMilestoneStatus = [^;]*"waived"/);
  assert.match(journey, /Historical evidence unavailable · imported record/);
  assert.match(app, /Existing work started before Legacy OS/);
  assert.match(app, /Missing earlier evidence is labeled unavailable, never invented/);
  assert.match(app, /financialClassification/);
});
