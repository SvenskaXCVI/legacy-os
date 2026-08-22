import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("client intake creates a review candidate before any project is created", async () => {
  const portal = await read("app/api/portal/route.ts");
  const review = await read("app/api/project-candidates/route.ts");

  assert.match(portal, /payload\.action === "project_intake"/);
  assert.match(portal, /extractCandidateProject/);
  assert.match(portal, /status:\s*"pending_review"/);
  assert.match(review, /payload\.action === "approve"/);
  assert.match(review, /payload\.action === "needs_details"/);
  assert.match(review, /new Set\(\["approve", "needs_details", "reject"\]\)/);
  assert.match(review, /requestKey:\s*`candidate:\$\{candidate\.id\}`/);
});

test("client identities support preferred and social names without requiring a legal last name", async () => {
  const clients = await read("app/api/clients/route.ts");
  const ui = await read("app/legacy-app.tsx");

  assert.doesNotMatch(clients, /!payload\.lastName/);
  assert.match(clients, /displayName/);
  assert.match(clients, /instagramHandle/);
  assert.match(ui, /name="displayName" required/);
  assert.match(ui, /name="preferredName"/);
  assert.match(ui, /name="instagramHandle"/);
});

test("stage two migration is additive and preserves existing alpha records", async () => {
  const migration = await read("drizzle/0005_tiresome_calypso.sql");

  assert.doesNotMatch(migration, /\bDROP\s+TABLE\b/i);
  assert.doesNotMatch(migration, /\bDELETE\s+FROM\b/i);
  assert.match(migration, /CREATE TABLE `project_candidates`/);
  assert.match(migration, /ALTER TABLE `clients` ADD `display_name` text/);
  assert.match(migration, /UPDATE `clients`[\s\S]*SET `display_name`/);

  const database = new DatabaseSync(":memory:");
  for (const path of [
    "drizzle/0000_past_alice.sql",
    "drizzle/0001_free_runaways.sql",
    "drizzle/0002_chubby_bruce_banner.sql",
    "drizzle/0003_careless_sunfire.sql",
    "drizzle/0004_parallel_pyro.sql",
  ]) {
    database.exec((await read(path)).replaceAll("--> statement-breakpoint", ""));
  }
  database.exec(`
    INSERT INTO clients (id, workspace_id, first_name, last_name, email)
    VALUES ('client-stage-two', 'legacy-lines', 'Alpha', 'Client', 'alpha@example.com');
    INSERT INTO projects (id, workspace_id, client_id, title, summary)
    VALUES ('project-stage-two', 'legacy-lines', 'client-stage-two', 'Existing work', 'Keep this private note');
  `);
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));

  const client = database.prepare(
    "SELECT first_name, last_name, email, display_name, identity_status FROM clients WHERE id = ?",
  ).get("client-stage-two");
  const project = database.prepare(
    "SELECT title, summary FROM projects WHERE id = ?",
  ).get("project-stage-two");

  assert.deepEqual({ ...client }, {
    first_name: "Alpha",
    last_name: "Client",
    email: "alpha@example.com",
    display_name: "Alpha Client",
    identity_status: "contactable",
  });
  assert.deepEqual({ ...project }, {
    title: "Existing work",
    summary: "Keep this private note",
  });
  database.close();
});

test("one release constant is visible in owner, client, and access footers", async () => {
  const version = await read("lib/version.ts");
  const app = await read("app/legacy-app.tsx");
  const access = await read("app/access-shell.tsx");

  assert.match(version, /LEGACY_OS_VERSION = "\d+\.\d+\.\d+-alpha\.\d+"/);
  assert.match(app, /className="client-footer"[\s\S]*LEGACY_OS_VERSION/);
  assert.match(app, /className="owner-footer"[\s\S]*LEGACY_OS_VERSION/);
  assert.match(access, /<footer>[\s\S]*LEGACY_OS_VERSION[\s\S]*<\/footer>/);
});
