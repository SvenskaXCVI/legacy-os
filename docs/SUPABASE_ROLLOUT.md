# Supabase account rollout

Supabase Auth verifies identity while the protected `workspace_memberships` registry controls Legacy OS roles. Legacy OS remains authoritative for client binding, permissions, workflows, business records, AI memory, and operational audit history.

## 1. Legacy OS runtime values

Configure these only in the hosting environment:

- `SUPABASE_URL`: the project URL from Supabase Connect.
- `SUPABASE_PUBLISHABLE_KEY`: the public `sb_publishable_...` key. A legacy anon key is supported only as a fallback.
- `OWNER_EMAILS`: temporary recovery/bootstrap compatibility only. Normal owner access comes from Supabase memberships.

Never add a Supabase secret key or `service_role` key to this application. Owner invitations use narrowly scoped Postgres functions and RLS under the signed-in user's token.

## 2. Workspace role registry

Apply `supabase/migrations/20260827010000_workspace_memberships.sql`, then add the first owner email to the private bootstrap allowlist through a trusted Supabase administration session. Do not place that email in the committed migration.

The first owner must create and verify a Supabase account using that exact email. The claim function binds the verified Supabase user ID to the membership. From then on, owners are invited, suspended, restored, or revoked in Legacy OS under Settings → Team.

The bootstrap allowlist is one-time only. It cannot be used again after its row is claimed. The shared access code remains a temporary recovery path during the transition and should be rotated or removed after two Supabase owners have successfully tested access.

## 3. URL configuration

In Supabase Authentication → URL Configuration:

1. Set the Site URL to the final Legacy OS production origin.
2. Add that exact origin and its query variants to Redirect URLs.
3. Add the isolated preview origin only during synthetic testing, then remove it.
4. Keep all redirects HTTPS outside local development.

Legacy OS preserves a client's active invitation through email verification and Google/Apple callbacks. Password recovery returns to `/?auth=recovery` on an approved origin.

## 4. Email and password

In Authentication → Providers → Email:

- Enable email/password sign-in.
- Require email confirmation.
- Disable anonymous sign-ins.
- Set the minimum password length to at least 12 characters.
- Enable leaked-password protection when available for the project plan.
- Configure a production SMTP provider before inviting real clients; the default test mail service is not a production delivery system.
- Brand and test confirmation and recovery templates. Do not place project details or private client data in authentication emails.

## 5. Google and Apple

Enable a provider only after its client ID, secret, consent screen, domains, and Supabase callback URL are complete. Test each provider with:

- an active or pending Supabase owner membership;
- an invited client whose verified provider email exactly matches the client record;
- an account without a membership, which must be denied owner access;
- an uninvited client, which must be denied client account creation.

Instagram remains a consented project-data connection inside the client portal, not a sign-in provider.

## 6. Multi-factor authentication

- Enable TOTP enrollment, challenge, and verification.
- Legacy OS requires AAL2 for owner and verified client operations.
- A lost authenticator must be reset only after an administrator verifies the person's identity. The login screen cannot remove factors.
- After an administrative reset, require immediate TOTP re-enrollment at the next sign-in.

## 7. Security validation

Run all tests with synthetic identities before production:

1. Confirm unverified email cannot bootstrap a Legacy OS account.
2. Confirm a valid Supabase identity with AAL1 cannot open protected APIs when MFA is required.
3. Confirm AAL2 succeeds.
4. Confirm an owner role is created only from a private bootstrap entry or an existing AAL2 owner's invitation.
5. Confirm a client account is permanently scoped to the invited client record.
6. Confirm invitation expiration, revocation, and redemption stop future token use.
7. Confirm password recovery requires the emailed recovery session and then MFA.
8. Confirm sign-out clears the in-memory API credential and the Supabase session.
9. Review the Legacy OS audit ledger for account creation, identity binding, sign-in, and denied access events.

10. Confirm a client cannot read, create, update, or revoke a workspace membership.
11. Confirm the final active owner cannot revoke or suspend their own access.

## 8. Rollback

If account testing fails, remove the Supabase runtime values from the staged environment. Legacy OS returns to its temporary owner-code and invitation-link mode without deleting D1 records. Do not change the live environment or migrate real users until the staged test checklist passes.
