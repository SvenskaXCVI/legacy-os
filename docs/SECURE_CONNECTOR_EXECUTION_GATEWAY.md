# Stage 19 — Secure Connector Execution Gateway

Legacy OS now has one least-privilege gateway between approved AI work and real service actions. The gateway never gives an agent a provider credential. It validates workspace scope, the exact approved action, connector availability, required payload fields, idempotency, and domain-specific safety rules before invoking a narrow adapter.

## Available adapters

### Client Portal

An approved `send_client_message` task can deliver the exact approved body to the correct client's private portal. The adapter validates client and project ownership, records only message metadata in connector logs, stores the message in the existing scoped conversation ledger, and records a normalized automation signal.

### Studio Calendar

An approved `schedule_appointment` task can create an appointment after validating the client/project relationship, timestamp, and conflicts with existing scheduled appointments. No third-party calendar is implied; this is the authoritative Legacy OS studio calendar.

### Instagram evidence

The existing consented professional-account synchronization now runs through the gateway. It remains read-only and does not publish, comment, like, follow, or message. Missing credentials are shown as configuration required.

### Stripe Checkout

Client-initiated Stripe-hosted Checkout sessions are now recorded in the connector execution ledger. Legacy OS continues to:

- use Checkout Sessions rather than direct charges;
- omit `payment_method_types` so Stripe can use dynamic payment methods;
- include a current `integration_identifier`;
- use the `2026-07-29.dahlia` API with a `Stripe` client instance;
- prefer a restricted key stored only in hosted secrets;
- treat signed webhooks—not redirects—as payment settlement authority;
- keep live payments locked until explicitly enabled.

The agent gateway does not charge a card. It can prepare and approve payment work, while the client completes hosted Checkout.

### Reasoning model

The model connector reports whether an optional OpenAI-compatible adapter is configured. Without it, Legacy OS continues using its deterministic policy engine. Models never become the source of truth for memory, approvals, evidence, workflows, or outcomes.

### Transactional email

The email connector is intentionally visible as configuration required. No send button is enabled and no delivery is claimed until a scoped provider adapter and hosted secret are configured.

## Execution ledger

Every connector execution stores the connector and action, agent task and approval references, actor, request hash, redacted request metadata, idempotency key, attempts, provider reference, result or failure, and timestamps. Message content, credentials, access tokens, secret keys, and webhook secrets are never copied into the connector ledger.

Failures are visible and retryable through the agent task workflow. A connector cannot run an action outside its fixed allowlist, and an agent task cannot execute until the linked owner approval is approved.

## Owner interface

AI Operations now shows connector availability, health, credential state, capabilities, execution results, and failures. Approved tasks at `ready_for_connector` expose a real execution control. Unconfigured services remain clearly labeled instead of exposing dead controls.

## Data safety

Migration `0013_large_victor_mancha.sql` adds the connector registry, connector execution ledger, and one defaulted action-payload field to agent tasks. It contains no drops, deletes, or destructive data updates. Existing alpha clients, projects, messages, appointments, payments, assets, captures, memories, AI runs, and audits remain unchanged.

