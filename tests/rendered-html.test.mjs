import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

test("Legacy OS contains live owner and client product surfaces", async () => {
  const [page, app, css, workspaceApi, portalApi, intelligenceApi] =
    await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/legacy-app.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
      readFile(
        new URL("../app/api/workspace/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/api/portal/route.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../app/api/intelligence/route.ts", import.meta.url),
        "utf8",
      ),
    ]);

  assert.match(page, /Legacy OS — Studio Command Center/);
  assert.match(page, /AccessShell/);
  assert.match(app, /Example records have been removed/);
  assert.match(app, /AI Operations/);
  assert.match(app, /Client portal/);
  assert.match(app, /Request approval/);
  assert.match(app, /Share a reference/);
  assert.match(app, /CONTINUOUS INTELLIGENCE/);
  assert.match(app, /Social observation permissions/);
  assert.match(css, /\.legacy-monogram/);
  assert.match(css, /\.client-shell/);
  assert.match(css, /\.daily-brief-button/);
  assert.match(workspaceApi, /requireOwner/);
  assert.match(workspaceApi, /clients:/);
  assert.match(portalApi, /resolveClientAccess/);
  assert.match(intelligenceApi, /meaningfulPattern/);
  assert.doesNotMatch(app, /Kevin Hernandez|Marcus Rivera|Elena Martinez/);
  assert.doesNotMatch(app, /FOUNDATION PREVIEW/);
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
