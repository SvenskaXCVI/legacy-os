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

The workspace starts without demonstration clients, projects, appointments, messages, approvals, or analytics. Owners create durable records through the product, and the secure client portal reads and writes the same D1-backed source of truth.

## Operational flows

- Create clients and tattoo projects.
- Schedule project-linked appointments.
- Exchange owner/client messages through one shared conversation history.
- Generate revocable, expiring client portal access.
- Upload and retrieve project media through R2.
- Request and record client approvals.
- Generate a deterministic daily briefing from live workspace state.
- Capture workflow observations and learn from each completed project.
- Discover cross-project patterns using explicit evidence thresholds.
- Generate recommendations with confidence, risk, autonomy, and outcome plans.
- Grant or revoke client-controlled Instagram observation permissions.
- Create verified owner/client accounts with TOTP MFA when Supabase is configured.
- Inspect AI runs and owner/client/system actions in the observability ledger.

The deployed Sites project remains private. Client portal links are fully functional for authenticated viewers; opening portal access to external clients requires a deliberate hosting access-policy change.

## Backend foundation

- Cloudflare Worker application runtime
- D1 relational schema with 27 implemented tables
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
- [Intelligence and autonomy](docs/INTELLIGENCE_AND_AUTONOMY.md)
- [Identity and access](docs/IDENTITY_AND_ACCESS.md)

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

This release provides the product, persistence, policy, identity adapter, consent, and observability foundations. It never silently connects email, calendar, social, payment, or AI-provider accounts. Each integration requires explicit provider configuration and remains behind the approval and audit contracts.
