# Real Chief of Staff Manager

Stage 24 turns the Chief of Staff from a dashboard concept into an observable manager runtime. It works from Legacy OS records, delegates bounded work to the specialist roster, and preserves the owner authority rules established by the tool registry.

## Operating loop

1. Read active, non-test workspace state and validate any selected project and client scope.
2. Consolidate captures and retrieve only authorized, scoped memory metadata.
3. Rank concrete facts such as pending approvals, unread messages, upcoming appointments, healing attention, payment attention, and projects missing a next action.
4. Produce up to five evidence-backed steps using the optional structured model adapter or the deterministic planner.
5. Validate every proposed tool and entity ID against Legacy OS registries before delegation.
6. Route work to the appropriate specialist and pause at any `ASK`, `OWNER ONLY`, or denied boundary.
7. Resume only after the exact approval state changes, then report whether the action is complete or waiting at a connector boundary.
8. Record the manager run, specialist steps, parent-child AI runs, tool calls, usage, evidence, outcomes, and audit events.

## Model ownership and privacy

Legacy OS remains model-agnostic and owns memory, workflow state, evidence, tool definitions, and authority decisions. When a compatible provider is configured, the planner requests strict structured output. If it is absent or fails, the deterministic planner remains operational.

The planning context contains operational counts, authorized entity IDs, and scoped memory titles and confidence—not raw client-message bodies. Provider responses never execute directly. Legacy OS validates the returned plan and routes each step through the same tool and authority engine used elsewhere in the application.

## Owner controls

The Chief workspace supports an optional project/client scope and four deliberate modes:

- run a safe internal operating plan;
- prepare an internal response draft;
- request approval for an exact client message;
- request approval for an exact appointment.

Every run shows its provider/fallback, confidence, summary, next action, specialist assignment, tool, evidence count, and authority status. Held runs can be rechecked after an approval decision.

## Honest alpha boundary

Stage 24 does not pretend that every third-party connector exists. An approved external action becomes ready for its connector and stays visible if that connector is unavailable. The model cannot send messages, schedule appointments, publish content, move money, change permissions, delete records, or expand its own authority. No raw prompts or client content are retained by default, and model-provider persistence is disabled where the provider contract supports it.
