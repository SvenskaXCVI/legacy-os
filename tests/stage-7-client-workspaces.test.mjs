import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("owner client workspace connects the full relationship without weakening portal privacy", async () => {
  const ui = await read("app/legacy-app.tsx");
  const portal = await read("app/api/portal/route.ts");
  assert.match(ui, /OWNER CLIENT WORKSPACE/);
  assert.match(ui, /Private studio notes/);
  assert.match(ui, /relationship-timeline/);
  assert.match(ui, /Lifetime paid/);
  assert.match(ui, /Tattoo media permission/);
  assert.doesNotMatch(portal, /notes: clients\.notes/);
});

test("client and project cleanup is soft, reversible, and audited", async () => {
  const clients = await read("app/api/clients/route.ts");
  const projects = await read("app/api/projects/route.ts");
  assert.match(clients, /action\?: "archive" \| "restore"/);
  assert.match(clients, /Archive or complete this client's active projects first/);
  assert.match(clients, /client\.archived/);
  assert.doesNotMatch(clients, /delete\(clients\)/);
  assert.match(projects, /"mark_test" \| "mark_real"/);
  assert.match(projects, /duplicateOfProjectId/);
  assert.match(projects, /softDelete: archive/);
  assert.doesNotMatch(projects, /delete\(projects\)/);
});

test("test and archived projects are excluded from reasoning and learning", async () => {
  const briefing = await read("app/api/briefing/route.ts");
  const automation = await read("lib/automation-engine.ts");
  const intelligence = await read("lib/intelligence-engine.ts");
  assert.match(briefing, /eq\(projects\.isTest, false\)/);
  assert.match(briefing, /isNull\(projects\.archivedAt\)/);
  assert.match(automation, /project\.isTest \|\| project\.archivedAt/);
  assert.match(automation, /eq\(projects\.isTest, false\)/);
  assert.match(intelligence, /if \(project\.isTest \|\| project\.archivedAt\) return null/);
  assert.match(intelligence, /isNull\(projects\.archivedAt\)/);
});

test("creator-facing analytics, finance, and knowledge use operational projects", async () => {
  const ui = await read("app/legacy-app.tsx");
  assert.match(ui, /const operationalProjects = data\.projects\.filter\(\(project\) => !project\.isTest && !project\.archivedAt\)/);
  assert.match(ui, /const operationalPayments = data\.paymentRequests\.filter/);
  assert.match(ui, /Real workspace data only/);
  assert.match(ui, /Test and archived records never contribute to analytics, briefings, or learning/);
});

test("Stage 7 release documentation remains present after later stages", async () => {
  const version = await read("lib/version.ts");
  const pkg = JSON.parse(await read("package.json"));
  assert.match(pkg.version, /^0\.7\.0-alpha\.\d+$/);
  assert.match(version, new RegExp(pkg.version.replaceAll(".", "\\.")));
  assert.match(await read("docs/CLIENT_WORKSPACES.md"), /Stage 7/);
});
