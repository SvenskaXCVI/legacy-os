import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("appointment writes are idempotent and visibly pending", async () => {
  const [schema, route, ui] = await Promise.all([read("db/schema.ts"), read("app/api/appointments/route.ts"), read("app/legacy-app.tsx")]);
  assert.match(schema, /appointments_workspace_request_key_uq/);
  assert.match(route, /eq\(appointments\.requestKey, requestKey\)/);
  assert.match(route, /A matching appointment already exists/);
  assert.match(ui, /body: JSON\.stringify\(\{ \.\.\.values, requestKey \}\)/);
  assert.match(ui, /submitting \? "Scheduling…" : "Schedule appointment"/);
  assert.match(ui, /await onSaved\(\)/);
});

test("Design Studio preserves client context", async () => {
  const ui = await read("app/legacy-app.tsx");
  assert.match(ui, /data\.projects\.filter\(\(item\) => item\.clientId === clientId/);
  assert.match(ui, /onNavigate\(\{ view: "design", clientId: selectedClient\.id \}\)/);
  assert.match(ui, /Showing only this client&apos;s projects/);
  assert.match(ui, /This client has no design project yet/);
});

test("client media opens in an in-app lightbox", async () => {
  const [ui, css] = await Promise.all([read("app/legacy-app.tsx"), read("app/globals.css")]);
  assert.match(ui, /setPreviewAsset\(clientImageAssets\[0\]\)/);
  assert.match(ui, /className="asset-lightbox"/);
  assert.match(ui, /Download original/);
  assert.match(css, /\.asset-lightbox-image/);
});

test("project clarification and advancement provide decisive feedback", async () => {
  const ui = await read("app/legacy-app.tsx");
  assert.match(ui, /setClarifyingCandidate\(candidate\.id\)/);
  assert.match(ui, /This will be sent through the client&apos;s secure conversation/);
  assert.match(ui, /Low-confidence intake: ask for clarification before approval/);
  assert.match(ui, /setAdvancing\(true\)/);
  assert.match(ui, /await refresh\(\)/);
  assert.match(ui, /Resolve in Design Studio/);
});

test("Stage 30 migration is additive and preserves appointment records", async () => {
  const migration = await read("drizzle/0023_complete_molten_man.sql");
  assert.doesNotMatch(migration, /^\s*(?:DROP TABLE|DELETE FROM|UPDATE\s)/im);
  const database = new DatabaseSync(":memory:");
  database.exec("CREATE TABLE appointments (id text PRIMARY KEY NOT NULL, workspace_id text NOT NULL)");
  database.exec("INSERT INTO appointments (id, workspace_id) VALUES ('apt-existing', 'legacy-lines')");
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  assert.equal(database.prepare("SELECT id FROM appointments WHERE id = 'apt-existing'").get().id, "apt-existing");
  assert.equal(database.prepare("SELECT request_key FROM appointments WHERE id = 'apt-existing'").get().request_key, null);
});
