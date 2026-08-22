# Supabase account rollout

This stage prepares Supabase Auth as Legacy OS's public identity provider while Legacy OS remains the authority for roles, client binding, permissions, workflows, and audit history. Do not deploy these settings to the live alpha until the complete staged release is approved.

## 1. Legacy OS runtime values

Configure these only in the hosting environment:

- `SUPABASE_URL`: the project URL from Supabase Connect.
- `SUPABASE_PUBLISHABLE_KEY`: the public `sb_publishable_...` key. A legacy anon key is supported only as a fallback.
- `OWNER_EMAILS`: comma-separated, lowercase owner emails. Only verified emails on this list can receive the owner role.

Never add a Supabase secret key or `service_role` key to this application. Legacy OS uses Supabase for identity verification, not privileged database access.

## 2. URL configuration

In Supabase Authentication → URL Configuration:

1. Set the Site URL to the final Legacy OS production origin.
2. Add that exact origin and its query variants to Redirect URLs.
3. Add the isolated preview origin only during synthetic testing, then remove it.
4. Keep all redirects HTTPS outside local development.

Legacy OS preserves a client's active invitation through email verification and Google/Apple callbacks. Password recovery returns to `/?auth=recovery` on an approved origin.

## 3. Email and password

In Authentication → Providers → Email:

- Enable email/password sign-in.
- Require email confirmation.
- Disable anonymous sign-ins.
- Set the minimum password length to at least 12 characters.
- Enable leaked-password protection when available for the project plan.
- Configure a production SMTP provider before inviting real clients; the default test mail service is not a production delivery system.
- Brand and test confirmation and recovery templates. Do not place project details or private client data in authentication emails.

## 4. Google and Apple

Enable a provider only after its client ID, secret, consent screen, domains, and Supabase callback URL are complete. Test each provider with:

- the allowlisted owner email;
- an invited client whose verified provider email exactly matches the client record;
- a non-allowlisted account, which must be denied owner access;
- an uninvited client, which must be denied client account creation.

Instagram remains a consented project-data connection inside the client portal, not a sign-in provider.

## 5. Multi-factor authentication

- Enable TOTP enrollment, challenge, and verification.
- Legacy OS requires AAL2 for owner and verified client operations.
- A lost authenticator must be reset only after an administrator verifies the person's identity. The login screen cannot remove factors.
- After an administrative reset, require immediate TOTP re-enrollment at the next sign-in.

## 6. Security validation

Run all tests with synthetic identities before production:

1. Confirm unverified email cannot bootstrap a Legacy OS account.
2. Confirm a valid Supabase identity with AAL1 cannot open protected APIs when MFA is required.
3. Confirm AAL2 succeeds.
4. Confirm an owner role is never created from a client invitation or signup choice.
5. Confirm a client account is permanently scoped to the invited client record.
6. Confirm invitation expiration, revocation, and redemption stop future token use.
7. Confirm password recovery requires the emailed recovery session and then MFA.
8. Confirm sign-out clears the in-memory API credential and the Supabase session.
9. Review the Legacy OS audit ledger for account creation, identity binding, sign-in, and denied access events.

## 7. Rollback

If account testing fails, remove the Supabase runtime values from the staged environment. Legacy OS returns to its temporary owner-code and invitation-link mode without deleting D1 records. Do not change the live environment or migrate real users until the staged test checklist passes.

