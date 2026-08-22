# Production External Connectors

Stage 26 completes Phase 10's first six integration priorities: Gmail, Google Calendar, Stripe, storage/files, the optional model runtime, and Instagram/Meta observation. Gmail and Google Calendar are newly connected through production OAuth; the other four retain their existing real adapters and are surfaced through the same health and execution ledgers.

## Google connection model

Gmail and Google Calendar are authorized separately so Legacy OS requests only the scope required for the action the owner enables:

- Gmail: `openid`, `email`, and `gmail.send`;
- Google Calendar: `openid`, `email`, and `calendar.events`.

OAuth requests use offline access because scheduled work may run without the owner present. Each authorization request has a random nonce, a ten-minute expiry, an HMAC signature, and a single-use database record. The callback exchanges the code only after all four checks pass.

Access and refresh tokens are encrypted server-side with AES-256-GCM. The workspace API returns only the connected account email, scopes, health, and timestamps. It never returns encrypted credentials, access tokens, refresh tokens, client secrets, state secrets, or OAuth codes. Disconnect attempts provider revocation and then removes the locally usable credential even if Google is unavailable.

## External action boundaries

Gmail sends the exact subject and body that received owner approval. The connector verifies the client, email, and optional project relationship before delivery. Connector and capture ledgers retain character counts and provider IDs—not the message body.

Google Calendar mirrors an appointment only after the existing owner approval, client/project checks, and local conflict test. A deterministic base32hex-compatible event ID prevents duplicate Google events if a network response is lost. If Calendar is not connected, the approved appointment remains available in Legacy OS without pretending an external mirror occurred.

Stripe remains client-initiated through hosted Checkout Sessions. Dynamic payment methods are left to Stripe, restricted keys are preferred, signed webhooks are authoritative for settlement, and live credentials remain locked until `STRIPE_LIVE_PAYMENTS_ENABLED=true` is deliberately configured. Card data never passes through Legacy OS.

Instagram remains observation-only and consent-bound. Storage remains private R2-backed file access. The optional model runtime can interpret bounded facts but never owns the connector credentials, state, or authority policy.

## Required Google configuration

Create a Google Cloud OAuth web client, enable Gmail API and Google Calendar API, and configure the exact HTTPS callback ending in `/api/connectors/google/callback`. Set the server-only variables documented in `.env.example`. The token-encryption key must decode to exactly 32 bytes. Use separate Google Cloud projects for testing and production, configure an accurate consent screen and public privacy/home pages, request only the declared scopes, and complete Google verification before broad public release.

## Supabase compatibility

This release continues using Supabase only for verified identity. Authorization comes from server-verified user claims and app metadata, never user-editable metadata. The application already requires Node 22, matching current Supabase client support. The new connector tables live in the Sites D1 database and are not exposed through Supabase Data API, so the 2026 Data API grant change does not expose them.

## Honest boundary

Contacts, additional social networks, and research/search providers remain later connector work. Gmail does not ingest mailbox content in this stage, Google Calendar does not rewrite existing events, Instagram cannot publish, and the AI cannot send email or create an appointment without an exact owner approval. Configuration is not the same as connection, and a degraded connector is reported rather than silently replaced with fabricated success.

Migration `0020_violet_sleeper.sql` only creates `connector_accounts`, `connector_oauth_states`, and their indexes. It does not change existing alpha records.
