# Legacy OS

## [Open Legacy OS →](https://legacy-os-studio.svenskaxcvi.chatgpt.site/)

The application runs on its secure, backend-enabled deployment. This GitHub
repository contains the source code, technical documentation, and release
history; use the link above to launch the product.

Legacy OS is a secure, evidence-led operating system for tattoo studios and
creative professionals. It connects owner operations, a client portal,
project workflows, durable knowledge, and observable AI automation in one
source of truth.

The workspace starts clean: no demonstration clients, projects, messages,
appointments, approvals, analytics, or financial records are inserted.

## What works

- Separate owner and client experiences with server-enforced authorization.
- Email verification, TOTP MFA, and Google/Apple OAuth through optional
  Supabase configuration.
- Expiring, revocable, hashed client access links and invitation-bound client
  account creation.
- Client, project, appointment, message, approval, and private R2 file flows.
- Authenticated owner/client image previews, tattoo-specific asset controls,
  design lineage, and immutable version-bound design approvals.
- Owner-approved Stripe deposits and invoices, client-hosted Checkout, signed
  webhook settlement, refunds, receipts, and an auditable payment ledger.
- Project lifecycle from consult through design, approval, session, healing,
  and completion.
- A daily Chief of Staff briefing built from live workspace state.
- Continuous event capture, workflow notifications, queued learning cycles,
  cross-project pattern discovery, evidence-backed recommendations, confidence
  scoring, outcomes, and an owner-controlled automation switch.
- AI Operations records runs, tool calls, usage, confidence, latency, held
  actions, and audit events. Legacy OS owns memory, workflow, evidence, and
  policy while model providers remain replaceable.
- Client-controlled Instagram observation consent and an optional professional
  account connection. Raw captions are not retained by default.
- Progressive web app installation without offline-caching private pages or API
  responses.

## Automation boundary

Safe internal and reversible organization can run automatically. Client
messages, scheduling changes, publishing, payments, permission changes,
destructive operations, and health-sensitive decisions always require human
approval. Pausing automations stops job processing without deleting evidence or
the queue.

## Runtime

- OpenAI Sites / Cloudflare Worker application runtime
- D1 relational database
- R2 private media storage
- Drizzle migrations
- Optional Supabase Auth
- Optional OpenAI-compatible model adapter
- Optional vision-capable model for consent- and rights-bounded design analysis
- Optional Instagram professional-account adapter
- Optional Stripe Checkout and webhook adapter

## Local development

Use Node.js 22.13 or later.

```bash
npm ci
npm run dev
```

Run the full validation gate:

```bash
npm run check
```

For an existing local Sites D1 instance:

```bash
npm run db:local:migrate
```

## GitHub and deployment

The repository includes a least-privilege GitHub Actions workflow, a proprietary
license notice, security policy, contribution guide, environment template, and
alpha checklist. See [Deployment and sharing](docs/DEPLOYMENT.md) before making
the hosted application externally accessible.

The public alpha entry allows clients to reach invitation-scoped portal access
from any device. Owner operations remain protected by a server-verified access
code until Supabase account authentication is enabled. Provider secrets and the
owner code must be configured only in the hosting environment and never committed.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API contract](docs/API.md)
- [Entity relationship diagram](docs/ERD.md)
- [Identity and access](docs/IDENTITY_AND_ACCESS.md)
- [Supabase account rollout](docs/SUPABASE_ROLLOUT.md)
- [Stripe alpha rollout](docs/STRIPE_ROLLOUT.md)
- [Design media and analysis](docs/DESIGN_MEDIA.md)
- [Intelligence and autonomy](docs/INTELLIGENCE_AND_AUTONOMY.md)
- [Operations runbook](docs/OPERATIONS_RUNBOOK.md)
- [Deployment and sharing](docs/DEPLOYMENT.md)
- [Alpha testing checklist](docs/ALPHA_TESTING.md)

## Real-world boundary

The codebase is alpha-ready only after the validation suite passes. An external
alpha is operationally ready only after real identity, email, MFA, backup, and
provider settings are configured and the alpha checklist is completed with
synthetic users. Legacy OS never fabricates integration credentials or silently
connects email, calendar, social, payment, or model-provider accounts.
