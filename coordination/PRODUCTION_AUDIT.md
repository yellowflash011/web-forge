# Production audit — 10 November 2026

Starting integrated baseline: 1ba8212. This audit preserves the separate presentation files and the existing MACHINE_B_PROMPT.md edit.

## Reproduced and repaired

1. Ordinary npm test attempted networked signup against an implicit local Supabase URL and failed. Kept the live suite intact as a separate explicit opt-in command, requiring a selected disposable target and public key. No hosted user/signup writes were performed by this audit.
2. Protected pages relied only on a client guard. Added a Next.js Proxy that verifies the actual user with Supabase Auth, rejects missing/anonymous/unconfirmed identities, preserves refreshed cookies on redirects, prevents protected-response caching and fails closed on configuration/Auth outages.
3. Browser automatic PKCE detection could race the callback. The callback also skipped exchange when a different session existed. Disabled automatic URL detection and explicitly exchanges each supplied code once. Regression checks verify that expired codes cannot fall back to an unrelated old session.
4. Groq fallback forced Urdu even for English requests. It now forwards the requested supported language.
5. A second Gemini outage after successful Groq transcription discarded the useful result. Structured extraction failure now retains the real transcript and conservative fallback suggestions. Transcript text is explicitly marked as untrusted in extraction prompts.
6. The acceptance suite labelled sequential booking attempts as a concurrent race. Its repaired version dispatches independent requests together, verifies one winner and accommodates either winner. This revised live check has not been executed here.
7. The acceptance suite's password test verifies authenticated password change, not inbox recovery. Clarified that distinction in the test and deployment guide.
8. Added deployment config checks that reject missing, non-HTTPS/loopback backend URLs and demo mode on Vercel. Added baseline response headers and Node 24 deployment metadata.

## Verification

- 35 local contract, auth, provider, policy and PostgreSQL checks passed.
- 14 existing interactive UI checks passed before final integration; the final regression rerun is recorded in the delivery.
- Production Next.js build passed with Proxy enabled.
- Local production HTTP checks confirmed 307 server redirects for protected routes with preserved return paths, 200 public auth/reference pages, private/no-store protected responses and response headers.
- Production npm dependency audit reported zero known vulnerabilities.
- One authorized minimal Gemini generation request returned 200 and generated a response. A read-only Groq model-list request returned 200 and listed whisper-large-v3-turbo. No user audio was transmitted and no provider keys were written to source or environment files.

## Unresolved deployment gates

- Supplied localhost:54321 Supabase is not reachable on this machine.
- Configured hosted discovery returned 404/PGRST202. Cloud migration/function availability remains unresolved, regardless of the report from a separate running Supabase stack.
- Inspect and apply the actual hosted project's pending migrations through 00005. Deploy the updated extract-voice function and set rotated server-side provider secrets.
- Verify registered email confirmation/recovery with production SMTP and approved callback/reset redirect paths.
- Verify actual phone recording/upload, real Urdu processing, participant playback, both job journeys and simultaneous booking attempts against the hosted stack.
- The revised acceptance script creates test accounts and changes a generated test user's password. Run only in an explicitly selected disposable test environment. It currently expects immediate signup sessions and does not verify production email delivery or clean up users automatically.
- Device Urdu voice availability, secondary untranslated strings, real low-literacy usability and operational handling of unresolved issues remain product follow-ups.

No Vercel project, hosted database or Edge deployment was changed by this audit. See docs/VERCEL_DEPLOYMENT.md for the release procedure.
