# Identity and Access

## Roles

Roles are assigned by the server and are never trusted from a signup form.

- `owner`: may access the studio and operations workspace only after the verified email is present in `OWNER_EMAILS`.
- `client`: may access exactly one client record after presenting an active studio invitation whose email matches the verified account email.

Every owner endpoint verifies the owner role. Client portal queries are scoped by the resolved `client_id`, including projects, messages, approvals, files, appointments, and consent.

## Authentication

When Supabase is configured, Legacy OS supports:

- email/password account creation and sign-in;
- required email verification;
- TOTP enrollment and challenge;
- Google and Apple OAuth;
- AAL2 enforcement for protected owner and client operations.

Instagram is intentionally excluded as an identity provider. It is connected separately through explicit project-data consent.

When Supabase credentials are absent, the hosted site remains behind its private Sites access boundary and the UI enters a clearly labeled private-preview mode. No simulated provider login is presented as real.

## Invitation binding

Client signup requires an unexpired portal invitation. After the verified email matches the invited client record, the invitation is redeemed and the identity is permanently bound to that client. A client cannot request or choose an owner role.

## Required environment variables

See `.env.example`. Provider secrets are runtime values and must never be committed.

