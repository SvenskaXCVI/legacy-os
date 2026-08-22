import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("light mode replaces remaining dark operational surfaces", async () => {
  const css = await read("app/globals.css");
  for (const selector of [
    "portal-launch",
    "radio-card",
    "notification-settings > button",
    "operations-banner",
    "chief-hero-card",
    "pattern-grid article",
    "analytics-tabs button",
    "analytics-record-list > article",
    "design-toolbar",
    "client-media-showcase",
  ]) {
    assert.match(css, new RegExp(`data-theme="light"\\] \\.${selector.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`));
  }
  assert.match(css, /--light-surface: #fffefa/);
  assert.match(css, /select \{ color-scheme: light/);
});

test("appearance controls have consistent interior spacing", async () => {
  const css = await read("app/globals.css");
  assert.match(css, /\.personalization-card \{ min-height: 310px; padding-bottom: 24px/);
  assert.match(css, /\.personalization-intro \{[^}]*margin: 16px 20px 18px/);
  assert.match(css, /\.theme-choice-grid,[\s\S]*?\.accent-choice-grid \{ margin-right: 20px; margin-left: 20px/);
});

test("Daylight Forge credit bypasses hosted image optimization", async () => {
  const ui = await read("app/legacy-app.tsx");
  const css = await read("app/globals.css");
  assert.match(ui, /className="daylight-credit-mark"/);
  assert.match(ui, /aria-label="Powered by Daylight Forge"/);
  assert.match(css, /background: url\("\/daylight-forge\.png"\) center \/ contain no-repeat/);
  assert.doesNotMatch(ui, /<NextImage src="\/daylight-forge\.png"/);
});

test("Stage 13 is versioned and contains no data migration", async () => {
  const version = await read("lib/version.ts");
  const pkg = JSON.parse(await read("package.json"));
  const notes = await read("docs/LIGHT_MODE_READABILITY.md");
  assert.equal(pkg.version, "0.7.0-alpha.13");
  assert.match(version, /Stage 13 · Light Mode Readability/);
  assert.match(notes, /no database migration/i);
});
