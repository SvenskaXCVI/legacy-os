import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("owner message handling records durable read state and resolves thread attention", async () => {
  const route = await read("app/api/messages/route.ts");
  assert.match(route, /export async function PATCH/);
  assert.match(route, /eq\(clientMessages\.senderType, "client"\)/);
  assert.match(route, /isNull\(clientMessages\.readAt\)/);
  assert.match(route, /set\(\{ readAt: now \}\)/);
  assert.match(route, /communication:client:/);
  assert.match(route, /client_messages\.read/);
});

test("client message read state is scoped through verified portal access", async () => {
  const portal = await read("app/api/portal/route.ts");
  assert.match(portal, /"mark_messages_read"/);
  assert.match(portal, /eq\(clientMessages\.clientId, access\.clientId\)/);
  assert.match(portal, /eq\(clientMessages\.workspaceId, access\.workspaceId\)/);
  assert.match(portal, /eq\(clientMessages\.senderType, "owner"\)/);
});

test("approval decisions are terminal, idempotent, and require revision detail", async () => {
  const owner = await read("app/api/approvals/route.ts");
  const portal = await read("app/api/portal/route.ts");
  for (const source of [owner, portal]) {
    assert.match(source, /status !== "pending"/);
    assert.match(source, /idempotent: true/);
    assert.match(source, /already has a final decision/);
    assert.match(source, /decision === "revision"/);
  }
  assert.match(portal, /approval\.audience !== "client"/);
  assert.match(portal, /Please describe what should be revised/);
});

test("notifications reopen for new activity and route to exact work context", async () => {
  const automation = await read("lib/automation-engine.ts");
  const ui = await read("app/legacy-app.tsx");
  assert.match(automation, /onConflictDoUpdate/);
  assert.match(automation, /status: "unread"/);
  assert.match(automation, /`inbox:\$\{clientId/);
  assert.match(automation, /`design:\$\{projectId/);
  assert.match(ui, /type NavigationTarget/);
  assert.match(ui, /onNavigate\(\{ view: item\.view, id: item\.targetId \}\)/);
  assert.match(ui, /notificationCandidates\.filter/);
});

test("owner and client interfaces expose read receipts and structured revision requests", async () => {
  const ui = await read("app/legacy-app.tsx");
  assert.doesNotMatch(ui, /status\.includes\("read"\)/);
  assert.match(ui, /Read by client/);
  assert.match(ui, /Read by studio/);
  assert.match(ui, /revision-request-form/);
  assert.match(ui, /WHAT SHOULD CHANGE\?/);
  assert.match(ui, /approval\.decisionReason/);
});

test("Stage 9 release identity is centralized", async () => {
  const version = await read("lib/version.ts");
  const pkg = JSON.parse(await read("package.json"));
  assert.equal(pkg.version, "0.7.0-alpha.9");
  assert.match(version, /0\.7\.0-alpha\.9/);
  assert.match(version, /Stage 9 · Connected Client Actions/);
  assert.match(await read("docs/CONNECTED_CLIENT_ACTIONS.md"), /Secure message round trip/);
});
