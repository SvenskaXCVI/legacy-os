import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("personalization offers two themes and eight curated accents", async () => {
  const ui = await read("app/legacy-app.tsx");
  const css = await read("app/globals.css");
  assert.match(ui, /Personalization/);
  assert.match(ui, /theme: "dark"/);
  assert.match(ui, /theme: "light"/);
  for (const accent of ["gold", "amber", "coral", "rose", "violet", "blue", "teal", "emerald"]) {
    assert.match(ui, new RegExp(`id: "${accent}"`));
    assert.match(css, new RegExp(`data-accent="${accent}"`));
  }
  assert.match(ui, /legacy_personalization/);
  assert.match(css, /data-theme="light"/);
});

test("theme is restored before paint and controls are wired", async () => {
  const layout = await read("app/layout.tsx");
  const ui = await read("app/legacy-app.tsx");
  assert.match(layout, /legacy_personalization/);
  assert.match(layout, /suppressHydrationWarning/);
  assert.match(ui, /onPersonalization\(\{ \.\.\.personalization, theme: "dark" \}\)/);
  assert.match(ui, /onPersonalization\(\{ \.\.\.personalization, theme: "light" \}\)/);
  assert.match(ui, /applyPersonalization\(next\)/);
});

test("Daylight Forge credit is subtle and uses the supplied asset", async () => {
  const ui = await read("app/legacy-app.tsx");
  const css = await read("app/globals.css");
  const asset = await stat(new URL("../public/daylight-forge.png", import.meta.url));
  assert.ok(asset.size > 10_000);
  assert.match(ui, /alt="Powered by Daylight Forge"/);
  assert.match(css, /\.daylight-credit/);
  assert.match(css, /opacity: \.48/);
});

test("marked dense areas receive readable sizing and repaired layout", async () => {
  const css = await read("app/globals.css");
  assert.match(css, /\.project-progress \{[\s\S]*?height: 8px/);
  assert.match(css, /\.conversation-list > button strong \{ font-size: \.78rem/);
  assert.match(css, /\.module-records strong \{ font-size: \.79rem/);
  assert.match(css, /\.pattern-grid p \{ font-size: \.76rem/);
  assert.match(css, /\.health-card > p\.settings-placeholder \{ display: block/);
  assert.match(css, /\.settings-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("Stage 12 is versioned and preserves alpha data", async () => {
  const version = await read("lib/version.ts");
  const pkg = JSON.parse(await read("package.json"));
  const notes = await read("docs/PERSONALIZATION_AND_REFINEMENT.md");
  assert.equal(pkg.version, "0.7.0-alpha.12");
  assert.match(version, /Stage 12 · Personalization & Polish/);
  assert.match(notes, /no database migration/i);
});
