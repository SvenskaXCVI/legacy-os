# Durable Always On Runtime

Stage 21 gives “Always On” a concrete engineering meaning. Legacy OS can now accept queued work, claim it atomically, recover abandoned leases, run durable schedules, retry temporary failures, isolate terminal failures, and expose every worker outcome to the owner.

## Runtime behavior

- The maintenance schedule evaluates due workflow jobs and delayed playbook steps every 15 minutes when invoked by the deployment scheduler.
- The daily studio briefing schedule prepares a Chief of Staff playbook run once per day.
- Every worker invocation creates a heartbeat record with its trigger, processed schedules, job outcomes, recovered leases, playbook work, and final status.
- A job claim changes the job to `running`, records the worker lease owner, and sets a five-minute expiry.
- A second worker cannot process the same job after the first claim succeeds.
- An expired or legacy stale lock returns to the queue safely before new work is selected.
- Temporary failures use the existing bounded exponential backoff and maximum-attempt policy.
- Terminal failures move to `dead_letter` and create a redacted dead-letter record.
- Only an authenticated owner can replay a dead-letter. Replay creates a new job and retains the original failure record.

## Authentication and deployment

`POST /api/worker` accepts either an authenticated owner session or a bearer value matching `AUTOMATION_WORKER_SECRET`. The secret is compared as a digest and is never returned to the interface or stored in D1.

The code is ready for an external Cloudflare scheduled trigger to call this endpoint. Until that hosted scheduler and secret are configured, owner-triggered runs and normal workspace wake-ups continue to function, but the product must not claim unattended 24/7 execution.

## Owner controls

Settings → Automations now shows:

- durable schedules and their next run;
- the most recent worker heartbeat;
- jobs processed, failures, recovered leases, and playbook steps;
- the live queue;
- open and replayed dead-letter records;
- an owner-only safe replay action.

## Data preservation

Migration `0015_goofy_skaar.sql` creates schedule, worker-run, and dead-letter tables. It adds only nullable queue metadata fields and new indexes. It contains no drops, deletes, table rewrites, or modifications to existing alpha rows.

## Boundary retained

Always On increases availability, not authority. Worker execution cannot bypass Legacy OS approval policy, connector availability, consent, role isolation, payment settlement verification, or the audit ledger.
