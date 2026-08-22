# Stage 6 — Tattoo Lifecycle

Stage 6 turns the session and healing phases into persisted, auditable workflows. It is additive: the migration creates three new tables and does not rewrite or remove existing alpha data.

## Owner workflow

1. Plan a tattoo session against an existing client project.
2. Keep technique and setup notes owner-only while maintaining a separate client-visible summary.
3. Complete a session only after the project has an approved artifact.
4. Completion moves the project to healing, records session duration as outcome evidence, and idempotently schedules day 3, 7, 14, and 30 check-ins.
5. Review client submissions. A concern flag raises priority but never represents a diagnosis.
6. Create a content candidate only from an asset that is content-eligible, rights-cleared, and backed by active client media consent.
7. Approve the draft explicitly. Approval does not publish it.

## Client workflow

- The client sees only their own sessions and client-visible summaries.
- The client can submit a 1–5 progress rating, private notes, and a priority-review flag.
- The portal clearly states that healing follow-up is not medical diagnosis.
- Tattoo media permission is optional, scoped, logged, and revocable.
- Revocation blocks future content drafting.

## Automation and evidence

The workflow emits structured signals for planned sessions, completed sessions, submitted healing check-ins, and reviewed check-ins. Session duration and check-in ratings become evidence for future pattern discovery. No external publishing, messaging, diagnosis, or financial action is performed automatically.

## Data boundaries

- `tattoo_sessions.technique_notes`, needle setup, and ink setup are never returned by the client lifecycle endpoint.
- Client queries are constrained by authenticated client ID and workspace ID.
- Content candidates preserve source asset, consent, rights, and evidence references.
- Idempotency keys prevent duplicate sessions, healing schedules, and content candidates.
