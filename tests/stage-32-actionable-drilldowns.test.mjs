import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Stage 32 dashboard and client summaries lead to source records", async () => {
  const app = await read("app/legacy-app.tsx");
  assert.match(app, /stat-card stat-card-action/);
  assert.match(app, /onClick=\{\(\) => onView\("projects", project\.id\)\}/);
  assert.match(app, /detail-box detail-box-action/);
  assert.match(app, /className="client-card action-summary-card"/);
  assert.match(app, /Occurred \{formatDate\(item\.at, true\)\}/);
  assert.match(app, /Recorded \$\{formatDate\(item\.recordedAt, true\)\}/);
});

test("Stage 32 blockers and milestones are actionable", async () => {
  const app = await read("app/legacy-app.tsx");
  assert.match(app, /ARCHIVE BLOCKED/);
  assert.match(app, /Open lifecycle operations/);
  assert.match(app, /milestoneTarget\(milestone\.id\)/);
  assert.match(app, /LIFECYCLE BLOCKER/);
});
