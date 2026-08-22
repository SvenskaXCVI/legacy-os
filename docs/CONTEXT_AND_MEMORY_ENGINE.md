# Stage 17 — Context and Memory Engine

Stage 17 turns eligible events from Universal Capture into durable, scoped memory that Legacy OS can safely use when reasoning.

## Event versus memory

Capture records say that something happened. Memory records retain only information worth using later: explicit owner notes, durable decisions, completed outcomes, healing outcomes, settled payments, meaningful preferences, and consented social outcomes.

Transient activity stays in the capture and audit ledgers. It is evaluated once and marked `not_memory` when it does not meet the memory policy.

## Scope isolation

Every memory has one scope key:

- `workspace` for studio-wide operating knowledge.
- `client:<id>` for relationship-specific preferences and decisions.
- `project:<id>` for a particular tattoo project.

A project context packet may include its project memory, its client memory when explicitly requested, and workspace memory. It cannot retrieve another client or project by accident because retrieval uses exact scope keys.

## Provenance and confidence

Each memory records its source capture IDs, content hash, confidence score, sensitivity, verification state, creator, version, valid dates, and last reinforcement date. Metadata-only captures never become a hidden copy of raw client messages or uploaded files.

Explicit owner notes begin as `owner_asserted`. Joshua can verify them or any derived memory. Owner-verified memory receives priority in future context packets.

## Reinforcement, supersession, and revocation

- Repeated identical evidence reinforces the active memory and increases confidence within a bounded limit.
- Changed evidence creates a new version and supersedes the previous version; history is retained.
- Revoked memory receives a validity end date and is excluded from every future context packet.
- Memory is never silently deleted or rewritten.

## Context budget

Context packets are bounded by both item count and character count. Records are ranked by exact project scope, client scope, workspace scope, owner verification, confidence, and recency. The packet reports which memory IDs were included and how many eligible records were omitted by the budget.

## Chief of Staff integration

Before a daily briefing, Legacy OS consolidates eligible capture records and builds a bounded owner-authorized context packet across active projects and clients. The AI run ledger records the context-policy version and exact memory IDs used. The interface shows memory highlights and included, available, and omitted counts.

## Human control and safety

Memory may inform internal reasoning but does not authorize external action. Client messages, scheduling changes, charges, refunds, publishing, permission changes, destructive actions, and health-sensitive decisions remain governed by existing approval rules.

## Migration safety

Stage 17 creates `memory_records` and supporting indexes through one additive migration. It contains no drops, deletes, destructive updates, or rewrites of existing alpha data.
