import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Stage 23 gives every callable tool a durable, complete contract", async () => {
  const [schema, engine] = await Promise.all([read("db/schema.ts"), read("lib/tool-authority-engine.ts")]);
  assert.match(schema, /export const toolDefinitions/);
  assert.match(schema, /export const authorityDecisions/);
  for (const field of ["inputSchemaJson", "outputSchemaJson", "sideEffectClass", "approvalClass", "retryPolicyJson", "auditBehaviorJson", "allowedAgentsJson", "connectorKey"]) assert.match(schema, new RegExp(field));
  assert.match(engine, /TOOL_AUTHORITY_POLICY_VERSION/);
  assert.match(engine, /hash_and_redacted_metadata/);
});

test("authority classes are explicit and unknown capabilities fail closed", async () => {
  const engine = await read("lib/tool-authority-engine.ts");
  for (const classification of ["AUTO", "AUTO_WITH_LOG", "ASK", "OWNER_ONLY", "DENIED"]) assert.match(engine, new RegExp(`authority: "${classification}"`));
  assert.match(engine, /Unregistered tools are denied by default/);
  assert.match(engine, /AI agents cannot exercise owner-only authority/);
  assert.match(engine, /Policy explicitly denies this capability/);
  assert.match(engine, /tool\.approvalClass === "ASK"/);
});

test("agent routing uses registered authority instead of caller-selected autonomy", async () => {
  const [engine, schema] = await Promise.all([read("lib/agent-engine.ts"), read("db/schema.ts")]);
  assert.match(engine, /toolKeyForTask/);
  assert.match(engine, /evaluateToolAuthority/);
  assert.match(engine, /assertToolExecutionAuthorized/);
  assert.match(engine, /\["denied", "owner_only"\]/);
  assert.match(schema, /toolKey: text\("tool_key"\).*default\("analyze_internal"\)/s);
  assert.doesNotMatch(engine, /const gated = \/send\|publish/);
});

test("connector execution rechecks authority and exact approval at the side-effect boundary", async () => {
  const [connector, authority] = await Promise.all([read("lib/connector-engine.ts"), read("lib/tool-authority-engine.ts")]);
  assert.match(connector, /assertToolExecutionAuthorized/);
  assert.match(connector, /approval\?\.id/);
  assert.match(connector, /approved action payload no longer matches this task/);
  assert.match(connector, /task \? JSON\.parse\(task\.actionPayloadJson\).*: \{ \.\.\.\(input\.payload/s);
  assert.match(authority, /approval\?\.status === "approved"/);
  assert.match(authority, /The exact action payload has owner approval/);
  assert.match(authority, /inputHash: await sha256/);
});

test("owner can inspect the registry and recorded decisions without executing a dry run", async () => {
  const [route, workspace, ui] = await Promise.all([read("app/api/tools/route.ts"), read("app/api/workspace/route.ts"), read("app/legacy-app.tsx")]);
  assert.match(route, /requireOwner/);
  assert.match(route, /dryRun: true/);
  assert.doesNotMatch(route, /executeConnectorAction|executeAgentTask/);
  assert.match(workspace, /toolDefinitions: toolDefinitionRows/);
  assert.match(workspace, /authorityDecisions: authorityDecisionRows/);
  assert.match(ui, /TOOL \+ AUTHORITY REGISTRY/);
  assert.match(ui, /Recent authority decisions/);
});

test("Stage 23 migration is additive and preserves prior tasks", async () => {
  const migration = await read("drizzle/0017_bizarre_vermin.sql");
  assert.doesNotMatch(migration, /^\s*(?:DROP TABLE|DELETE FROM|UPDATE\s)/im);
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("CREATE TABLE workspaces (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE approvals (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE agent_tasks (id text PRIMARY KEY NOT NULL)");
  database.exec("INSERT INTO workspaces VALUES ('legacy-lines')");
  database.exec("INSERT INTO agent_tasks VALUES ('task-existing')");
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  assert.equal(database.prepare("SELECT tool_key FROM agent_tasks WHERE id = 'task-existing'").get().tool_key, "analyze_internal");
  assert.equal(database.prepare("SELECT count(*) AS count FROM authority_decisions").get().count, 0);
  assert.equal(database.prepare("SELECT count(*) AS count FROM tool_definitions").get().count, 0);
});

test("Stage 23 release and its honest execution limits are documented", async () => {
  const [changelog, pkg, version, notes] = await Promise.all([read("CHANGELOG.md"), read("package.json"), read("lib/version.ts"), read("docs/TOOL_AND_AUTHORITY_REGISTRY.md")]);
  assert.ok(Number(JSON.parse(pkg).version.split("alpha.")[1]) >= 23);
  assert.match(changelog, /0\.7\.0-alpha\.23/);
  assert.match(version, /LEGACY_OS_VERSION/);
  assert.match(notes, /does not claim that unavailable provider adapters can execute/i);
  assert.match(notes, /does not drop, delete, rewrite, or reclassify/i);
});
