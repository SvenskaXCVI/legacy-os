# Deployment and sharing

## GitHub

Create an empty private repository, then add it as the `origin` remote and push
the `main` branch. GitHub Actions validates lint, TypeScript, the production
build, and the interaction test suite on every pull request.

```bash
git remote add origin git@github.com:YOUR-ACCOUNT/legacy-os.git
git push -u origin main
```

GitHub is the source repository; it is not the application runtime. Legacy OS
uses a Cloudflare Worker, D1, and R2 through OpenAI Sites.

## Runtime configuration

Configure the values documented in `.env.example` as hosting secrets. For an
externally shared alpha, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`OWNER_EMAILS` are required. Enable verified email, TOTP MFA, and only the OAuth
providers that have complete redirect configuration.

AI and Instagram credentials are optional integrations. Without an external AI
provider, deterministic Legacy OS policy, evidence, briefing, workflow, and
learning engines continue to operate. Instagram remains unavailable until all
four Instagram/encryption variables are configured.

## Access policy

Keep the deployment private during owner setup. Before changing it to a shared
or public access policy:

1. Confirm `/api/health` reports external client accounts ready.
2. Sign in as the allowlisted owner and complete TOTP.
3. Create a real test client and invitation.
4. Verify the client can see only that client record.
5. Revoke the invitation and confirm it immediately stops working.
6. Complete the alpha checklist in `docs/ALPHA_TESTING.md`.

Client links use `?portal=TOKEN`. Treat them as credentials: deliver them over a
trusted channel, use the shortest practical expiration, and revoke them when a
verified client account is bound.

## Installation

Legacy OS is a progressive web app. In a supported desktop browser choose
Install app; on iPhone or iPad choose Share, then Add to Home Screen. The owner
can also use the Install Legacy OS button in Settings. Sensitive pages and API
responses are deliberately excluded from offline caching.
