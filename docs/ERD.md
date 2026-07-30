# Legacy OS Entity Relationship Diagram

This diagram represents the implemented foundation schema. Additional tattoo-session, healing, payment, and content-publication tables should be introduced as their workflow specifications enter implementation.

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
```
