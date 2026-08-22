# Stage 15 complete tattoo vertical slice

Stage 15 connects the existing Legacy OS modules into one truthful tattoo-business journey. It does not create a second project system and does not rewrite existing alpha data.

## Canonical journey

Every project now exposes an evidence-derived journey:

1. Inquiry
2. Qualification
3. Client + project
4. References
5. Design
6. Exact design approval
7. Quote
8. Deposit
9. Appointment
10. Tattoo session
11. Final payment
12. Healing
13. Content decision
14. Outcome
15. Knowledge
16. Complete

The six creator-facing phases remain `consult`, `design`, `approval`, `session`, `healing`, and `complete`. The detailed journey explains what must be true inside those phases instead of forcing Joshua to manage sixteen separate screens.

## Evidence rules

- Approved client intake becomes the project without retyping its concept, placement, style, budget, constraints, or references summary.
- Reference and design milestones come from classified project assets.
- Approval requires an approved immutable asset version.
- Quote and deposit milestones come from the payment ledger; payment truth is still controlled by signed Stripe webhook outcomes.
- Appointment and session milestones come from connected operational records.
- Healing requires a submitted check-in reviewed by the studio.
- Content is complete when approved content is prepared or the client's media opt-out is explicitly preserved.
- Outcome comes from measured session or healing evidence.
- Knowledge remains Legacy-owned and is captured when a real, non-test project completes.

## Transition gates

Projects cannot skip phases. Advancing requires:

- `consult → design`: qualified intake, client connection, and references.
- `design → approval`: a classified design version.
- `approval → session`: exact approval, pricing, paid deposit, and an appointment.
- `session → healing`: a completed tattoo session. Session completion normally performs this transition automatically.
- `healing → complete`: settled payment records, reviewed healing evidence, a content consent decision, and a measured outcome.

The server enforces these rules. Disabling or bypassing the interface button cannot bypass them.

## Data preservation

This stage adds a computed project journey, UI presentation, and transition policy. It contains no database migration, destructive query, or record rewrite. Existing project, client, payment, asset, appointment, approval, session, healing, content, outcome, and knowledge records become the evidence for the journey.
