# Legacy OS Intelligence and Autonomy

Legacy OS owns the knowledge, memory, workflow state, reasoning policy, evidence, and outcome history. External models are optional adapters; changing a model does not move or erase the operating system’s memory.

## Continuous loop

1. A workflow mutation creates an immutable observation with source, project, client, time, quality, and consent provenance.
2. Completing a project captures the completion, style, workflow, approval, and outcome signals and immediately runs a learning cycle.
3. The cycle connects observations across completed projects and clients.
4. Candidate patterns are scored and either retained as emerging evidence or promoted.
5. A promoted pattern creates a versioned knowledge item and an evidence-backed recommendation.
6. Every acted recommendation creates an outcome window with a baseline, target, result, and measurement status.
7. Later outcomes update the evidence used by future cycles. Prior pattern versions remain available through `supersedes` edges.

## Meaningful pattern threshold

A pattern is promoted only when all conditions are met:

- at least 3 supporting observations;
- at least 3 completed projects;
- at least 2 distinct clients;
- at least a 10% observed effect or recurrence rate; and
- at least 65% confidence.

Below-threshold signals remain candidates and cannot be presented as established findings.

## Confidence

Confidence is a transparent weighted score:

- evidence quality: 25%;
- sample strength: 25%;
- cross-project and cross-client replication: 20%;
- effect strength: 20%;
- recency: 10%;
- contradiction and bias penalties are subtracted.

The interface shows confidence as evidence strength, not certainty and not proof of causation.

## Prioritization

The Chief of Staff ranks:

1. approval-blocked work;
2. time-bound appointments and commitments;
3. high-risk or overdue work;
4. active projects missing a next action;
5. supported opportunities with measurable upside.

Each recommendation must include the source evidence, why it matters, confidence, risk, reversibility, proposed action, and measurement plan.

## Approval boundary

Low-risk, internal, reversible actions may run automatically at 78% confidence or higher. Examples include classification, linking, deduplication, internal summaries, and creating a draft workflow template.

The following always require approval regardless of confidence:

- client messages;
- appointment creation or changes;
- publishing;
- payments or other financial actions;
- connecting social accounts or changing permissions;
- destructive or irreversible changes;
- health or legal guidance.

Human override is final and is written to the audit trail.

## Social evidence

Instagram is a revocable client-authorized data connection, not a Legacy OS login provider. The client grants named scopes and can revoke them at any time. Tokens are encrypted, raw captions are not retained by default, and synchronization stops when consent is revoked. The current connection is limited to professional Business or Creator accounts supported by Meta’s Instagram Login API.

The social observer runs an initial read-only synchronization after connection, refreshes before a daily briefing, and can be refreshed from the Intelligence workspace. It stores permitted media type, time, aggregate engagement, a hashed permalink, and a conservative project-match score. A caption is used transiently for matching and discarded; the database records only matched terms and whether the confidence threshold was crossed. New observations trigger a learning cycle.
