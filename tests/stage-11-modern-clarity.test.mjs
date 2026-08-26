import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("modern font tokens use the bundled Geist families", async () => {
  const layout = await read("app/layout.tsx");
  const css = await read("app/globals.css");
  assert.match(layout, /Geist, Geist_Mono/);
  assert.match(css, /--display: var\(--font-geist-sans\)/);
  assert.match(css, /--body: var\(--font-geist-sans\)/);
  assert.match(css, /--mono: var\(--font-geist-mono\)/);
  assert.match(css, /Stage 11: modern readability/);
});

test("owner navigation keeps every feature directly accessible in clearer groups", async () => {
  const ui = await read("app/legacy-app.tsx");
  for (const label of ["WORKSPACE", "CREATE", "BUSINESS & AI", "SETTINGS"]) {
    assert.match(ui, new RegExp(`label: "${label.replace("&", "\\&")}"`));
  }
  for (const view of ["dashboard", "clients", "projects", "calendar", "inbox", "design", "knowledge", "content", "finances", "analytics", "chief", "operations", "settings"]) {
    assert.match(ui, new RegExp(`id: "${view}"`));
  }
});

test("client workspace displays actual secure image uploads with newest first", async () => {
  const ui = await read("app/legacy-app.tsx");
  assert.match(ui, /clientImageAssets/);
  assert.match(ui, /projectIds\.has\(asset\.projectId\)/);
  assert.match(ui, /new Date\(right\.createdAt\).*new Date\(left\.createdAt\)/);
  assert.match(ui, /Newest upload/);
  assert.match(ui, /<AssetPreview asset=\{clientImageAssets\[0\]\}/);
  assert.match(ui, /setPreviewAsset\(clientImageAssets\[0\]\)/);
  assert.match(ui, /className="asset-lightbox"/);
  assert.doesNotMatch(ui, /client-media-showcase[\s\S]{0,200}example/i);
});

test("client selection moves directly to the relationship workspace", async () => {
  const ui = await read("app/legacy-app.tsx");
  assert.match(ui, /function openClientWorkspace/);
  assert.match(ui, /selected-client-workspace/);
  assert.match(ui, /scrollIntoView/);
  assert.match(ui, /selected-row/);
});

test("Stage 11 release identity and preservation notes are present", async () => {
  const notes = await read("docs/MODERN_CLARITY.md");
  assert.match(notes, /Stage 11 — Modern Clarity/);
  assert.match(notes, /Existing alpha records and uploads remain unchanged/);
});
