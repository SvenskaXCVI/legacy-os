import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("owner access configuration rejects malformed hashes and partial Supabase setup", async () => {
  const [auth, health] = await Promise.all([
    read("app/api/_lib.ts"),
    read("app/api/health/route.ts"),
  ]);

  assert.match(auth, /\^\[a-f0-9\]\{64\}\$/);
  assert.match(auth, /ownerAccessCodeMisconfigured/);
  assert.match(auth, /supabasePartiallyConfigured/);
  assert.match(health, /configurationIssues/);
  assert.match(health, /Supabase account authentication and role registry configured/);
});

test("owner session and configuration responses cannot be shared from caches", async () => {
  const [ownerRoute, configRoute] = await Promise.all([
    read("app/api/auth/owner-access/route.ts"),
    read("app/api/auth/config/route.ts"),
  ]);

  assert.match(ownerRoute, /private, no-store, max-age=0/);
  assert.match(ownerRoute, /vary: "Cookie"/);
  assert.match(configRoute, /private, no-store, max-age=0/);
});

test("private preview never promotes an arbitrary external platform identity to owner", async () => {
  const auth = await read("app/api/_lib.ts");

  assert.match(auth, /configuration\.mode === "private_preview"/);
  assert.match(auth, /!allowlist\.has\(platformEmail\)/);
});

test("Stage 14 is visible through the shared release metadata", async () => {
  const [version, pkgText] = await Promise.all([
    read("lib/version.ts"),
    read("package.json"),
  ]);
  const pkg = JSON.parse(pkgText);

  assert.match(pkg.version, /^0\.7\.0-alpha\.\d+$/);
  assert.match(version, /LEGACY_OS_RELEASE/);
  assert.match(await read("docs/FOUNDATION_CLOSURE.md"), /Stage 14/);
});
