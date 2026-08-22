# Production Automation Playbooks

Stage 20 turns the AI staff and tattoo lifecycle into durable operational playbooks. A playbook is a versioned trigger list plus an ordered set of internal specialist tasks. It does not grant a model direct access to providers or permission to cross an approval boundary.

## Included playbooks

1. Inquiry triage qualifies structured intake and prepares the owner's decision brief.
2. Project launch establishes workflow, design context, and deposit readiness.
3. Design approval control verifies an exact version and the next lifecycle gate.
4. Payment to booking reviews webhook-backed settlement before preparing appointment options.
5. Appointment preparation checks session evidence and client readiness.
6. Session to healing records session outcomes, prepares aftercare review, and captures technique evidence.
7. Healing review prioritizes submitted evidence without diagnosis or medical treatment claims.
8. Completion and learning measures outcomes, preserves lessons, and checks consent-aware portfolio readiness.
9. Daily studio brief coordinates current priorities, blockers, client attention, and payment attention.

## Execution model

- `captureUniversalEvent` remains the normalized event entry point.
- Matching enabled playbooks create one idempotent run per capture and playbook.
- Every step records its intended specialist, status, schedule, linked agent task, and outcome.
- Internal, low-risk analysis can execute automatically through the model-agnostic agent engine.
- Client communication, appointment changes, publishing, financial actions, sharing, and destructive work still stop at the existing approval and connector boundaries.
- Owners can pause or enable individual playbooks and start a manual run from AI Operations.

## Scheduling truth

Due steps are processed during authenticated workspace wake-ups or an explicit sweep. This stage does not claim a continuously running external cron service. A future deployment can call the same sweep endpoint from Cloudflare Cron without changing playbook records or behavior.

## Data safety

Migration `0014_pink_vector.sql` only creates the playbook registry, run ledger, step ledger, and indexes. It contains no drops, deletes, table rewrites, or data backfills. Existing alpha clients, projects, messages, files, payments, approvals, sessions, memories, and agent records remain unchanged.

## Operational limits

- Playbook definitions are code-versioned in Stage 20; the owner can enable or pause them but cannot yet edit their step graph in the UI.
- External actions remain limited to adapters that are truly configured and available.
- A model can prepare evidence-backed work, but Legacy OS—not the model—owns memory, policy, workflow state, approvals, and the audit trail.
