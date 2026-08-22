# Stage 14 foundation closure

Stage 14 closes the Alpha foundation before the complete tattoo vertical slice is extended. It is additive and does not modify existing workspace records.

## Identity readiness

- A temporary owner access deployment requires `OWNER_ACCESS_CODE_HASH` to be exactly one lowercase or uppercase SHA-256 hexadecimal digest. Legacy normalizes the configured digest to lowercase before validating it.
- A Supabase deployment requires `SUPABASE_URL` and one public key together. Owner access is not ready until `OWNER_EMAILS` contains every approved owner account.
- A private preview accepts local development or an explicitly allowlisted platform identity. An arbitrary external platform identity is never promoted to owner.
- Authentication configuration, code-session status, login, and logout responses are private and non-cacheable.

The health endpoint reports configuration problems as descriptions only. It never returns access codes, hashes, bearer tokens, provider secrets, or client information.

## Deployment gate

Before Stage 14 is published:

1. Generate the access-code hash from the exact normalized code and set it as the protected hosting value.
2. Open a fresh private browser profile on a second device and sign in; an existing owner cookie is not proof that the configured code works.
3. Confirm an incorrect code returns 403 and repeated failures return 429.
4. Confirm sign-out removes access and a protected owner API returns 403.
5. If Supabase is enabled, complete the synthetic owner and invited-client tests in `docs/SUPABASE_ROLLOUT.md`.
6. Confirm `/api/health` has no `configurationIssues` before sharing the release.

## Data safety

No client, project, file, payment, approval, appointment, message, AI, audit, or learning table is rewritten by this stage. Existing alpha data remains in place.
