# Hosted Supabase deployment — 10 November 2026

Target project: `llhmnmmfhhlhlgghqyqh` (web forge).

Application origin: https://web-forge-94gs.vercel.app

## Completed

- Local `.env.local` now uses the matching hosted URL and publishable key in explicit live mode.
- `.env.vercel` contains only the three public application variables for Vercel import. It is ignored by Git and contains no database password, management token or provider secret.
- Inspected the remote history and confirmed there were no pre-existing app migrations or users before deployment.
- Applied migrations `20261110000001` through `20261110000005` without a database reset.
- Removed the unapplied blanket email-confirmation statement before deployment. Real users retain their actual verification state.
- Verified 15 application tables, `registered_uid()` and the private `job-audio` bucket with a 5 MB upload limit.
- Configured the supplied Gemini/Groq credentials as server-only Edge Function secrets and deployed `extract-voice` version 1. No provider keys were committed. The temporary deployment secret file was removed.
- Function status is ACTIVE with JWT verification enabled. Its handler additionally verifies the registered caller, ownership and rate limits.
- Configured the Site URL and callback/reset redirect allow list for the exact Vercel origin and localhost development callbacks.
- Email/password signup is enabled, anonymous and phone signup are disabled, confirmation remains enabled, and minimum password length is eight.
- Reviewed the post-deployment config diff: zero pending changes to declared properties. Unrelated hosted settings were preserved.

## Checks actually performed

- Auth configuration: HTTP 200, email enabled, phone disabled, automatic email confirmation disabled.
- Discovery: HTTP 200 with three clearly labelled demo worker records.
- Voice function OPTIONS: HTTP 204.
- Voice invocation without a session: HTTP 401 / UNAUTHENTICATED.
- Function listing: ACTIVE, version 1, verify_jwt true.
- Public project JWKS: ES256. Current Supabase gateway documentation supports asymmetric user JWT verification with verify_jwt enabled.
- Vercel root: HTTP 307 to `/auth/login/?next=%2F`.
- Migration SQL passed the local PostgreSQL regression check after removing blanket email confirmation.

Re-run the read-only smoke checks with:

```sh
node --env-file=.env.vercel scripts/check-supabase.mjs
```

## User's remaining Vercel step

Import the generated `.env.vercel` file into Vercel's Production environment variables, then redeploy so the public values are compiled into the application. Use the repository-root Next.js app and Node 24. No PostgreSQL connection string or provider keys belong in the Vercel environment for this implementation.

## Verification limits

No new personal account, private user recording or live booking was created by this deployment. Signed-in voice extraction, real Urdu quality, email delivery/recovery, phone recording and the complete two-role journey still need live acceptance. Provider credential checks from the earlier audit succeeded, but those checks do not prove the deployed audio workflow.

The project's built-in email delivery limits and recipient restrictions may require custom SMTP for broader public signups. No SMTP credentials were supplied, and confirmation was not disabled to avoid that requirement. Existing placeholder seed identities are illustrative and are not usable worker login accounts.

An attempted secret-key metadata retrieval was rejected by automatic approval review. No secret API keys were retrieved; deployment and checks used management CLI access and the supplied publishable key instead.

Provider credentials previously pasted into chat should be rotated for production. This does not affect importing the public Vercel environment file.

Reference: [Supabase function authorization headers](https://supabase.com/docs/guides/functions/auth-headers).
