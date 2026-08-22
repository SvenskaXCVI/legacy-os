# Stage 9 — Connected Client Actions

Stage 9 closes the owner-to-client communication and approval loop identified during founder alpha testing. It changes behavior only and requires no database migration, so existing clients, messages, approvals, notifications, and alpha history remain unchanged.

## Secure message round trip

- A portal message appears in the owner Inbox and Chief of Staff as unread client communication.
- Opening the exact client conversation records the inbound messages as read, removes the associated attention item, and preserves the messages themselves.
- Sending an owner reply also records earlier inbound messages as read because the owner has acted on the thread.
- Opening Messages in the client portal records studio messages as read.
- Owner and client conversation views show the corresponding read receipt without exposing private workspace data.
- Message state changes are client- and workspace-scoped and create metadata-only audit entries.

## Approval and revision round trip

- Client decisions remain limited to client-audience approvals belonging to that client's project.
- Only a pending approval can receive a first decision. Repeating the same request is idempotent; attempting to replace a final decision is rejected.
- Revision requests require a written explanation. The exact text is visible in both the client approval history and owner Design Studio.
- Resolving an approval dismisses the pending and overdue attention records while keeping the approval and audit history.
- A revised artifact remains a new immutable design version and must receive its own approval request.

## Actionable notifications and search

Notifications now reopen when genuinely new activity occurs instead of being permanently suppressed by an old deduplication record. Client-message alerts open the exact client conversation, approval alerts open the correct project in Design Studio, and project/client search results open the matching record rather than only the surrounding module.

The interface still derives fallback attention from live messages and approvals if an automation notification has not yet materialized. Persistent and derived entries are collapsed so one underlying issue does not appear twice.

## Approval boundary

No automatic client reply, scheduling change, payment, publication, or destructive action was added. Stage 9 connects state and navigation; it does not widen AI authority.
