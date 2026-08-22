# Legacy OS API Contract

Base path: `/api`  
Current version: alpha v0.6
Encoding: JSON UTF-8

## Identity

Owner requests are attributed from `oai-authenticated-user-email`; the browser
never supplies an owner actor ID. Client requests use a revocable portal token
stored only as a SHA-256 hash. The private Sites access policy remains the outer
authorization boundary for the deployed application.

## System

- `GET /api/health` returns database, storage, identity, automation, model, and
  social-integration readiness without exposing credentials.
- `GET /api/telemetry?hours=24` returns run, usage, and audit summaries.
- `POST /api/telemetry` records low-level user or agent audit metadata.
- `GET|PATCH /api/workspace` loads the owner workspace or updates studio and
  privacy settings.
- `GET /api/automations` returns the owner-only queue, status, and generated
  notifications.
- `POST /api/automations` runs, pauses, or resumes internal processing and marks
  a notification read or dismissed.

## Owner workflows

- `POST /api/clients` creates a persistent client.
- `POST|PATCH /api/projects` creates a project or advances its lifecycle and
  learning state.
- `POST /api/appointments` schedules a client/project appointment.
- `POST /api/messages` writes an owner message into the shared conversation.
- `POST /api/approvals` creates a client-facing approval or records an owner
  decision.
- `POST /api/briefing` prioritizes live workspace state and writes a complete
  observable run.
- `GET|POST /api/payments` lists owner-scoped payment records or creates,
  approves, voids, and refunds a payment request. Financial mutations require
  verified owner access and write audit events.

## Client portal

- `POST /api/portal/invitations` revokes previous access and issues a new
  30-day portal token.
- `GET /api/portal?token=...` returns only the invited client's projects,
  appointments, approvals, messages, files, and public updates.
- `POST /api/portal` sends a client message or records an approval/revision
  decision.
- `GET|POST /api/files` uploads project media to R2 or retrieves an authorized
  asset. Uploads are limited to 25 MB, reject executable/active-content
  formats, and receive a SHA-256 integrity hash.
- `PATCH /api/files` lets a verified owner change an asset's role, visibility,
  rights, consent, and publishing eligibility without mutating the original.
- `GET|POST /api/design-analysis` returns version-bound analysis history or
  runs an explicit, rights-bounded visual analysis through the configured
  vision-capable model adapter.
- `POST /api/payments/checkout` creates or reuses a Stripe-hosted Checkout
  Session only for an approved request belonging to the authenticated client.
- `POST /api/payments/webhook` verifies Stripe's signature, deduplicates the
  provider event, and updates the authoritative payment ledger.

## Approval decisions

Allowed decisions are `approved`, `revision`, and `rejected` for owners.
Client portal decisions are limited to `approved` or `revision`. Every decision
is paired with an append-only audit event in the same database batch.

## Error envelope

Routes currently return a compact JSON error:

```json
{
  "error": "Human-readable failure description"
}
```

No error response should contain raw prompts, credentials, provider payloads,
portal token hashes, or client-sensitive content.

## Planned routes

Future routes will add dedicated tattoo-session capture, structured healing,
content publishing, full-text search, and direct knowledge graph
editing. Their lifecycle checkpoints already generate internal workflow
guidance but do not fabricate domain records that have not been entered.
