# Vercel deployment and release checks

Deployment update: the new hosted project `llhmnmmfhhlhlgghqyqh` now has all five migrations and the active voice function. Auth redirects target https://web-forge-94gs.vercel.app. Import the generated `.env.vercel` file and redeploy. See [the actual deployment record](SUPABASE_DEPLOYED.md) for verified results and remaining live acceptance. The older audit snapshot below describes the previous configuration.

The repository-root Next.js application is deployable on Vercel. The old `web-forge-project/` starter and `out/` directory are not the deployment target. Vercel hosts the web application. Supabase separately hosts Auth, Postgres, private Storage and the `extract-voice` function.

## Current audit result

- Latest backend work was integrated from main at 1ba8212 before this audit.
- The supplied local Supabase endpoint, http://127.0.0.1:54321, is unreachable from this machine at audit time.
- The configured cloud Supabase project returned HTTP 404 / PGRST202 for `rpc_discover_workers`. Its required function is unavailable through the API. Verify the target project, pending migrations, permissions and schema cache before release.
- Gemini completed one minimal generation request with HTTP 200. Groq authenticated with HTTP 200 and listed `whisper-large-v3-turbo`. These verify credentials/model visibility, not actual speech processing or the deployed Edge Function.
- No real Urdu recording was supplied for this audit. Actual transcription quality and complete browser-to-function audio processing remain unverified here.
- The production dependency audit reported zero known vulnerabilities. This is not a guarantee of application security.

## 1. Prepare hosted Supabase

Use a hosted project, not localhost. Obtain its HTTPS Project URL and a publishable key from the same project. Do not combine a hosted publishable key with a local URL or a local demo JWT with a hosted project.

Inspect the target project's migration history before applying changes. The required migration set is 00001 through 00005, ending in `20261110000005_registered_accounts.sql`. Review pending changes before pushing. Never reset shared data or replay applied migrations blindly. Existing applied seed files do not rerun automatically.

If deploying with the CLI:

```sh
npx supabase login
npx supabase link --project-ref YOUR_ACTUAL_HOSTED_PROJECT_REF
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
npx supabase functions deploy extract-voice
```

The local `project_id` label in config.toml is not the hosted project reference. Keep deployment tokens and database passwords out of Git, screenshots and logs.

Verify the private `job-audio` bucket and its participant/owner policies, registered-user RPC enforcement, discovery, quotes and booking assignments.

## 2. Configure provider secrets in Supabase

Set these under the hosted project's Edge Function secrets:

| Name | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Rotated Gemini credential |
| `GEMINI_AUDIO_MODEL` | An audio-capable model enabled for the account |
| `GROQ_API_KEY` | Optional fallback transcription provider credential |

The current function defaults to `gemini-flash-lite-latest`; validate the chosen model with a real recording. Groq currently uses `whisper-large-v3-turbo`. The fallback now respects the selected Urdu/English locale and retains a genuine transcript if subsequent structured extraction is unavailable.

Provider keys previously pasted into chat should be rotated before production. Configure replacements through the secrets interface. Do not put them in `NEXT_PUBLIC_*`, browser source, `.env.example`, the Vercel client environment or this document. `GEMINI_APP_NAME`, `GEMINI_PROJECT_NAME` and `GEMINI_PROJECT_NUMBER` are not required by this app.

Supabase supplies its own service URL/public key to the Edge runtime. Keep JWT verification enabled and validate actual gateway compatibility with the deployed function. Do not disable authorization simply to make a smoke test pass.

## 3. Import into Vercel

In Vercel, choose Add New Project and import yellowflash011/web-forge from GitHub.

| Setting | Value |
| --- | --- |
| Framework preset | Next.js |
| Root directory | Repository root (`./`) |
| Production branch | `main` |
| Node.js | 24.x |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | Leave the Next.js framework default; do not enter `out` or `dist` |

No custom `vercel.json` or persistent development server is required. `npm start` is for a local production smoke test. Vercel uses the framework deployment output.

## 4. Set Vercel environment variables before building

Add these for Production. Set Preview explicitly too if you use preview deployments, preferably with a separate test Supabase project.

```dotenv
NEXT_PUBLIC_APP_MODE=live
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_MATCHING_PUBLIC_KEY
```

Only use `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead if you deliberately use the matching legacy hosted anon key. Prefer setting one key spelling to avoid precedence confusion. Neither public key bypasses RLS. Never add a service-role/secret key as a public variable.

Do not set `NEXT_DIST_DIR` on Vercel. The production output uses `.next`. Public variables are compiled into the browser bundle, so redeploy after changing them. The new configuration rejects Vercel builds that use demo mode, missing backend config, non-HTTPS or loopback backend URLs.

## 5. Configure email/password auth URLs

After Vercel assigns the production URL, open Supabase Authentication URL Configuration:

- Site URL: `https://YOUR_APP.vercel.app`
- Allowed redirects: the production `/auth/callback/` and `/auth/reset-password/` paths, including the app's internal `next` query pattern where required by the allow-list matcher.
- Add localhost redirects only for local development.
- If supporting previews, allow only the team's own Vercel preview pattern, rather than all vercel.app projects.

The application adds `?next=...` to callback/reset URLs. Check both the path and query against the allow list. For example, restricted patterns can be `https://YOUR_APP.vercel.app/auth/callback/**` and `https://YOUR_APP.vercel.app/auth/reset-password/**`; validate these against actual email links. Prefer a final stable production domain and narrowly scoped rules.

Enable email/password signup, disable anonymous signup and phone/SMS providers, and configure email confirmation according to the release policy. For public users, configure production SMTP/email delivery and verify delivery to an independent inbox. Test expiry, resend behavior and password-reset links on the actual deployed origin. The app explicitly exchanges PKCE codes once; the Supabase browser client no longer races it with automatic URL-code detection.

Do not paste database/provider secrets into the Vercel UI's public variables. Password recovery requires real inbox verification; an authenticated `updateUser` test is not proof of recovery email delivery.

## 6. Validate before public use

Run locally:

```sh
npm ci
npm test
npm run test:ui
npm run build
npm start
```

The separate `npm run test:hosted` suite creates users, changes a generated test user's password, uploads audio and writes jobs/reviews. It requires explicit `RUN_HOSTED_ACCEPTANCE=1`, `ACCEPTANCE_SUPABASE_URL`, and `ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY` (or `ACCEPTANCE_SUPABASE_ANON_KEY`). Use only an agreed disposable test project and a controlled `ACCEPTANCE_EMAIL_DOMAIN`. It does not auto-load .env.local, choose production or fall back to localhost.

That suite currently expects newly registered test accounts to receive sessions immediately. Run it in a disposable stack with the corresponding auth setup, or extend it for confirmed test accounts. Do not disable production confirmation to make it pass. User cleanup/retention after a run remains an operator task. The suite does not establish real Urdu quality, recovery email delivery or a browser/device result. The repaired booking-race check dispatches independent clients together and accepts either winner; its new version must still be run against the chosen stack.

After deployment, verify:

1. Signed-out protected requests return a server redirect to login. Auth pages and required public assets load.
2. Register and confirm a real email. Sign in, refresh, sign out and reopen a protected link.
3. Complete a password reset from a fresh inbox link, including while another account is signed in.
4. Use separate registered worker/customer sessions for profile, availability, discovery and persisted messages.
5. Record on a real phone over HTTPS, preview, upload, extract real Urdu fields and play the message from the other account.
6. Complete fixed-price and inspection-first jobs, then verify a persisted eligible review.
7. Test simultaneous independent acceptances and outsider denial for jobs/messages/audio.
8. Inspect Vercel runtime logs and Supabase Auth/function logs without logging credentials or personal recordings.

The public release remains gated on these real deployed checks. A successful Vercel build does not deploy Supabase migrations or its Edge Function.

## References

- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Supabase server-side clients and session refresh](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls)
