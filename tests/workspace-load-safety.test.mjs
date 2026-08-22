import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("audit capture backfill keeps database parameter counts safely bounded", async () => {
  const engine = await read("lib/capture-engine.ts");
  assert.match(engine, /CAPTURE_LOOKUP_BATCH_SIZE = 50/);
  assert.match(engine, /offset < sourceIds\.length; offset \+= CAPTURE_LOOKUP_BATCH_SIZE/);
  assert.match(engine, /sourceIds\.slice\(offset, offset \+ CAPTURE_LOOKUP_BATCH_SIZE\)/);
  assert.match(engine, /inArray\(captureEvents\.sourceId, batch\)/);
  assert.doesNotMatch(engine, /inArray\(captureEvents\.sourceId, events\.map/);
});

test("unexpected server failures never expose query or provider details to clients", async () => {
  const api = await read("app/api/_lib.ts");
  assert.match(api, /if \(status >= 500\) return jsonError\(fallback, status\)/);
  assert.match(api, /Internal query, connector, and provider details must never reach a browser/);
});

test("workspace load failure remains retryable with a bounded public message", async () => {
  const [route, ui] = await Promise.all([read("app/api/workspace/route.ts"), read("app/legacy-app.tsx")]);
  assert.match(route, /routeError\(error, "Unable to load workspace"\)/);
  assert.match(route, /backfillAuditCaptureEvents\([\s\S]*?\.catch\(\(\) => null\)/);
  assert.match(ui, /Legacy OS could not load the workspace/);
  assert.match(ui, />Try again</);
});
