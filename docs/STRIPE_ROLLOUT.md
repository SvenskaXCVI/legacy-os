# Stripe alpha rollout

Legacy OS uses Stripe-hosted Checkout for one-time tattoo deposits and invoices. Legacy OS never receives raw card details. A payment is considered paid only after a Stripe-signed webhook is verified and recorded in the D1 payment ledger.

## Alpha configuration

1. In Stripe test mode, create a restricted API key. Grant only the access needed to create/read Checkout Sessions and Customers and to create/read Refunds and PaymentIntents.
2. Set `STRIPE_RESTRICTED_KEY` to that test key. A standard test secret key is supported through `STRIPE_SECRET_KEY` only as a compatibility fallback.
3. Create a webhook endpoint at `https://YOUR_HOST/api/payments/webhook` and set its signing secret as `STRIPE_WEBHOOK_SECRET`.
4. Subscribe the endpoint to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `charge.refunded`
5. Keep `STRIPE_LIVE_PAYMENTS_ENABLED=false` throughout alpha testing.
6. Protect the Stripe Dashboard with MFA and limit Dashboard roles to people who need financial access.

## Operating model

- The owner creates a draft request in Finance Center and reviews the project, client, reason, and amount.
- Approving the draft makes it visible to that client. AI and automations cannot approve, charge, void, or refund.
- The client opens Stripe Checkout from the private client portal. Dynamic payment methods are controlled in Stripe.
- The return page is informational only. The signed webhook is the source of truth.
- Refunds require an explicit owner action. The ledger remains pending until Stripe confirms the refund event.
- Webhook payloads are not retained. Legacy OS stores the provider event ID, processing result, object linkage, and a SHA-256 digest for auditability.

## Go-live gate

Do not insert live credentials until test payments, cancellations, expired sessions, duplicate webhook delivery, partial refunds, full refunds, and failed webhook recovery have all passed. Enabling live mode requires both a live key and `STRIPE_LIVE_PAYMENTS_ENABLED=true`. Tax automation is intentionally disabled until the business confirms its registrations and tax requirements.
