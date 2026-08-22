# Stage 18 — Multi-Agent Staff and Task Routing

Legacy OS now owns a model-agnostic staff orchestration layer. The staff is not a collection of unrestricted model sessions. It is a durable, auditable routing system that gives each specialist only the project, client, evidence, and memory references needed for one task.

## Staff roster

- Chief of Staff — triage, prioritization, delegation, and coordination.
- Client Manager — inquiry qualification and client follow-up drafts.
- Design Director — reference classification, design briefs, and version readiness.
- Operations Manager — lifecycle checks, blockers, sessions, and next steps.
- Scheduling Coordinator — schedule plans, conflict checks, and reminder preparation.
- Finance Manager — deposit, balance, invoice, and payment review.
- Content Producer — rights-aware content briefs and drafts.
- Knowledge Librarian — scoped memory, context, and knowledge stewardship.
- Analytics Advisor — patterns, outcomes, confidence, and recommendations.

The registry is workspace-scoped and versioned by `legacy-staff-v1`. Updating a definition never deletes a historical task or AI run.

## Routing contract

Every task records:

- the assigned specialist and parent task;
- project and client scope;
- requester, purpose, priority, risk, and reversibility;
- evidence references and the exact scoped memory IDs supplied;
- whether owner approval is required;
- correlation and idempotency identifiers;
- attempts, status, result, failure, and completion times;
- the Chief-of-Staff handoff and contract version.

New normalized automation signals automatically create one idempotent internal review task. Manual owner tasks use the same router. The router chooses a specialist deterministically from the task type and category, so model choice cannot silently change access boundaries.

## Autonomy boundary

Safe, reversible internal work can run automatically. Examples include classification, summarization, workflow checks, design briefs, context building, and outcome analysis.

Externally effective actions require owner approval. This includes sending client messages, changing appointments, publishing content, charging or refunding money, sharing records, and destructive actions. Approval does not bypass missing integrations: an approved task moves to `ready_for_connector` and explicitly records that no external side effect occurred. A later connector stage will execute supported actions through narrow, credentialed adapters and record the tool call.

Agents never receive broad raw database access. They receive bounded context packets from Stage 17 and source evidence references. Client isolation, consent, approval, and audit policies remain authoritative.

## Owner operations

AI Operations now includes:

- a live nine-agent roster and autonomy policy;
- a delegation form with task, scope, boundary, and priority controls;
- a task ledger showing assignment, memory count, result, approval, and status;
- run, retry, and cancel controls;
- the existing AI run ledger and audit trail for completed work.

The existing Approval Queue remains the decision surface for gated agent actions.

## Data safety

Stage 18 adds three tables: `agent_definitions`, `agent_tasks`, and `agent_handoffs`. Migration `0012_gray_serpent_society.sql` contains only additive table and index creation. It does not drop, delete, update, or rewrite any alpha client, project, asset, payment, capture, memory, or audit record.

