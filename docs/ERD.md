# Legacy OS Entity Relationship Diagram

This diagram represents the implemented foundation schema. Additional tattoo-session, healing, and content-publication tables should be introduced as their workflow specifications enter implementation.

```mermaid
erDiagram
    WORKSPACES ||--o{ USERS : contains
    WORKSPACES ||--o{ CLIENTS : owns
    WORKSPACES ||--o{ PROJECTS : owns
    CLIENTS ||--o{ PROJECTS : commissions
    PROJECTS ||--o{ ASSETS : contains
    CLIENTS ||--o{ ASSETS : supplies
    PROJECTS ||--o{ KNOWLEDGE_ITEMS : produces
    ASSETS ||--o{ KNOWLEDGE_ITEMS : extracted_into
    KNOWLEDGE_ITEMS ||--o{ KNOWLEDGE_EDGES : source
    KNOWLEDGE_ITEMS ||--o{ KNOWLEDGE_EDGES : target
    PROJECTS ||--o{ APPROVALS : gates
    PROJECTS ||--o{ AI_RUNS : contextualizes
    AI_RUNS ||--o{ AI_EVENTS : emits
    AI_RUNS ||--o{ TOOL_CALLS : invokes
    APPROVALS ||--o{ TOOL_CALLS : authorizes
    AI_RUNS ||--o{ USAGE_EVENTS : consumes
    WORKSPACES ||--o{ AUDIT_EVENTS : records
    PROJECTS ||--o{ NOTIFICATIONS : triggers
    USERS ||--o{ NOTIFICATIONS : receives
    CLIENTS ||--o{ PORTAL_INVITATIONS : receives
    CLIENTS ||--o{ APPOINTMENTS : attends
    PROJECTS ||--o{ APPOINTMENTS : schedules
    CLIENTS ||--o{ CLIENT_MESSAGES : exchanges
    PROJECTS ||--o{ CLIENT_MESSAGES : contextualizes
    PROJECTS ||--o{ PROJECT_UPDATES : publishes
    CLIENTS ||--o{ PAYMENT_CUSTOMERS : links
    CLIENTS ||--o{ PAYMENT_REQUESTS : receives
    PROJECTS ||--o{ PAYMENT_REQUESTS : bills
    PAYMENT_REQUESTS ||--o{ PAYMENT_EVENTS : verified_by

    WORKSPACES {
      text id PK
      text name
      text domain_type
      text timezone
      text ai_content_capture
      integer retention_days
    }

    PROJECTS {
      text id PK
      text workspace_id FK
      text client_id FK
      text lifecycle_phase
      text status
      text next_action
      text next_action_at
    }

    APPROVALS {
      text id PK
      text project_id FK
      text action_type
      text payload_hash
      text risk_level
      text reversibility
      integer confidence_bps
      text status
    }

    AI_RUNS {
      text id PK
      text correlation_id
      text agent_name
      text purpose
      text provider
      text model
      text prompt_version
      text context_policy_version
      text approval_policy_version
      text status
      integer latency_ms
    }

    TOOL_CALLS {
      text id PK
      text run_id FK
      text approval_id FK
      text tool_name
      text operation
      integer external_side_effect
      text status
      integer latency_ms
    }

    USAGE_EVENTS {
      text id PK
      text run_id FK
      integer input_tokens
      integer output_tokens
      integer reasoning_tokens
      integer estimated_cost_micros
    }

    AUDIT_EVENTS {
      text id PK
      text actor_type
      text actor_id
      text action
      text target_type
      text target_id
      text outcome
      text correlation_id
    }

    PAYMENT_REQUESTS {
      text id PK
      text workspace_id FK
      text project_id FK
      text client_id FK
      text kind
      integer amount_cents
      integer amount_paid_cents
      integer amount_refunded_cents
      text status
      text stripe_checkout_session_id
      text stripe_payment_intent_id
    }

    PAYMENT_EVENTS {
      text id PK
      text payment_request_id FK
      text external_event_id
      text event_type
      text payload_digest
      text status
    }
```
