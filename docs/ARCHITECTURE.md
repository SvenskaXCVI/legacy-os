# Legacy OS Architecture

Status: Foundation v0.2  
Scope: single-owner Legacy Lines workspace, designed to evolve into a multi-artist platform.

## Product boundary

Legacy OS is a continuous intelligence system around creative work. Projects are the operational spine; the knowledge graph is the memory; the Chief of Staff is the prioritization interface; approval policies keep the human responsible.

The current release is an executable foundation, not a claim that external providers are connected. The interface uses seeded demonstration data while the persistent data model, migration, audit routes, and storage bindings are real.

## Runtime shape

```text
Authenticated workspace user
        |
        v
React / Vinext application
        |
        +--> Domain routes and approval decisions
        |
        +--> AI observability ingestion
        |
        v
Cloudflare Worker
        |
        +--> D1 relational records and append-only telemetry
        |
        +--> R2 media objects (binding reserved as MEDIA)
```

The application uses platform-provided authenticated-user headers. It does not implement a second password database. Production access is intended to remain owner-only until workspace membership and multi-user authorization are implemented.

## Core design rules

1. Every important record belongs to a workspace and, when relevant, a project.
2. AI recommendations carry evidence, confidence, policy versions, and a risk level.
3. An irreversible or externally visible action requires an approval record.
4. Tool calls are observable independently from model output.
5. Audit events are append-only. Corrections create new events.
6. Prompt and client content is not captured by default; metadata is.
7. Files live in object storage. Searchable metadata and relationships live in the database.
8. A completed project produces knowledge, not only an archive.

## Implemented bounded contexts

- Workspace and identity
- Clients and projects
- Media asset metadata
- Structured knowledge and graph edges
- Approval requests and decisions
- AI runs and step events
- Tool calls
- Usage and cost events
- Audit events
- Notifications

## Evolution path

The edge foundation is intentionally provider-agnostic. At larger scale, the same contracts can place PostgreSQL behind the repositories, add a dedicated Python/FastAPI AI orchestration service, and use a vector/graph search service without rewriting the product surfaces or event envelope.

## Security baseline

- Owner-only production deployment
- Server-side attribution from trusted workspace headers
- Metadata-only AI capture by default
- SHA-256 fields for media and request integrity
- Approval payload hashes prevent silent mutation after review
- External-side-effect flag on every tool call
- Retention policy stored per workspace
- Soft deletion for user-facing records; append-only preservation for audit records
