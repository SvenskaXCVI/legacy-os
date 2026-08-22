# Specialist Intelligence

Stage 25 gives each member of the Legacy OS AI staff a bounded, inspectable capability. The eight specialists are Client, Design, Knowledge, Operations, Scheduling, Finance, Content, and Analytics. They collaborate through shared records, tasks, events, evidence references, and Chief of Staff delegation—not fabricated conversations between models.

## One trustworthy output contract

Every evaluation produces the same structure:

- a deterministic factual snapshot from authorized Legacy OS records;
- findings that cite exact record references;
- safe internal recommendations with supporting evidence;
- a confidence score that cannot exceed the deterministic baseline;
- limitations and a domain-specific stop rule;
- provider, model, token, task, run, project, client, and policy provenance.

Facts and financial calculations remain deterministic. When an external model is configured, it may interpret the verified snapshot through a strict structured-output schema. Unknown evidence references are discarded, invalid responses fall back safely, and the model never owns application state.

## Domain boundaries

- Client detects unread communication, missing contact paths, and approval friction. It may prepare an internal draft but cannot contact a client or make a promise.
- Design assesses placement, references, versions, and exact immutable approvals. It does not replace artistic judgment or alter an approved artifact.
- Knowledge retrieves source-linked items while preserving verification status and disagreement. It does not turn uncertain memory into fact.
- Operations identifies lifecycle blockers, unresolved approvals, missing next actions, and healing concerns. It cannot skip workflow gates or make medical claims.
- Scheduling detects upcoming work, overlaps, unscheduled projects, and readiness gaps. It cannot create or change a calendar commitment.
- Finance calculates requested, collected, refunded, realized, outstanding, and overdue values from payment records. It does not treat estimates as revenue or provide accounting advice.
- Content identifies assets with sufficient rights and consent for internal preparation. It cannot publish or use an ineligible asset.
- Analytics separates recorded outcomes from pattern candidates and identifies unmeasured recommendations. It does not claim causation or significance without evidence.

## Authority and privacy

Running a specialist is owner-only. Project and client scope must match and test or archived projects are excluded from intelligence. The optional provider receives normalized facts, record references, safe deterministic findings, the success condition, and the stop rule; it does not receive raw client-message bodies. Specialist recommendations are restricted to internal analysis, drafting, or internal tasks. Any client communication, scheduling, publishing, money movement, destructive change, or permission change still passes through the separate authority and connector gates.

## Honest operational boundary

This stage does not claim that every external service is connected. Specialist reasoning works without a model provider through deterministic fallbacks, while real Gmail, Calendar, Stripe, Instagram, storage, and other integrations remain separately configured connector capabilities. Stage 26 is the production connector stage.

The schema migration is additive: it creates `specialist_evaluations` and indexes without modifying or deleting existing alpha records.
