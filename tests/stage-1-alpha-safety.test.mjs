import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("client portal exposes only deliberately shared project and asset data", async () => {
  const portal = await read("app/api/portal/route.ts");
  const files = await read("app/api/files/route.ts");

  assert.match(portal, /clientSummary: projects\.clientSummary/);
  assert.doesNotMatch(portal, /summary: projects\.summary/);
  assert.match(portal, /inArray\(assets\.visibility, \["client_shared", "public"\]\)/);
  assert.match(portal, /eq\(approvals\.audience, "client"\)/);
  assert.match(files, /\["client_shared", "public"\]\.includes\(row\.visibility\)/);
});

test("design approvals are bound to an immutable asset snapshot", async () => {
  const approvals = await read("app/api/approvals/route.ts");
  const ui = await read("app/legacy-app.tsx");

  assert.match(approvals, /assetSha256: asset\?\.sha256/);
  assert.match(approvals, /assetVersion: asset\?\.version/);
  assert.match(approvals, /Select the exact design version/);
  assert.match(ui, /assetId: selectedAsset\.id/);
});

test("project creation is idempotent and content requires explicit eligibility", async () => {
  const projects = await read("app/api/projects/route.ts");
  const ui = await read("app/legacy-app.tsx");

  assert.match(projects, /eq\(projects\.requestKey, requestKey\)/);
  assert.match(projects, /idempotent: true/);
  assert.match(ui, /asset\.contentEligible === true/);
  assert.match(ui, /disabled=\{submitting\}/);
});

test("stage one migration is additive and preserves existing records", async () => {
  const migration = await read("drizzle/0004_parallel_pyro.sql");

  assert.doesNotMatch(migration, /\bDROP\s+TABLE\b/i);
  assert.doesNotMatch(migration, /\bDELETE\s+FROM\b/i);
  assert.match(migration, /UPDATE `assets` SET `version_group_id` = `id`/);
  assert.match(migration, /WHERE `source_type` = 'client_upload'/);
  assert.match(migration, /ALTER TABLE `projects` ADD `client_summary` text/);
});

test("stage one migration preserves and safely classifies existing alpha data", async () => {
  const database = new DatabaseSync(":memory:");
  const migrations = await Promise.all(
    [
      "drizzle/0000_past_alice.sql",
      "drizzle/0001_free_runaways.sql",
      "drizzle/0002_chubby_bruce_banner.sql",
      "drizzle/0003_careless_sunfire.sql",
    ].map(read),
  );
  for (const migration of migrations) {
    database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  }

  database.exec(`
    INSERT INTO clients (id, workspace_id, first_name, last_name)
    VALUES ('client-existing', 'legacy-lines', 'Existing', 'Client');
    INSERT INTO projects (id, workspace_id, client_id, title, summary)
    VALUES ('project-existing', 'legacy-lines', 'client-existing', 'Existing project', 'Private owner note');
    INSERT INTO assets
      (id, workspace_id, project_id, client_id, storage_key, original_name, media_type, mime_type, byte_size, sha256, source_type)
    VALUES
      ('asset-owner', 'legacy-lines', 'project-existing', 'client-existing', 'owner-key', 'owner-design.png', 'image', 'image/png', 100, 'owner-hash', 'owner_upload'),
      ('asset-client', 'legacy-lines', 'project-existing', 'client-existing', 'client-key', 'client-reference.png', 'image', 'image/png', 100, 'client-hash', 'client_upload');
  `);

  const stageOne = await read("drizzle/0004_parallel_pyro.sql");
  database.exec(stageOne.replaceAll("--> statement-breakpoint", ""));

  const project = database
    .prepare("SELECT summary, client_summary, is_test FROM projects WHERE id = ?")
    .get("project-existing");
  const ownerAsset = database
    .prepare("SELECT visibility, asset_role, version_group_id FROM assets WHERE id = ?")
    .get("asset-owner");
  const clientAsset = database
    .prepare("SELECT visibility, asset_role, version_group_id FROM assets WHERE id = ?")
    .get("asset-client");

  assert.deepEqual({ ...project }, {
    summary: "Private owner note",
    client_summary: null,
    is_test: 0,
  });
  assert.deepEqual({ ...ownerAsset }, {
    visibility: "internal",
    asset_role: "design_iteration",
    version_group_id: "asset-owner",
  });
  assert.deepEqual({ ...clientAsset }, {
    visibility: "client_shared",
    asset_role: "reference",
    version_group_id: "asset-client",
  });
  database.close();
});
