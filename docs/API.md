# Legacy OS API Contract

Base path: `/api`  
Current version: 0.7.0-alpha.28
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
- `GET /api/scheduling` returns explicit capacity windows, project session
  requirements, evaluation runs, and approval-gated scheduling opportunities.
  `POST /api/scheduling` manages those inputs, evaluates usable capacity, or
  routes one exact proposed appointment through owner approval; it never books
  a recommendation directly.
- `POST /api/messages` writes an owner message into the shared conversation.
- `POST /api/approvals` creates a client-facing approval or records an owner
  decision.
- `POST /api/briefing` prioritizes live workspace state and writes a complete
  observable run.
- `GET /api/tools` returns the owner-only tool contracts and recent authority
  decisions. `POST /api/tools` records a dry-run policy evaluation without
  executing the selected capability.
- `GET /api/chief` returns the owner-only Chief of Staff run and delegation
  ledger. `POST /api/chief` creates an idempotent, scoped manager run or resumes
  a run after its exact approval has been decided.
- `GET /api/specialists` returns the eight bounded specialist profiles and their
  evidence-linked evaluation history. `POST /api/specialists` runs one domain or
  all domains against an optional project/client scope through the existing task,
  tool-authority, AI-run, usage, event, and audit ledgers.
- `GET /api/connectors/google` reports whether server-side Google OAuth is ready.
  `POST /api/connectors/google` creates a short-lived, single-use authorization
  request for Gmail or Google Calendar. `DELETE /api/connectors/google` revokes
  the provider token when possible and always removes the locally usable
  credential. The callback never returns credentials to the browser.
- `GET /api/craft` returns owner-only session craft records, healing assessments,
  evaluator runs, candidate/active patterns, thresholds, and craft recommendations.
  `POST /api/craft` saves a scoped session record, saves Joshua's structured
  healing assessment, or runs the deterministic evidence evaluator. Test and
  archived projects are rejected from this learning path.
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

Future routes will add content publishing, full-text search, and direct
knowledge-graph editing. Existing lifecycle and craft routes already provide
dedicated tattoo-session and structured healing capture without fabricating
domain records that have not been entered.
