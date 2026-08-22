# Secure Realtime State Delivery

Stage 22 connects durable backend activity to open owner and client interfaces. When a normalized Legacy OS event is committed, a small audience-scoped notification is appended to the realtime ledger. Connected interfaces receive the event, coalesce nearby changes, and reload their authorized current state.

## Event path

1. A user, provider, worker, workflow, or agent changes Legacy OS state.
2. Universal Capture normalizes the event and enforces idempotency.
3. The realtime publisher appends an owner notification and, only when eligible, a client-scoped notification.
4. The authenticated stream delivers events after the browser's last sequence cursor.
5. The interface coalesces rapid events and refreshes its server-authorized state.

## Security model

- Owner streams require the same verified owner authorization as the operations workspace.
- Client streams require a valid invitation or verified client account.
- Client queries are restricted by workspace, audience, and the server-resolved client ID.
- A client-supplied client ID is never trusted.
- Internal agent, learning, memory, worker, and audit activity is not copied to the client stream.
- Stream records contain event metadata and changed-field names, not message bodies, prompts, payment credentials, files, or private notes.
- Responses disable caching and shared-proxy buffering.
- Supabase access tokens remain in memory and are attached to the streaming fetch; they are not duplicated into browser storage.

## Reliability

- SQLite auto-increment sequences create resumable ordering.
- Every owner and client delivery has a capture-derived idempotency key.
- The stream sends heartbeats, closes after a bounded connection window, and reconnects automatically.
- Reconnection continues from the latest received sequence.
- A new connection begins at the current cursor, avoiding a replay of historical interface activity.
- Rapid changes trigger one coalesced state reconciliation instead of a reload per event.

## Interface behavior

The owner header and client identity area display `connecting`, `live`, `reconnecting`, or `offline`. The live indicator pulses only when motion is allowed by the device preference.

## Current limit

Stage 22 reconciles the authorized workspace or portal payload after a relevant event. A later optimization can add entity-specific delta payloads so very large workspaces fetch only the changed record. This stage does not claim WebSocket or Durable Object infrastructure that the current Sites configuration does not provide.

## Data preservation

Migration `0016_reflective_iron_fist.sql` creates only the realtime ledger and its cursor/idempotency indexes. It contains no drops, deletes, table rewrites, or updates to existing alpha records.
