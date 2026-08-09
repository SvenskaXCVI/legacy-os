# Security policy

Legacy OS contains private client, project, media, and business information. Do
not report vulnerabilities in public issues. Contact the repository owner
privately and include the affected route, impact, reproduction steps, and any
correlation ID shown in AI Operations.

## Supported release

Only the newest deployed release is supported during alpha testing.

## Security boundaries

- Never commit `.env` files, tokens, provider credentials, client exports, or
  downloaded media.
- Owner access requires either the private Sites identity boundary or a
  verified, allowlisted Supabase identity at AAL2.
- Client accounts require a verified email and an invitation bound to exactly
  one client record. Temporary portal links are random, hashed at rest,
  revocable, and expiring.
- Client messages, scheduling, publishing, payments, permission changes, and
  destructive actions are not eligible for automatic execution.
- Uploaded executable and active web-content formats are rejected. Media
  remains private and is served only after owner or client-scope authorization.

If unauthorized access is suspected, make the hosting project private, pause
automations, revoke affected invitations and provider credentials, and preserve
the audit trail for review.
