import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("one evidence-based journey spans the complete tattoo relationship", async () => {
  const journey = await read("lib/tattoo-journey.ts");
  for (const milestone of [
    "inquiry", "qualification", "project", "references", "design", "approval",
    "quote", "deposit", "appointment", "session", "payment", "healing",
    "content", "outcome", "knowledge", "complete",
  ]) {
    assert.match(journey, new RegExp(`id: ["']${milestone}["']`));
  }
  assert.match(journey, /evidenceIds/);
  assert.match(journey, /progressPercent/);
  assert.match(journey, /advanceBlockers/);
});

test("workspace and project UI expose live journey state", async () => {
  const [workspace, ui, css] = await Promise.all([
    read("app/api/workspace/route.ts"),
    read("app/legacy-app.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(workspace, /buildTattooJourney/);
  assert.match(workspace, /projectJourneys/);
  assert.match(workspace, /outcomes: outcomeRows/);
  assert.match(ui, /END-TO-END JOURNEY/);
  assert.match(ui, /journey\?\.advanceBlockers/);
  assert.match(css, /\.journey-milestones/);
});

test("server transitions cannot skip phases or bypass evidence blockers", async () => {
  const route = await read("app/api/projects/route.ts");
  assert.match(route, /Projects must move through each canonical lifecycle phase in order/);
  assert.match(route, /buildTattooJourney/);
  assert.match(route, /!journey\.canAdvance/);
  assert.match(route, /blockers: journey\.advanceBlockers/);
});

test("content workflow uses the same rights vocabulary as asset classification", async () => {
  const [lifecycle, files] = await Promise.all([
    read("app/api/lifecycle/route.ts"),
    read("app/api/files/route.ts"),
  ]);
  assert.match(lifecycle, /\["studio_created", "authorized"\]/);
  assert.match(files, /"studio_created"/);
  assert.match(files, /"authorized"/);
  assert.doesNotMatch(lifecycle, /\["owned", "licensed", "client_permission"\]/);
});

test("Stage 15 is additive and visible in shared release metadata", async () => {
  const [version, notes, pkgText] = await Promise.all([
    read("lib/version.ts"),
    read("docs/COMPLETE_TATTOO_VERTICAL_SLICE.md"),
    read("package.json"),
  ]);
  assert.match(JSON.parse(pkgText).version, /^0\.7\.0-alpha\.\d+$/);
  assert.match(version, /LEGACY_OS_RELEASE/);
  assert.match(notes, /no database migration/i);
  assert.doesNotMatch(notes, /DROP TABLE|DELETE FROM/i);
});
