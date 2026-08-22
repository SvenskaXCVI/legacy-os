# Tool + Authority Registry

Stage 23 gives every AI-callable Legacy OS capability a durable, inspectable operating contract. The model does not decide what it is allowed to do. Legacy OS owns and enforces that decision.

## Contract

Each registered tool declares:

- A stable key, display name, and description.
- JSON input and output schemas.
- A side-effect classification.
- One authority class: `AUTO`, `AUTO_WITH_LOG`, `ASK`, `OWNER_ONLY`, or `DENIED`.
- A bounded retry policy and explicit retryable failures.
- Audit behavior that stores a payload hash and redacted metadata rather than private content.
- An allowlist of specialist agents.
- A connector binding when an external adapter exists.

Unknown, disabled, and agent-ineligible tools are denied by default.

## Runtime enforcement

AI delegation resolves a task to a registered tool before the task is created. `AUTO` and `AUTO_WITH_LOG` tools may proceed within their internal scope. `ASK` tools create an exact owner approval and pause. `OWNER_ONLY` tools cannot be exercised by an agent. `DENIED` tools cannot execute.

Consequential connector execution evaluates the same registered policy again. An approval ID alone is insufficient: the approval must belong to the workspace, be approved, and match the registered tool used by the task. The resulting decision is linked to the task, approval, actor, correlation ID, policy version, and hashed input.

The owner can inspect the complete registry and recent decisions in AI Operations or through the owner-only `/api/tools` endpoint. The endpoint can also perform a recorded dry-run policy evaluation; it never executes the selected tool.

## Default boundaries

- Read-only retrieval and factual calculations are automatic.
- Reversible internal analysis, drafts, classification, and organization are automatic with a log.
- Client messages, appointment changes, content publishing, pricing changes, refunds, and destructive operations require approval.
- Final artistic approval and permission changes remain owner-only.
- Direct AI-initiated payment charges are denied; clients continue through hosted Stripe Checkout.

## Data preservation

Migration `0017_bizarre_vermin.sql` only creates `tool_definitions` and `authority_decisions`, their indexes, and a defaulted `tool_key` field on existing agent tasks. It does not drop, delete, rewrite, or reclassify existing client, project, payment, media, approval, memory, task, or audit records.

## Current boundary

Stage 23 establishes the trusted tool and authority foundation. It does not claim that unavailable provider adapters can execute, does not allow policy self-modification, and does not yet introduce the model-driven Chief of Staff manager planned for the next stage. Workspace-specific policy personalization remains future controlled work.
