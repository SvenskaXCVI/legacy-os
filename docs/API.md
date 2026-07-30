# Legacy OS API Contract

Base path: `/api`  
Current version: foundation v0.2  
Encoding: JSON UTF-8

## Identity

Production requests are attributed from `oai-authenticated-user-email`. The browser never supplies an actor ID in a request body. Local development falls back to `local-preview`.

## Health

### `GET /api/health`

Returns application, database, and telemetry health.

Success: `200`

```json
{
  "status": "healthy",
  "checkedAt": "2026-07-29T23:00:00.000Z",
  "services": {
    "application": "healthy",
    "database": "healthy",
    "telemetry": "healthy"
  }
}
```

## Telemetry

### `GET /api/telemetry?hours=24`

Returns run counts, successful and approval-held totals, average latency, token use, estimated cost, and the latest 50 audit records. `hours` is clamped from 1 to 720.

### `POST /api/telemetry`

Records a low-level user or agent audit event. Content is not stored unless a future workspace policy explicitly permits it.

```json
{
  "kind": "ui_action",
  "action": "navigation.changed",
  "target": "operations",
  "risk": "low",
  "correlationId": "optional",
  "contentCaptured": false,
  "metadata": {}
}
```

Responses:

- `201` recorded
- `400` invalid request
- `500` persistence failure

## Approvals

### `POST /api/approvals`

Records a human decision and an append-only audit event in one database batch.

```json
{
  "approvalId": "ap-1042",
  "decision": "approved",
  "category": "Design direction",
  "subject": "Renaissance sleeve — composition v4",
  "reason": "Optional human note"
}
```

Allowed decisions: `approved`, `revision`, `rejected`.

## Planned domain routes

The following contracts should be added behind the same workspace authorization boundary:

- `GET|POST /api/clients`
- `GET|PATCH /api/clients/{clientId}`
- `GET|POST /api/projects`
- `GET|PATCH /api/projects/{projectId}`
- `POST /api/projects/{projectId}/transition`
- `POST /api/assets/upload-intent`
- `POST /api/assets/{assetId}/extraction`
- `GET /api/search`
- `GET /api/knowledge/items/{itemId}`
- `POST /api/knowledge/edges`
- `POST /api/ai/runs`
- `POST /api/ai/runs/{runId}/events`
- `POST /api/ai/runs/{runId}/tool-calls`
- `POST /api/ai/runs/{runId}/usage`

## Error envelope

```json
{
  "error": {
    "code": "approval_invalid_state",
    "message": "This approval is no longer pending.",
    "correlationId": "corr_..."
  }
}
```

No error response should contain raw prompts, credentials, provider payloads, or client-sensitive content.
