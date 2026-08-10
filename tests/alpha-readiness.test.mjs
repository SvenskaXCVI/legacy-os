import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public alpha keeps owner operations behind server-side code sessions", async () => {
  const [auth, ownerRoute, accessShell] = await Promise.all([
    read("app/api/_lib.ts"),
    read("app/api/auth/owner-access/route.ts"),
    read("app/access-shell.tsx"),
  ]);
  assert.match(auth, /OWNER_ACCESS_CODE_HASH/);
  assert.match(auth, /hasValidOwnerSession/);
  assert.match(auth, /access\.user\.role !== "owner"/);
  assert.match(auth, /HttpOnly; Secure; SameSite=Strict/);
  assert.match(ownerRoute, /MAX_ATTEMPTS/);
  assert.match(ownerRoute, /sameOrigin/);
  assert.match(accessShell, /submitOwnerAccessCode/);
  assert.match(accessShell, /nextConfig\.mode !== "supabase" && portalInvitation/);
});

test("continuous automation captures, processes, and remains internal", async () => {
  const [engine, worker, settings] = await Promise.all([
    read("lib/automation-engine.ts"),
    read("worker/index.ts"),
    read("app/legacy-app.tsx"),
  ]);
  assert.match(engine, /captureAutomationSignal/);
  assert.match(engine, /runLearningCycle/);
  assert.match(engine, /createOperationalNotifications/);
  assert.match(engine, /externalSideEffect: false/);
  assert.match(worker, /async scheduled/);
  assert.match(settings, /APPROVAL BOUNDARY/);
  assert.match(settings, /Publishing, payments, and permissions require approval/);
});

test("the installable shell never caches private pages or APIs", async () => {
  const [manifest, serviceWorker, layout] = await Promise.all([
    read("app/manifest.ts"),
    read("public/sw.js"),
    read("app/layout.tsx"),
  ]);
  assert.match(manifest, /display: "standalone"/);
  assert.match(layout, /PwaRegister/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(serviceWorker, /url\.searchParams\.has\("portal"\)/);
  assert.doesNotMatch(serviceWorker, /cache\.addAll\(\[?"\/"/);
});

test("GitHub release controls are present", async () => {
  const [workflow, security, deployment] = await Promise.all([
    read(".github/workflows/ci.yml"),
    read("SECURITY.md"),
    read("docs/DEPLOYMENT.md"),
  ]);
  assert.match(workflow, /npm run typecheck/);
  assert.match(workflow, /npm test/);
  assert.match(security, /Never commit/);
  assert.match(deployment, /owner access-code mode ready/);
});
