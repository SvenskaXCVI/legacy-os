# Legacy OS Operations Runbook

## Service-level objectives

- Application availability: 99.9% after production hardening
- Successful AI orchestration runs: at least 98%
- Dashboard p95 response: under 1.5 seconds
- AI run p95 excluding external research: under 20 seconds
- Approval decision write: under 750 milliseconds
- Unauthorized external side effects: zero

## Alert conditions

Page immediately:

- Any external-side-effect tool call without an approved approval ID
- Audit writes failing for a high-risk action
- Authentication or authorization bypass signal
- Media integrity hash mismatch
- Backup restore test failure

Notify during working hours:

- AI success below 95% for 15 minutes
- p95 latency over 30 seconds
- Daily AI cost 150% above seven-day baseline
- Approval queue older than 24 hours
- Integration credential expiring within 14 days

## Incident response

1. Pause automations at workspace level.
2. Preserve the correlation ID, run, tool calls, approvals, and audit events.
3. Identify whether the failure is provider, policy, data, integration, or product logic.
4. Contain external effects. Revoke the affected credential if required.
5. Communicate the user-visible impact.
6. Restore from the last verified state if data integrity changed.
7. Add a regression test and knowledge entry before resuming.

## Backup and recovery

- D1 database: daily automated backup plus pre-migration snapshot.
- R2 media: object versioning or immutable keys; database stores hash and version.
- Restore drill: quarterly during the foundation stage, monthly before commercial launch.
- Recovery targets: RPO 24 hours initially, RTO 4 hours; tighten before multi-shop launch.

## Privacy operations

- Default AI capture mode: metadata only.
- Redacted summaries require a workspace policy change.
- Full-content capture requires explicit owner activation and a documented retention purpose.
- A deletion request removes mutable user content and media while retaining the minimum legally and operationally required audit record.
