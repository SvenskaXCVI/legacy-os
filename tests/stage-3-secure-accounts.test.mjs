import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Supabase identity and MFA claims are verified before authorization", async () => {
  const auth = await read("app/api/_lib.ts");

  assert.match(auth, /supabase\.auth\.getClaims\(token\)/);
  assert.match(auth, /supabase\.auth\.getUser\(token\)/);
  assert.match(auth, /claims\.sub !== userResult\.data\.user\.id/);
  assert.match(auth, /access\.assuranceLevel !== "aal2"/);
  assert.doesNotMatch(auth, /JSON\.parse\(decoded\).*aal/s);
});

test("Legacy OS does not create a duplicate bearer-token copy in local storage", async () => {
  const shell = await read("app/access-shell.tsx");
  const app = await read("app/legacy-app.tsx");

  assert.doesNotMatch(shell, /localStorage\.(?:setItem|getItem)\("legacy_access_token"/);
  assert.doesNotMatch(app, /localStorage\.(?:setItem|getItem)\("legacy_access_token"/);
  assert.match(shell, /setLegacyApiAccessToken\(session\.access_token\)/);
  assert.match(shell, /setLegacyApiAccessToken\(null\)/);
  assert.match(shell, /event === "SIGNED_OUT"/);
  assert.match(app, /let activeApiAccessToken: string \| null = null/);
});

test("password recovery requires a verified recovery session and a stronger replacement", async () => {
  const shell = await read("app/access-shell.tsx");

  assert.match(shell, /resetPasswordForEmail\(email/);
  assert.match(shell, /event === "PASSWORD_RECOVERY"/);
  assert.match(shell, /client\.auth\.updateUser\(\{ password \}\)/);
  assert.match(shell, /password\.length < 12/);
  assert.match(shell, /await bootstrap\(/);
  assert.match(shell, /For security, factors cannot be removed from this screen/);
});

test("client invitations survive verified email and OAuth callbacks without assigning roles", async () => {
  const shell = await read("app/access-shell.tsx");
  const auth = await read("app/api/_lib.ts");

  assert.match(shell, /confirmationUrl\.searchParams\.set\("portal", invitationToken\.trim\(\)\)/);
  assert.match(shell, /callbackUrl\.searchParams\.set\("portal", invitationToken\.trim\(\)\)/);
  assert.match(auth, /ownerAllowlist\(\)\.has\(email\)/);
  assert.match(auth, /Client registration requires an active invitation/);
  assert.match(auth, /invitation\.clientId !== existing\.clientId/);
  assert.doesNotMatch(shell, /role:\s*roleIntent/);
});

test("authentication lifecycle events are written to the app-owned audit ledger", async () => {
  const auth = await read("app/api/_lib.ts");

  assert.match(auth, /auth\.identity_bound/);
  assert.match(auth, /auth\.signed_in/);
  assert.match(auth, /auth\.owner_account_created/);
  assert.match(auth, /auth\.client_account_created/);
  assert.match(auth, /ipHash: await sha256\(ip\)/);
  assert.match(auth, /userAgentHash: await sha256\(userAgent\)/);
  assert.doesNotMatch(auth, /metadataJson: JSON\.stringify\(\{[^}]*token/s);
});

test("current publishable keys are supported without any secret-role credential", async () => {
  const auth = await read("app/api/_lib.ts");
  const env = await read(".env.example");
  const runbook = await read("docs/SUPABASE_ROLLOUT.md");

  assert.match(auth, /SUPABASE_PUBLISHABLE_KEY \|\| env\.SUPABASE_ANON_KEY/);
  assert.match(env, /SUPABASE_PUBLISHABLE_KEY=/);
  assert.doesNotMatch(env, /SUPABASE_SERVICE_ROLE/);
  assert.match(runbook, /Never add a Supabase secret key or `service_role` key/);
});

test("release identity remains centralized after Stage 3", async () => {
  const version = await read("lib/version.ts");
  const pkg = JSON.parse(await read("package.json"));

  assert.match(version, /LEGACY_OS_VERSION = "\d+\.\d+\.\d+-alpha\.\d+"/);
  assert.match(version, /LEGACY_OS_RELEASE/);
  assert.match(version, new RegExp(pkg.version.replaceAll(".", "\\.")));
});
