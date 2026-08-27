import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Stage 34 uses a stateless structured Responses runtime with deterministic fallback", async () => {
  const runtime = await read("lib/model-adapter.ts");
  assert.match(runtime, /MODEL_RUNTIME_POLICY_VERSION = "model-runtime-v1"/);
  assert.match(runtime, /store: false/);
  assert.match(runtime, /safety_identifier/);
  assert.match(runtime, /prompt_cache_key/);
  assert.match(runtime, /json_schema/);
  assert.match(runtime, /deterministic-policy-engine-v1/);
  assert.doesNotMatch(runtime, /console\.log\([^)]*apiKey/);
});

test("Stage 34 exposes a protected readiness probe and usage telemetry", async () => {
  const route = await read("app/api/model-runtime/route.ts");
  const chief = await read("lib/chief-manager-engine.ts");
  const specialist = await read("lib/specialist-intelligence-engine.ts");
  assert.match(route, /requireOwner/);
  assert.match(route, /model\.runtime_verified/);
  assert.match(route, /cachedInputTokens/);
  assert.match(chief, /promptVersion: CHIEF_MANAGER_PLAN_VERSION/);
  assert.match(specialist, /promptVersion: SPECIALIST_INTELLIGENCE_POLICY_VERSION/);
});
