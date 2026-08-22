# Legacy OS release history

## 0.6.0-alpha.4 — 2026-08-21

- Added owner-created, owner-approved deposits, invoices, balances, and other payment requests.
- Added client-scoped Stripe-hosted Checkout without exposing payment credentials to Legacy OS.
- Added signed, idempotent Stripe webhook processing as the authoritative payment ledger.
- Added partial/full refund controls, audited financial actions, and payment outcome learning signals.
- Added owner Finance Center metrics and client payment/receipt history.
- Added a live-payment safety lock; Stage 4 remains in Stripe test mode for alpha testing.
- Added three additive payment tables without changing existing client or project records.

## 0.5.0-alpha.3 — 2026-08-21

- Added verified-email password recovery with a dedicated secure reset screen.
- Added 12-character password requirements for new and recovered accounts.
- Replaced the duplicate Legacy OS bearer-token copy in local storage with an in-memory API token synchronized from the Supabase session.
- Added current Supabase claim verification alongside a fresh user lookup before accepting identity or MFA assurance.
- Added invitation-preserving email and Google/Apple callback URLs for client account linking.
- Added auditable owner creation, client creation, identity binding, and sign-in events with hashed network and device evidence.
- Added live owner identity-provider, verification, MFA-policy, and last-login visibility in Settings.
- Added lost-authenticator guidance that never permits self-service factor removal from an unverified screen.

## 0.4.0-alpha.2 — 2026-08-21

- Added client-submitted project intake with structured, evidence-backed extraction.
- Added an owner review queue with approve, request-details, and decline decisions.
- Added idempotent conversion from an approved request into a real project.
- Added flexible client display names, preferred names, and social handles.
- Added owner-side client workspaces and client request history.
- Added one visible version label across owner, client, and access footers.
- Added an additive migration that preserves and backfills existing alpha records.

## 0.3.0-alpha.1 — 2026-08-21

- Added client-safe project summaries and explicit file visibility boundaries.
- Added immutable design-version approval snapshots.
- Added idempotent project creation and safer content eligibility controls.
- Added alpha data migration and regression coverage.
