# Legacy OS

Legacy OS is an evidence-led operating system for creative work. This foundation release translates the founder specifications into an interactive product shell and an observable backend.

## Included product surfaces

- Daily Chief of Staff briefing
- Human approval queue with decision feedback
- Project and client workspaces
- Knowledge search and relationship lens
- Design Studio
- Content workflow
- Calendar, inbox, and finance foundations
- Comparative analytics and opportunity discovery
- AI Operations ledger for runs, usage, cost, latency, confidence, approvals, and audit events
- Screen Library covering all 34 planned surfaces
- Settings and privacy controls

The user interface contains seeded demonstration data so every workflow can be evaluated before external accounts or sensitive client records are connected.

## Backend foundation

- Cloudflare Worker application runtime
- D1 relational schema with 14 implemented tables
- R2 media-storage binding reserved as `MEDIA`
- Generated database migration
- Health, telemetry, and approval endpoints
- Platform-authenticated user attribution
- Metadata-only AI content capture by default
- Append-only audit model

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API contract](docs/API.md)
- [Entity relationship diagram](docs/ERD.md)
- [Operations runbook](docs/OPERATIONS_RUNBOOK.md)

## Local development

Requirements: Node.js 22.13 or later.

```bash
npm install
npm run dev
```

Validation:

```bash
npm run build
npm run test
```

## Important boundary

This release provides the product, persistence, policy, and observability foundations. It does not silently connect email, calendar, social, payment, or AI-provider accounts. Each integration must be authorized and added behind the approval and audit contracts.
