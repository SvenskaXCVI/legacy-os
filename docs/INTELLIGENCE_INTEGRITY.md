# Stage 8 — Intelligence Integrity

Stage 8 makes Legacy OS explicit about what it knows, why a recommendation appears, and whether a learning run actually changed knowledge. The migration is additive: existing clients, projects, observations, patterns, recommendations, and learning history remain intact.

## Evidence-aware learning

- Each eligible evidence set receives a deterministic SHA-256 fingerprint.
- Running the engine again with the same evidence records a `learning.no_change` AI and audit event, but does not create a duplicate learning cycle, knowledge item, recommendation, or confidence increase.
- A successful cycle stores the complete eligible observation ID set and the exact IDs that are new relative to the previous successful cycle.
- A pattern version increments only when that pattern's evidence hash changes.
- The owner view states how much evidence was eligible, how much was new, and whether knowledge changed.

An observation is eligible when it is workspace-level evidence or belongs to a completed, real, non-archived project. Test and archived work cannot train the system.

## Meaningful patterns and confidence

A candidate needs at least three observations, three completed projects, two distinct clients, a 10% observed effect, and 65% confidence to become active. Confidence combines evidence quality, sample strength, replication across projects and clients, effect strength, and recency. These are association scores, not fabricated causal claims.

Style aliases are canonicalized before grouping. For example, “black and gray,” “black & gray,” and “black and grey” share one `Black & Grey` concept. Creator-facing labels explain the pattern in studio language; internal event keys remain available only in evidence records.

## Chief of Staff priority policy

The daily brief is computed from current, non-archived operational records. Its order is:

1. healing concerns and submitted healing reviews;
2. unread client messages;
3. pending owner approvals;
4. upcoming appointments;
5. failed or outstanding approved payments; and
6. active projects without a next action.

Every item includes a plain-language reason and an evidence reference. The run log stores the source counts used to create the briefing.

## Autonomy boundary

Legacy OS remains model-agnostic: its database owns memory, evidence, policies, workflow state, and audit history. Models may explain supplied evidence, but they do not own system memory or authority. Only low-risk, internal, reversible actions may run automatically when policy confidence is met. Client messages, publishing, scheduling changes, financial actions, and other external effects remain approval-gated.

## Existing alpha data

The database migration only adds nullable or defaulted integrity fields and one uniqueness index. Existing rows are preserved. Historical taxonomy aliases are not rewritten in place; a later evidence evaluation can mark duplicate alias patterns as superseded while keeping their history.
