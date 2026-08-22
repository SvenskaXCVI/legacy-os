import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("connector registry and executions are durable, redacted, and idempotent", async () => {
  const [schema, engine] = await Promise.all([read("db/schema.ts"), read("lib/connector-engine.ts")]);
  assert.match(schema, /export const connectorDefinitions/);
  assert.match(schema, /export const connectorExecutions/);
  for (const field of ["requestHash", "requestRedactedJson", "idempotencyKey", "externalReference", "errorSummary"]) assert.match(schema, new RegExp(field));
  assert.match(engine, /contentCaptured: false/);
  assert.match(engine, /connectorExecutions/);
  assert.doesNotMatch(schema, /secretKey|accessToken|webhookSecret/);
});

test("approved agent actions use fixed connector allowlists and scope checks", async () => {
  const engine = await read("lib/connector-engine.ts");
  assert.match(engine, /send_client_message: "client_portal"/);
  assert.match(engine, /schedule_appointment: "studio_calendar"/);
  assert.match(engine, /approval\.status !== "approved"/);
  assert.match(engine, /Project is not scoped to this client/);
  assert.match(engine, /conflicts with an existing appointment/);
  assert.match(engine, /This action has no approved connector adapter/);
});

test("Stripe remains client-initiated, hosted, dynamic, and webhook-authoritative", async () => {
  const [checkout, stripe, webhook, notes] = await Promise.all([read("app/api/payments/checkout/route.ts"), read("lib/stripe.ts"), read("app/api/payments/webhook/route.ts"), read("docs/SECURE_CONNECTOR_EXECUTION_GATEWAY.md")]);
  assert.match(checkout, /checkout\.sessions\.create/);
  assert.match(checkout, /integration_identifier/);
  assert.doesNotMatch(checkout, /payment_method_types/);
  assert.match(stripe, /2026-07-29\.dahlia/);
  assert.match(stripe, /STRIPE_RESTRICTED_KEY/);
  assert.match(webhook, /constructEventAsync/);
  assert.match(notes, /does not charge a card/i);
});

test("social sync and checkout activity pass through the connector ledger", async () => {
  const [social, checkout, workspace] = await Promise.all([read("app/api/social/sync/route.ts"), read("app/api/payments/checkout/route.ts"), read("app/api/workspace/route.ts")]);
  assert.match(social, /executeConnectorAction/);
  assert.match(checkout, /recordObservedConnectorExecution/);
  assert.match(workspace, /connectorDefinitions: connectorRows/);
  assert.match(workspace, /connectorExecutions: connectorExecutionRows/);
});

test("owner can inspect connector health and execute only ready tasks", async () => {
  const [route, ui] = await Promise.all([read("app/api/connectors/route.ts"), read("app/legacy-app.tsx")]);
  assert.match(route, /requireOwner/);
  assert.match(route, /executeConnectorAction/);
  assert.match(ui, /Secure connector gateway/);
  assert.match(ui, /task\.status === "ready_for_connector"/);
  assert.match(ui, /Execute connector/);
  assert.match(ui, /connector\.status\.replaceAll/);
});

test("Stage 19 migration is additive and preserves prior agent tasks", async () => {
  const migration = await read("drizzle/0013_large_victor_mancha.sql");
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM/i);
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("CREATE TABLE workspaces (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE approvals (id text PRIMARY KEY NOT NULL)");
  database.exec("CREATE TABLE agent_tasks (id text PRIMARY KEY NOT NULL)");
  database.exec("INSERT INTO workspaces VALUES ('legacy-lines')");
  database.exec("INSERT INTO agent_tasks VALUES ('task-existing')");
  database.exec(migration.replaceAll("--> statement-breakpoint", ""));
  assert.equal(database.prepare("SELECT count(*) AS count FROM agent_tasks").get().count, 1);
  assert.equal(database.prepare("SELECT action_payload_json FROM agent_tasks WHERE id = 'task-existing'").get().action_payload_json, "{}");
  assert.equal(database.prepare("SELECT count(*) AS count FROM connector_executions").get().count, 0);
});

test("Stage 19 release and real connector boundaries are documented", async () => {
  const [changelog, notes] = await Promise.all([read("CHANGELOG.md"), read("docs/SECURE_CONNECTOR_EXECUTION_GATEWAY.md")]);
  assert.match(changelog, /0\.7\.0-alpha\.19/);
  assert.match(changelog, /Secure Connector Execution Gateway|least-privilege connector gateway/i);
  assert.match(notes, /No send button is enabled and no delivery is claimed/i);
  assert.match(notes, /no drops, deletes, or destructive data updates/i);
});
