# Legacy OS API Contract

Base path: `/api`  
Current version: operational v0.2
Encoding: JSON UTF-8

## Identity

Owner requests are attributed from `oai-authenticated-user-email`; the browser
never supplies an owner actor ID. Client requests use a revocable portal token
stored only as a SHA-256 hash. The private Sites access policy remains the outer
authorization boundary for the deployed application.

## System

- `GET /api/health` returns application, database, and telemetry health.
- `GET /api/telemetry?hours=24` returns run, usage, and audit summaries.
- `POST /api/telemetry` records low-level user or agent audit metadata.
- `GET|PATCH /api/workspace` loads the owner workspace or updates studio and
  privacy settings.

## Owner workflows

- `POST /api/clients` creates a persistent client.
- `POST /api/projects` creates a project connected to a client.
- `POST /api/appointments` schedules a client/project appointment.
- `POST /api/messages` writes an owner message into the shared conversation.
- `POST /api/approvals` creates a client-facing approval or records an owner
  decision.
- `POST /api/briefing` prioritizes live workspace state and writes a complete
  observable run.

## Client portal

- `POST /api/portal/invitations` revokes previous access and issues a new
  30-day portal token.
- `GET /api/portal?token=...` returns only the invited client's projects,
  appointments, approvals, messages, files, and public updates.
- `POST /api/portal` sends a client message or records an approval/revision
  decision.
- `GET|POST /api/files` uploads project media to R2 or retrieves an authorized
  asset. Uploads are limited to 25 MB and receive a SHA-256 integrity hash.

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

Future routes will add project transitions, tattoo-session capture, healing,
payments, content publishing, full-text search, and knowledge graph editing.
