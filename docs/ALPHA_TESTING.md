# Alpha testing checklist

Use a dedicated test studio and synthetic client identities before entering
real personal, health, payment, or social-account data.

## Identity and isolation

- [ ] Owner email is present in `OWNER_EMAILS`.
- [ ] Owner email verification and TOTP are required.
- [ ] Client signup without an invitation is rejected.
- [ ] A client invitation cannot open another client's records or files.
- [ ] A revoked or expired invitation returns an access error.
- [ ] Sign out removes the local access token and returns to the login screen.

## Owner workflow

- [ ] Create a client, project, appointment, approval, message, and file.
- [ ] Advance a project through every lifecycle phase.
- [ ] Complete a project and confirm a learning cycle appears in AI Operations.
- [ ] Generate a daily briefing from live records.
- [ ] Run, pause, and resume automations in Settings.
- [ ] Review and clear generated notifications.

## Client workflow

- [ ] Open the invitation on a separate browser profile.
- [ ] Verify project, appointment, message, approval, update, and file scope.
- [ ] Send a message, submit an approval decision, and upload an allowed file.
- [ ] Grant, inspect, and revoke social observation consent without connecting a
  production social account.

## Recovery and operations

- [ ] Confirm the health screen reports the expected configured providers.
- [ ] Export or snapshot D1 before each migration.
- [ ] Verify R2 object recovery and D1 restore in a non-production environment.
- [ ] Review failed jobs, held actions, tool calls, usage, and audit events.
- [ ] Confirm no external action occurred without the required approval.
