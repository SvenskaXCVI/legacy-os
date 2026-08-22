# Stage 16 — Universal Capture

Stage 16 gives Legacy OS one durable intake stream for the signals that feed memory, workflows, reasoning, and learning.

## What is captured

- Owner-authored observations, decisions, preferences, technique lessons, and follow-ups.
- Client inquiries, intake submissions, messages, approvals, healing check-ins, and portal actions as safe metadata.
- Project creation, phase changes, appointments, payment settlement, tattoo sessions, healing review, and completion.
- File and design-version uploads through metadata and source pointers; file bytes remain in R2.
- AI and automation events through their existing observable run and job ledgers.
- External social evidence only when a valid consent grant is attached.

## Storage model

`capture_events` is a normalized index, not a replacement for the source record. Messages remain in `client_messages`, assets remain in `assets` and R2, approvals remain in `approvals`, audit records remain in `audit_events`, and AI runs remain in `ai_runs`.

Each capture stores its channel, event type, source pointer, related client/project, content policy, safe metadata, content hash, consent pointer where required, timestamps, and a workspace-scoped idempotency key.

## Privacy boundary

Raw client messages, prompts, captions, and uploaded file contents are not copied into the universal ledger. Metadata-only captures record evidence pointers and bounded operational facts. Explicit notes submitted by the owner through the Universal Capture form retain their note text because the owner deliberately asked Legacy OS to remember it.

## Historical alpha records

Recent audit metadata is normalized on workspace load with deterministic idempotency keys. This creates searchable capture pointers without altering the historical audit entries. Repeated loads cannot duplicate the normalized records.

## Migration safety

Stage 16 uses one additive database migration that creates `capture_events` and its indexes. It contains no table drops, deletes, destructive updates, or rewrites of existing client, project, message, payment, media, approval, learning, or audit data.

## Approval boundary

Capture and internal organization may happen automatically. Capturing a signal does not authorize Legacy OS to message a client, schedule an appointment, charge or refund money, publish content, change permissions, or perform destructive work. Those actions remain governed by the existing approval policy.
