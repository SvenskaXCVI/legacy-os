import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("private project images are previewed through authenticated file access", async () => {
  const ui = await read("app/legacy-app.tsx");
  const files = await read("app/api/files/route.ts");
  assert.match(ui, /function AssetPreview/);
  assert.match(ui, /fetchAssetBlob\(asset, portalToken\)/);
  assert.match(ui, /<AssetPreview asset=\{selectedAsset\}/);
  assert.match(ui, /approval-artifact/);
  assert.match(files, /await requireOwner\(request\)/);
  assert.match(files, /\["client_shared", "public"\]\.includes\(row\.visibility\)/);
  assert.doesNotMatch(ui, /env\.MEDIA|storageKey/);
});

test("asset classification enforces rights, consent, and content boundaries", async () => {
  const files = await read("app/api/files/route.ts");
  assert.match(files, /const assetRoles = new Set/);
  assert.match(files, /clientAccess\s*\?\s*"client_reference"/);
  assert.match(files, /consentStatus !== "granted"/);
  assert.match(files, /asset\.classification_updated/);
  assert.match(files, /contentRoles\.has\(assetRole\)/);
});

test("design versions preserve lineage and approvals reject references", async () => {
  const files = await read("app/api/files/route.ts");
  const approvals = await read("app/api/approvals/route.ts");
  assert.match(files, /versionGroupId = parent\?\.versionGroupId \|\| parent\?\.id \|\| assetId/);
  assert.match(files, /parentAssetId: parent\?\.id \|\| null/);
  assert.match(approvals, /clientApprovalRoles/);
  assert.match(approvals, /Only a classified mockup, design version, final design, or stencil/);
  assert.match(approvals, /assetSha256: asset\?\.sha256/);
  assert.match(approvals, /idempotent: true/);
});

test("visual analysis never fabricates a result without a configured vision model", async () => {
  const route = await read("app/api/design-analysis/route.ts");
  const adapter = await read("lib/model-adapter.ts");
  assert.match(route, /if \(!result\.usedExternalModel\)/);
  assert.match(route, /Configure a vision-capable AI model/);
  assert.match(route, /assetSha256: asset\.sha256/);
  assert.match(route, /assetVersion: asset\.version/);
  assert.match(route, /externalSideEffect: false/);
  assert.match(adapter, /AI_VISION_MODEL/);
  assert.match(adapter, /type: "image_url"/);
});

test("Stage 5 migration is additive and preserves existing media", async () => {
  const migration = await read("drizzle/0007_cooing_patch.sql");
  assert.doesNotMatch(migration, /\bDROP\s+TABLE\b/i);
  assert.doesNotMatch(migration, /\bDELETE\s+FROM\b/i);
  assert.match(migration, /CREATE TABLE `asset_analyses`/);
  assert.match(migration, /PRAGMA optimize/);
  const database = new DatabaseSync(":memory:");
  for (const path of [
    "drizzle/0000_past_alice.sql", "drizzle/0001_free_runaways.sql",
    "drizzle/0002_chubby_bruce_banner.sql", "drizzle/0003_careless_sunfire.sql",
    "drizzle/0004_parallel_pyro.sql", "drizzle/0005_tiresome_calypso.sql",
    "drizzle/0006_fine_madame_web.sql",
  ]) database.exec((await read(path)).replaceAll("--> statement-breakpoint", ""));
  database.exec(`
    INSERT INTO clients (id, workspace_id, first_name, last_name, display_name) VALUES ('media-client', 'legacy-lines', 'Alpha', '', 'Alpha');
    INSERT INTO projects (id, workspace_id, client_id, title) VALUES ('media-project', 'legacy-lines', 'media-client', 'Existing design');
    INSERT INTO assets (id, workspace_id, project_id, client_id, storage_key, original_name, media_type, mime_type, byte_size, sha256, source_type, asset_role, visibility, version_group_id)
    VALUES ('media-asset', 'legacy-lines', 'media-project', 'media-client', 'private/key', 'design.jpg', 'image', 'image/jpeg', 1234, 'abc123', 'owner_upload', 'design_iteration', 'internal', 'media-asset');
  `);
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  const asset = database.prepare("SELECT original_name, sha256, asset_role, visibility FROM assets WHERE id = ?").get("media-asset");
  assert.deepEqual({ ...asset }, { original_name: "design.jpg", sha256: "abc123", asset_role: "design_iteration", visibility: "internal" });
  assert.equal(database.prepare("SELECT count(*) AS count FROM asset_analyses").get().count, 0);
  database.close();
});

test("release identity remains centralized after Stage 5", async () => {
  const version = await read("lib/version.ts");
  const pkg = JSON.parse(await read("package.json"));
  assert.match(version, new RegExp(`LEGACY_OS_VERSION = ["']${pkg.version.replaceAll(".", "\\.")}["']`));
  assert.match(await read("docs/DESIGN_MEDIA.md"), /Stage 5/);
});
