import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("owner workspace exposes bounded knowledge records for universal search", async () => {
  const route = await read("app/api/workspace/route.ts");
  assert.match(route, /knowledgeItems/);
  assert.match(route, /knowledgeItems: knowledgeRows/);
  assert.match(route, /\.limit\(100\)/);
  assert.match(route, /await requireOwner\(request\)/);
});

test("global search spans operational and relationship record types with relevance ranking", async () => {
  const ui = await read("app/legacy-app.tsx");
  for (const type of ["Appointment", "Message", "Approval", "Payment", "Session", "Healing", "Content", "Intake", "Knowledge"]) {
    assert.match(ui, new RegExp(`type: "${type}"`));
  }
  assert.match(ui, /normalized\.length < 2/);
  assert.match(ui, /label\.startsWith\(normalized\)/);
  assert.match(ui, /right\.score - left\.score/);
});

test("analytics filters are interactive and expose source records", async () => {
  const ui = await read("app/legacy-app.tsx");
  assert.match(ui, /role="tablist" aria-label="Analytics view"/);
  assert.match(ui, /aria-pressed=\{selectedMetric\?\.id === metric\.id\}/);
  assert.match(ui, /SOURCE RECORDS/);
  assert.match(ui, /onNavigate\(record\.target\)/);
  assert.match(ui, /!project\.isTest && !project\.archivedAt/);
  assert.match(ui, /amountPaidCents - item\.amountRefundedCents/);
});

test("appointment results focus their exact calendar record", async () => {
  const ui = await read("app/legacy-app.tsx");
  assert.match(ui, /appointment-\$\{targetId\}/);
  assert.match(ui, /scrollIntoView/);
  assert.match(ui, /targetId === appointment\.id && "focused-record"/);
});

test("Stage 10 release identity and data-safety documentation are present", async () => {
  const version = await read("lib/version.ts");
  const pkg = JSON.parse(await read("package.json"));
  assert.equal(pkg.version, "0.7.0-alpha.10");
  assert.match(version, /Stage 10 · Searchable Analytics/);
  assert.match(await read("docs/SEARCHABLE_ANALYTICS.md"), /leaves all alpha client data/);
});
