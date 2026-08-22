# Scheduling and Capacity Intelligence

Stage 28 turns calendar space into evidence-based, approval-gated appointment proposals. Legacy OS does not assume that an empty time range is usable time.

## Capacity inputs

The owner records explicit windows as tattoo, design, admin, or personal time. A window may be open, protected, or closed and carries an energy capacity and optional location. Protected family, design, administrative, recovery, and travel time is treated as a conflict, not an opportunity.

Each project can carry a session requirement: tattoo duration, preparation, travel, before/after buffers, energy demand, earliest and latest bounds, location, and a recorded minimum project value. Studio policy also limits tattoo minutes and high-energy sessions per day and defines the minimum bookable session.

## Readiness and fit

A project is ready for a scheduling recommendation only when it is active, not test or archived data, is in the session lifecycle phase, has a project requirement, has an exact approved asset version and hash, and has a deposit with positive net settled value. A refunded deposit does not qualify.

The deterministic evaluator subtracts existing appointments and protected time, applies preparation, travel, and buffers, checks energy and daily workload limits, and proposes at most one non-overlapping fit per open tattoo window. Every result retains project, client, window, conflict, readiness, policy, and financial-goal evidence.

The weekly revenue target is context for ranking otherwise ready work. Settled payments are measured separately from projected project value; a suggestion is never represented as collected revenue.

## Authority boundary

Every scheduling opportunity is created with `approvalRequired: true`. Requesting a booking routes the exact client, project, start, end, location, and appointment type through the existing tool-authority and owner-approval system. The evaluator itself never inserts an appointment, messages a client, or writes to Google Calendar.

After owner approval, the existing appointment and connector execution paths can create the Legacy OS appointment and mirror it to an authorized Google Calendar. Revalidation immediately before the approval request prevents a stale proposal from bypassing a newly created appointment conflict.

## Persistence

Stage 28 adds `scheduling_profiles`, `project_schedule_requirements`, `availability_windows`, `schedule_evaluation_runs`, and `schedule_opportunities`. Migration `0022_tense_the_professor.sql` is additive and does not update, delete, or replace existing alpha records.
