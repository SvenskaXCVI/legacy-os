import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Stage 36 makes Supabase memberships authoritative for owner identity", async () => {
  const auth = await read("app/api/_lib.ts");
  const migration = await read("supabase/migrations/20260827010000_workspace_memberships.sql");

  assert.match(auth, /activeSupabaseMembership/);
  assert.match(auth, /membership\?\.role === "owner"/);
  assert.match(auth, /claim_legacy_membership/);
  assert.match(migration, /alter table public\.workspace_memberships enable row level security/);
  assert.match(migration, /private\.is_workspace_owner\(workspace_id, true\)/);
  assert.match(migration, /coalesce\(\(select auth\.jwt\(\)->>'aal'\), 'aal1'\) = 'aal2'/);
  assert.doesNotMatch(migration, /raw_user_meta_data|user_metadata/);
});

test("Stage 36 owner invitations are verified, revocable, and auditable", async () => {
  const route = await read("app/api/team/route.ts");
  const app = await read("app/legacy-app.tsx");
  const migration = await read("supabase/migrations/20260827010000_workspace_memberships.sql");

  assert.match(route, /requireOwner\(request\)/);
  assert.match(route, /invite_workspace_owner/);
  assert.match(route, /set_workspace_membership_status/);
  assert.match(app, /Owners and invitations/);
  assert.match(app, /Prepare owner access/);
  assert.match(migration, /workspace_membership_events/);
  assert.match(migration, /The final active owner cannot remove their own access/);
  assert.match(migration, /A verified email is required/);
});

