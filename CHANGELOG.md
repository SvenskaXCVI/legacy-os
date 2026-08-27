# Legacy OS release history

## 0.7.0-alpha.36 — 2026-08-26

- Added Supabase-backed workspace memberships as the authoritative owner-role registry, protected by Postgres Row Level Security.
- Added safe initial-owner claiming and email-bound owner invitations without placing authorization in user-editable profile metadata.
- Added an owner access registry under Settings → Team with pending, active, suspended, and revoked states plus an auditable membership event history.
- Enforced verified email and authenticator-based AAL2 sessions for owner operations while preserving the existing owner code as a temporary recovery path.
- Preserved all D1 workspace, client, project, media, payment, and AI records during the authorization migration.

## 0.7.0-alpha.35 — 2026-08-26

- Added a production Connections settings area for Supabase Auth, Stripe Checkout, the operational D1 database, private R2 media, and the model runtime.
- Added protected, server-side connection checks without returning or storing provider secrets in the browser.
- Activated Supabase’s publishable project connection while preserving D1 as the authoritative source for all existing alpha records.
- Kept the studio owner access-code session available alongside Supabase identity so authorized alpha testers can still enter from another device.
- Kept Stripe live charging safety-locked until restricted credentials, signed webhooks, and explicit live authorization are all present.

## 0.7.0-alpha.34 — 2026-08-26

- Replaced the generic reasoning adapter with a production-ready, stateless OpenAI Responses runtime supporting strict structured output, timeouts, prompt caching, safety identifiers, and image inputs.
- Added protected runtime verification, model/provider status, response telemetry, cached-token and reasoning-token accounting, and deterministic fallback.
- Kept Legacy OS authoritative over memory, evidence, policy, tools, approvals, workflows, and outcomes; the external model remains replaceable.

## 0.7.0-alpha.33 — 2026-08-26

- Added first-class historical project imports with original occurrence dates, lifecycle position, and financial classifications while preventing historical backfills from firing current-day automations.
- Added honest historical evidence waivers so unavailable records are labeled instead of fabricated, with additive schema changes that preserve all alpha data.
- Made dashboard metrics, active projects, client metrics, relationship summaries, and lifecycle milestones lead directly to their supporting records and workspaces.
- Expanded the relationship timeline with client creation, private-note provenance, project creation/import history, and separate occurred-versus-recorded timestamps.
- Replaced opaque archive failures with an actionable dependency dialog and separated owner next actions from lifecycle blockers.
- Made Calendar the default scheduling experience with functional Day, Week, and Month ranges; advanced capacity intelligence remains available in a dedicated secondary view.
- Added reliable outside-tap dismissal for notifications, normalized phone display, and safe Instagram/TikTok profile links without duplicated handles.
- Confirmed the client portal retains its secure reply composer and shared owner-client conversation path.

## 0.7.0-alpha.30 — 2026-08-26

- Began the second alpha-testing repair program with the highest-risk context and write-integrity findings.
- Preserved client context when opening Design Studio; project choices are now limited to that client, and clients without projects receive a clear creation path instead of an unrelated default project.
- Replaced client-media downloads-as-navigation with an in-app lightbox while retaining an explicit original-file download action.
- Made project-request clarification an intentional two-step composer, and visibly flags low-confidence intake for clarification.
- Made lifecycle advancement visibly pending and wait for refreshed workspace state before reporting completion.
- Added frontend submission locking, a stable request key, backend idempotency, and matching-appointment detection to prevent duplicate scheduling from repeated taps or retries.
- Added one additive appointments column and unique index; no existing alpha records are updated or removed.

## 0.7.0-alpha.29 — 2026-08-22

- Reorganized AI Operations into six focused workspaces—Overview, Automations, Intelligence, AI Workforce, Learning, and Activity—without removing any capability.
- Added a concise AI Operations overview that exposes live counts and routes directly to each operational area.
- Standardized typography, spacing, cards, buttons, selects, date/time inputs, text fields, and responsive field rows across owner and client pages.
- Replaced raw memory event identifiers and JSON with readable summaries while retaining evidence and provenance in an expandable disclosure.
- Tightened scheduling, knowledge, activity, and other empty states so content stays centered and does not consume unnecessary page height.
- Added desktop and mobile overflow protection, balanced grids, clear section dividers, and consistent responsive behavior throughout the application.
- This release is presentation-only and does not add a migration, change the database schema, or modify existing alpha-user records.

## 0.7.0-alpha.28 — 2026-08-22

- Production hotfix: bounded audit-capture backfill lookups to safe database parameter batches, moved historical capture and memory maintenance to the always-on worker, and prevented internal database or provider errors from being rendered in the owner interface.
- Added explicit owner-defined tattoo, design, admin, and protected personal capacity windows instead of treating empty calendar time as availability.
- Added project-level session requirements for duration, preparation, travel, buffers, energy demand, date boundaries, location, and expected value.
- Added a deterministic scheduling evaluator that requires session-stage readiness, an exact approved design version, a paid deposit, and a complete session requirement before suggesting a fit.
- Added collision, daily tattoo-minute, high-energy-session, protected-time, and minimum-session constraints with visible evidence and readiness blockers.
- Added weekly collected-revenue context while keeping projected project value clearly separate from settled payments.
- Added an owner Scheduling & Capacity workspace for entering capacity and policy, reviewing recommendations, and routing one exact appointment through the existing approval system.
- Added five additive scheduling tables without modifying or deleting existing alpha records; recommendations never create appointments without owner approval.

## 0.7.0-alpha.27 — 2026-08-22

- Added owner-only session craft records for machine, needle, ink/wash, voltage, technique, placement, skin response, client response, fresh-result evidence, and Joshua's assessment.
- Added structured owner healing assessments connected to submitted client check-ins, including retention, saturation, line quality, smoothness, overall healed outcome, touch-up status, feedback, and photo evidence.
- Added an automatic, deterministic craft evaluator that excludes test and archived projects and requires complete session-to-healed-result evidence.
- Added explicit promotion thresholds across completed projects, distinct clients, observed effect, confidence, and record completeness; insufficient evidence remains visibly labeled as a candidate.
- Added owner-approval-required craft recommendations using association language rather than causal claims.
- Added a responsive Professional Craft Intelligence workspace with capture forms, visible thresholds, pattern evidence counts, confidence, and an analysis ledger.
- Added three additive tables without modifying or deleting existing alpha records.

## 0.7.0-alpha.26 — 2026-08-22

- Added production Google OAuth for separately authorized Gmail and Google Calendar connections using minimal task-specific scopes.
- Added single-use, ten-minute, HMAC-signed OAuth state records and AES-256-GCM encrypted refresh credentials; usable tokens never enter browser storage, logs, workspace responses, or connector traces.
- Added exact owner-approved Gmail delivery with client/project scope checks and metadata-only operational capture.
- Added optional Google Calendar mirroring for approved Legacy appointments using deterministic provider event IDs to prevent duplicate external events.
- Added refresh-token rotation, connection health degradation, revocation, reconnection, and owner-facing connect/disconnect controls.
- Retained Stripe-hosted Checkout with dynamic payment methods, restricted-key preference, signed-webhook settlement authority, current API versioning, and live-payment lockout.
- Added two connector-security tables through an additive migration that does not modify or remove existing alpha records.

## 0.7.0-alpha.25 — 2026-08-22

- Added eight bounded specialist intelligence capabilities for client relationships, design readiness, knowledge quality, operations, scheduling, finance, content, and analytics.
- Standardized every specialist result into facts, findings, safe internal recommendations, evidence references, confidence, and explicit limitations.
- Kept calculations and state retrieval deterministic while allowing an optional model-agnostic structured interpretation that cannot introduce unknown evidence or increase confidence.
- Connected specialist work to the existing task router, authority registry, AI run trace, usage ledger, audit trail, and Chief of Staff delegation path.
- Added an owner-only Specialist Intelligence console with optional project and client scope plus a readable evaluation history for all eight domains.
- Added one evaluation table through an additive migration; existing alpha records are not changed or removed.

## 0.7.0-alpha.24 — 2026-08-22

- Added a durable Chief of Staff manager that reads authorized workspace state, retrieves scoped memory, prioritizes evidence-backed work, and delegates bounded tasks to specialist agents.
- Added an optional model-agnostic structured planning adapter with a deterministic fallback; every proposed step is independently constrained by Legacy OS entity, tool, and authority registries.
- Added parent-child run provenance linking Chief plans to specialist work, plus step-by-step evidence, approval, usage, tool-call, event, and audit traces.
- Added owner controls for scoped Chief objectives, safe internal planning, response drafting, and exact approval-gated client messages or appointment requests.
- Added resumable authority pauses: approval does not silently perform an external action, and unavailable connector execution remains visibly held at the connector boundary.
- Added two manager trace tables and one nullable parent-run field through an additive migration that preserves existing alpha records.

## 0.7.0-alpha.23 — 2026-08-22

- Added a durable registry for every AI-callable tool, including input and output contracts, side-effect class, authority class, retry policy, audit behavior, allowed agents, and connector binding.
- Added deterministic `AUTO`, `AUTO WITH LOG`, `ASK`, `OWNER ONLY`, and `DENIED` policy enforcement with unknown tools denied by default.
- Routed AI delegation and connector execution through the same authority engine so a capability cannot grant itself more authority or bypass an approval at execution time.
- Added durable, hashed authority decisions with task, approval, actor, policy, reason, and correlation provenance.
- Added an owner-only inspection API and an operational Tool + Authority Registry with live class counts and a recent decision ledger.
- Added two new tables and one defaulted task field through an additive migration that preserves all existing alpha records.

## 0.7.0-alpha.22 — 2026-08-22

- Added a durable realtime event ledger sourced from normalized Legacy OS activity.
- Added an authenticated streaming endpoint with resumable sequence cursors, heartbeats, automatic reconnects, and cache prevention.
- Added strict owner and client audience isolation; clients receive only allowlisted updates scoped to their own client identity.
- Connected owner and client interfaces to coalesced live-state refreshes without storing authentication tokens or private records in browser storage.
- Added visible live, connecting, reconnecting, and offline status indicators with reduced-motion support.
- Added one additive realtime table and cursor indexes without changing existing alpha records.


## 0.7.0-alpha.21 — 2026-08-22

- Added a durable Always On scheduler for maintenance and the daily studio briefing.
- Added authenticated worker execution with owner fallback, recorded heartbeats, and visible processing metrics.
- Added atomic job claims, five-minute worker leases, automatic recovery of abandoned work, bounded exponential retries, and duplicate suppression.
- Added a durable dead-letter queue for work that exhausts its retry policy, plus owner-only replay into a new traceable job.
- Added owner-facing schedule, heartbeat, queue, and failure-recovery controls under Settings → Automations.
- Added three runtime tables and five nullable queue fields through an additive migration that preserves existing alpha records.


## 0.7.0-alpha.20 — 2026-08-22

- Added nine production automation playbooks spanning inquiry triage, project launch, design approval, payment-to-booking, appointment preparation, session-to-healing, healing review, completion learning, and the daily studio brief.
- Connected normalized lifecycle events to idempotent playbook runs and durable specialist steps with exact project, client, capture, and task provenance.
- Added safe automatic execution for internal analysis while retaining existing owner approval and connector boundaries for client messages, scheduling, publishing, financial actions, and destructive changes.
- Added owner controls to inspect, pause, enable, and manually run each playbook, plus a readable run and step ledger in AI Operations.
- Added wake-up processing for due playbook steps without claiming a continuously running scheduler when the application is asleep.
- Added three new tables through an additive migration; no existing alpha records are modified or removed.

## 0.7.0-alpha.19 — 2026-08-22

- Added one least-privilege connector gateway between approved AI tasks and real service actions.
- Added functional approved adapters for private client-portal messages and conflict-checked studio appointments.
- Routed consented Instagram evidence synchronization through the same connector execution ledger without enabling publishing or engagement actions.
- Recorded client-initiated Stripe-hosted Checkout activity while retaining signed webhooks as settlement authority and keeping direct agent charging disabled.
- Added connector availability, credential state, health, execution results, and configuration-required states to AI Operations.
- Added redacted, hashed, idempotent execution records without storing provider secrets or copying message content into connector logs.
- Added two connector tables and one defaulted agent-task field through an additive migration that preserves existing alpha data.

## 0.7.0-alpha.18 — 2026-08-22

- Added a durable nine-agent staff registry led by the Chief of Staff and supported by client, design, operations, scheduling, finance, content, knowledge, and analytics specialists.
- Added deterministic, model-agnostic task routing with project/client scope, exact memory references, evidence, priority, risk, reversibility, correlation, idempotency, attempts, and results.
- Connected normalized workflow signals to one idempotent specialist review task so new studio activity automatically reaches the appropriate AI staff role.
- Added owner-facing delegation, roster, approval-state, run, retry, cancellation, result, and audit controls in AI Operations.
- Enforced approval and connector boundaries for client communication, scheduling changes, publishing, payments, sharing, and destructive actions.
- Added three additive D1 tables and preserved all existing alpha records unchanged.

## 0.7.0-alpha.17 — 2026-08-22

- Added durable workspace, client, and project memory with source-capture provenance, confidence, sensitivity, verification state, validity windows, and version history.
- Added deterministic memory consolidation that separates transient events from facts, decisions, outcomes, preferences, and explicit owner notes worth remembering.
- Added reinforcement for repeated evidence and supersession for changed memory instead of silently overwriting prior knowledge.
- Added bounded context packets that rank relevant memory by scope, owner verification, confidence, and recency while excluding revoked and unrelated client records.
- Connected scoped memory evidence to Chief of Staff briefing runs and exposed included, available, and budget-omitted context counts.
- Added owner controls to consolidate, verify, revoke, inspect, and search memory from the Knowledge Library.
- Added one additive D1 migration; existing capture, knowledge, client, project, AI, payment, and audit data remains unchanged.

## 0.7.0-alpha.16 — 2026-08-22

- Added one durable, normalized capture stream spanning owner notes, client activity, workflow changes, file uploads, AI/system events, and consented social evidence.
- Added an owner-facing Universal Capture workspace for recording and connecting observations to live tattoo projects.
- Kept raw message and client content out of the capture ledger by default; explicit owner notes are the only full text retained through this surface.
- Added source pointers, content hashes, consent references, channel labels, correlation fields, and workspace-scoped idempotency protection.
- Safely normalizes recent historical audit metadata without editing or deleting the original alpha records.
- Added an additive D1 migration for the capture ledger; all existing specialist ledgers remain authoritative and unchanged.

## 0.7.0-alpha.15 — 2026-08-22

- Connected inquiry, qualification, project, references, design, exact approval, quote, deposit, appointment, session, final payment, healing, content consent, outcome, knowledge, and completion into one evidence-based tattoo journey.
- Added a live project journey panel with progress, the next missing requirement, and evidence-derived milestone states.
- Prevented projects from skipping canonical phases or advancing when required operational records are missing.
- Reconciled content rights classifications so approved studio-created and authorized tattoo media can enter the existing consent-gated content workflow.
- Reused existing records and computed the new journey projection without rewriting alpha data or adding duplicate lifecycle tables.


## 0.7.0-alpha.14 — 2026-08-22

- Closed an unsafe private-preview fallback so an arbitrary external platform identity can never become an owner without an explicit server allowlist.
- Added strict deployment validation for malformed owner access hashes, partial Supabase configuration, and missing owner allowlists.
- Marked all access-code session and authentication-configuration responses private and non-cacheable to prevent cross-device or shared-cache session confusion.
- Added visible health diagnostics for incomplete identity configuration without exposing credentials, codes, hashes, or account data.
- Preserved all existing client, project, payment, media, approval, audit, and learning records; Stage 14 requires no destructive data migration.

## 0.7.0-alpha.5 — 2026-08-21

- Replaced the Design Studio filename placeholder with authenticated image previews of private R2 assets.
- Added client-facing previews for the exact immutable artifact and version under approval.
- Activated tattoo-specific asset roles, visibility, rights, consent, and Content Studio eligibility controls.
- Added true version lineage for uploaded design iterations while preserving every original file.
- Prevented references and unrelated files from being submitted as client design approvals.
- Added version-bound, auditable visual design analysis through an optional vision-capable model adapter.
- Added an additive analysis ledger and asset indexes without modifying existing alpha records.

## 0.6.0-alpha.4 — 2026-08-21

- Added owner-created, owner-approved deposits, invoices, balances, and other payment requests.
- Added client-scoped Stripe-hosted Checkout without exposing payment credentials to Legacy OS.
- Added signed, idempotent Stripe webhook processing as the authoritative payment ledger.
- Added partial/full refund controls, audited financial actions, and payment outcome learning signals.
- Added owner Finance Center metrics and client payment/receipt history.
- Added a live-payment safety lock; Stage 4 remains in Stripe test mode for alpha testing.
- Added three additive payment tables without changing existing client or project records.

## 0.5.0-alpha.3 — 2026-08-21

- Added verified-email password recovery with a dedicated secure reset screen.
- Added 12-character password requirements for new and recovered accounts.
- Replaced the duplicate Legacy OS bearer-token copy in local storage with an in-memory API token synchronized from the Supabase session.
- Added current Supabase claim verification alongside a fresh user lookup before accepting identity or MFA assurance.
- Added invitation-preserving email and Google/Apple callback URLs for client account linking.
- Added auditable owner creation, client creation, identity binding, and sign-in events with hashed network and device evidence.
- Added live owner identity-provider, verification, MFA-policy, and last-login visibility in Settings.
- Added lost-authenticator guidance that never permits self-service factor removal from an unverified screen.

## 0.4.0-alpha.2 — 2026-08-21

- Added client-submitted project intake with structured, evidence-backed extraction.
- Added an owner review queue with approve, request-details, and decline decisions.
- Added idempotent conversion from an approved request into a real project.
- Added flexible client display names, preferred names, and social handles.
- Added owner-side client workspaces and client request history.
- Added one visible version label across owner, client, and access footers.
- Added an additive migration that preserves and backfills existing alpha records.

## 0.3.0-alpha.1 — 2026-08-21

- Added client-safe project summaries and explicit file visibility boundaries.
- Added immutable design-version approval snapshots.
- Added idempotent project creation and safer content eligibility controls.
- Added alpha data migration and regression coverage.
