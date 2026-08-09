# Contributing

1. Use Node.js 22.13 or later and run `npm ci`.
2. Create a focused branch and never add real client data or secrets.
3. Add or update tests for every changed interaction or authorization rule.
4. Run `npm run check` before opening a pull request.
5. Explain any database migration, approval-policy change, or new external side
   effect in the pull request description.

Database changes must be generated with `npm run db:generate`. Existing
migrations are immutable after deployment.
