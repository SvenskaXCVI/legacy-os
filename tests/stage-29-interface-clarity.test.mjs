import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("AI Operations is divided into focused, navigable workspaces", async () => {
  const app = await read("app/legacy-app.tsx");
  for (const section of ["overview", "automations", "intelligence", "workforce", "learning", "activity"]) {
    assert.match(app, new RegExp(`id: "${section}"`));
    assert.match(app, new RegExp(`operationsSection === "${section}"`));
  }
  assert.match(app, /operations-section-tabs/);
  assert.match(app, /operations-overview-grid/);
});

test("the interface uses shared geometry for controls and responsive field rows", async () => {
  const css = await read("app/globals.css");
  assert.match(css, /input\[type="datetime-local"\]/);
  assert.match(css, /input\[type="date"\]/);
  assert.match(css, /min-height:\s*46px/);
  assert.match(css, /\.operations-section-tabs/);
  assert.match(css, /overflow-x:\s*clip/);
  assert.match(css, /@media \(max-width:\s*760px\)/);
});

test("knowledge memory presents readable summaries with optional provenance", async () => {
  const app = await read("app/legacy-app.tsx");
  assert.match(app, /memory-provenance/);
  assert.match(app, /Evidence and provenance/);
  assert.match(app, /JSON\.parse\(match\[0\]\)/);
  assert.doesNotMatch(app, /detail:\s*memory\.content/);
});

test("scheduling and module empty states use compact, centered layouts", async () => {
  const css = await read("app/globals.css");
  assert.match(css, /\.scheduling-intelligence-panel \.empty-state/);
  assert.match(css, /\.module-surface \.tall-empty/);
  assert.match(css, /place-items:\s*center/);
});

test("Stage 29 is explicitly data-safe and versioned", async () => {
  const [version, pkgRaw, changelog] = await Promise.all([
    read("lib/version.ts"),
    read("package.json"),
    read("CHANGELOG.md"),
  ]);
  assert.match(version, /0\.7\.0-alpha\.29/);
  assert.equal(JSON.parse(pkgRaw).version, "0.7.0-alpha.29");
  assert.match(changelog, /presentation-only/);
  assert.match(changelog, /does not add a migration/);
});
