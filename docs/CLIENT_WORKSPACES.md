# Stage 7 — Owner Client Workspaces

Stage 7 completes the owner-side relationship workspace and adds reversible cleanup controls. It does not migrate, delete, or rewrite existing alpha records.

## Complete relationship view

Opening a client now provides owner-only tabs for:

- identity and contact channels;
- private studio notes;
- projects and project requests;
- messages, appointments, files, approvals, tattoo sessions, and healing activity;
- collected and outstanding payments;
- portal access and media-consent state; and
- one chronological relationship timeline.

The owner can jump directly to Messages, Projects, Calendar, Finance, and Lifecycle Operations from the client workspace. The client-facing portal remains a separate API boundary and never receives private studio notes, technique notes, or owner reasoning.

## Reversible cleanup

- Projects can be marked as test data, restored to real data, archived, restored, or archived as a duplicate of another project.
- Duplicate cleanup stores the canonical project ID in the audit event.
- Archiving is a soft operation; related historical records remain intact.
- A client cannot be archived while they still have an active, non-archived project.
- Archived project notifications are dismissed so stale work does not remain in the attention queue.

## Intelligence integrity

Test and archived projects are excluded from:

- Chief of Staff briefing project state;
- automation sweeps and new workflow notifications;
- completed-project learning and pattern discovery;
- owner dashboard project totals;
- operational analytics;
- Finance Center totals; and
- Knowledge and Content source lists.

This exclusion happens in both server-side reasoning queries and creator-facing calculations. Historical audit evidence is preserved.

## Alpha data safety

Stage 7 introduces no database migration. It adds only owner-triggered, confirmed, reversible status changes. No existing record is automatically marked, archived, merged, or deleted when this release is eventually deployed.
