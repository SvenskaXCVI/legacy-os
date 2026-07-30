import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

test("Legacy OS command center contains the required product surfaces", async () => {
  const [page, app, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/legacy-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Legacy OS — Daily Command Center/);
  assert.match(app, /Good morning/);
  assert.match(app, /Approval queue/);
  assert.match(app, /What the AI did/);
  assert.match(app, /AI OPERATIONS · GLASS BOX/);
  assert.match(app, /Metadata only/);
  assert.match(css, /\.assistant-rail/);
  assert.doesNotMatch(page, /codex-preview/);
  assert.doesNotMatch(app, /react-loading-skeleton/);
});

test("starter preview is fully removed", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(layout, /Starter Project/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview", templateRoot)));
});
