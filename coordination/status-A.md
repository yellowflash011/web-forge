# Machine A status

## Registered accounts, voice and worker language — latest batch

Implemented email/password login, registration, confirmation callback, recovery and reset pages using the shared Supabase browser client. Marketplace routes require an explicit registered identity; guest controls and automatic frontend ensureSession calls are removed. Internal return URLs are validated. Identity changes clear private drafts and remount protected content. Backend RLS/RPC/Storage rejection of anonymous identities and hosted auth deployment remain B-owned.

Job conversations now record, preview, upload and send voice notes. Failed sends retain the uploaded reference for idempotent retries. Customer requests attach audio and offer a confirmed AI task suggestion; an extraction failure retains the audio and manual task fallback. Recorder cleanup and permission errors are handled. Worker onboarding/workspace add Urdu/English selection, RTL, key translated actions, spoken instructions when a device voice exists and quote amount presets. Payment remains outside the platform.

Checks: 25 local contract/domain/database/policy tests and 14 interactive UI tests pass, including confirmation-required signup, invalid reset links, voice retry/permission/unmount behavior and a no-typing Urdu onboarding journey against a controlled adapter. Browser auth checks at 1440px and 390px verified protected route redirects, preserved return destination, registration validation and no phone overflow. Screenshots: tests/ui/evidence/auth-desktop.png and auth-mobile.png. Hosted email delivery, actual accounts, independent sessions, microphone/Storage transfer and real Gemini audio remain B5 checks.

Read AUTH_VOICE_FRONTEND_HANDOFF.md before integrating B's auth/deployment work. Device speech synthesis is not guaranteed to provide Urdu: recorded prompts or a deployed speech service remain a portability follow-up, and some secondary text remains English. No claim of full localization or hosted readiness is made.

## Next.js App Router refactor — current checkpoint

The root marketplace now has real pages under app/: discovery, dynamic public profiles, dynamic job workspaces, jobs, worker workspace, worker-profile editing, onboarding, account and saved workers. /profile/ redirects to /account/. The screen-switch component and hash navigation are removed, including the reference design's hash writes. Shared appearance and the existing quote/action/review workspace are preserved.

A root marketplace provider retains identity, locality, filters, saved IDs and per-worker request drafts across route changes. Page-scoped resources cancel stale reads, refresh on focus, and poll job lists. Record IDs are checked before rendering; malformed URLs return 404. Signing out clears identity and pending request drafts, and job workspaces remount on identity changes. Backend authorization remains authoritative.

The app now uses normal Next.js server deployment: npm run build, then npm start (or a Next.js host). output:export is removed because arbitrary profile/job IDs use dynamic routes. /design/ still prerenders, and npm run export:figma creates the standalone five-frame HTML from the current .next build rather than stale out/ files. Backend files, migrations and environment configuration were not changed.

Verification: production build and all 29 existing local checks pass (23 contract/domain/PostgreSQL checks and six interactive quote/action/review journeys). A separate explicit demo server verified real profile/job links, browser back/forward, retained search/saved IDs/drafts, request creation, messages after refresh, worker creation/editing after refresh, denied signed-out job access, and 404 responses for malformed profile/job IDs. Desktop at 1440px and phone at 390px retained the design; no phone horizontal overflow was observed. Screenshots: tests/ui/evidence/app-router-desktop.png and app-router-mobile.png. These checks use local fixtures and do not resolve B5 hosted verification or missing cloud deployment.

Machine B: pull main before continuing B5. The service contract and B-owned directories are unchanged; implementation screens now live in features/marketplace/*-page.jsx and app/ route entries. No further implementation batch is required for this route refactor.

## Quote, job action and review UI — current frontend batch

Implemented on implementation/frontend after integration repair 4372a88. Backend files, database migrations and shared environment were not changed in this batch. Machine B continues live verification; no API contract changes are required.

Ready:
- Dedicated job workspace and controller; role-aware controls consume server allowedActions for transitions. Dedicated quote/review/issue operations remain server-authorized.
- Worker quote editor supports fixed labour, inspection visit fee, and repair-after-inspection with a carried-forward visit fee and explicit credit choice. Money is parsed exactly into minor units. Materials require separate approval.
- Expiry and immutable quote/version are shown. Customer opens an explicit confirmation, checks the agreement, and submits the exact quote ID and job version. Changed/expired quotes invalidate open consent.
- Worker responds, starts the visit/work and marks work done; customer confirms completion. Cancellation/decline reasons and issue reporting have confirmation flows. Stale actions reconcile from the server, and duplicate clicks/retries retain intent keys.
- Completed-job review has 1-5 stars, optional punctuality/price-honoured tags, text and an actual submitted state. Unknown tags are omitted rather than falsely stored as negative. Existing review evidence is checked and a refreshed submitted review does not recreate the form.
- Text conversation uses cursor refresh. Private audio messages can request/reload a short-lived playback URL. Microphone upload is unchanged from the earlier onboarding work.
- Phone layout brings the agreement/actions above the conversation, keeps active editing/confirmation in focus, and scrolls to feedback after completion. Account identity changes remount the workspace to clear prior-session state.

Verification passed: npm test (23 local domain/contract/PostgreSQL/presentation checks), npm run test:ui (6 interactive component journeys against a role-scoped in-memory test adapter), and npm run build. Component checks cover fixed-price completion/review, stale quote consent, inspection credit/repair approval, issue reporting without completion, lost-response quote retry, and cancellation reasons. These are not hosted end-to-end results. Browser visual checks used the same rendered fixture DOM at 1440px desktop and 390px phone; the phone had no horizontal overflow. Screenshots: tests/ui/evidence/job-quote-editor-desktop.png and job-review-mobile.png. The temporary fixture server was stopped after inspection. No credentials or user recordings were used in these UI checks.

Money handoff for B5: repair quote labourMinor is the full repair-labour figure; visitFeeMinor carries the already-accepted inspection fee, and visitFeeCredited determines whether that prior fee reduces remaining labour. The UI blocks acceptance when a repair quote's carried visit fee conflicts with the prior inspection agreement; it does not guess a missing credit or claim payment was received.

Known backend follow-up (not edited here): computeAllowedActions currently returns decline in quoted state but SQL transitionJob permits decline only from requested/discussing. UI suppresses that specific broken action, while retaining revise-quote and customer cancellation. The redundant release_assignment action in awaiting_completion is also suppressed because work_done already releases the physical assignment. B can reconcile these capabilities after its live checks.

Remaining verification: B5 hosted auth/Storage/AI, real simultaneous booking and a cross-device demonstration with the newly completed UI. No live deployment claim is made by this frontend batch. Prior checkpoints below are retained as history.

## Integration repair — current checkpoint

User explicitly authorized Machine A to repair backend gaps. Merged origin/implementation/backend (f94f21a) into implementation/frontend. Prior ownership is temporarily overridden for these integration fixes; Machine B's next task is deployment/live B5, documented in MACHINE_B_NEXT_TASK.md.

Repaired: missing own-worker read; implicit in-memory fallback; Next public-key configuration; locality mismatch; busy-worker discovery; audio-reference-as-text AI; missing private audio provisioning; profile/review counts; FK-invalid demo review seed; message idempotency/cursor; fabricated transcript fallback; unsafe nullable suggestions. Added authenticated Edge handler with actual audio bytes, server-only model/key configuration, caller-scoped storage, throttling and explicit failure responses.

Frontend services now select the real facade by default. Fixtures require NEXT_PUBLIC_APP_MODE=demo explicitly. This is code integration, not a claim of hosted readiness. Cloud migrations/function deployment have NOT been applied here; Machine B alone owns shared-environment changes.

Checks: 20 tests pass, including real LOCAL PostgreSQL migration execution and policy/assignment/message checks via PGlite, plus mock-provider and Edge boundary tests. Final production build passed. Browser bundle scan found zero Gemini key references or direct Gemini provider-request URLs. PGlite uses stand-ins for Supabase Auth/Storage. Hosted auth, independent concurrent transactions, function deployment and actual Urdu transcription remain B5 checks.

Required deployment: repaired migration 00003 on fresh projects, then new 00004; deploy extract-voice with GEMINI_API_KEY and GEMINI_AUDIO_MODEL as function secrets. See docs/backend/INTEGRATION_REPAIR.md and coordination/MACHINE_B_NEXT_TASK.md. Do not replay already-applied migrations or reset shared data.

Next frontend work: quote editor, allowedActions-driven job controls, reviews and audio-message playback against the delivered backend. Earlier fixture-only checkpoint below is retained as history.

## Earlier frontend checkpoint

Baseline SHA: b463a25 (coordination baseline published to main)

Branch: implementation/frontend

Batch: A0/A1 implemented against explicit local demo adapter; early A2 request/conversation UI prepared. Real cross-device gates remain pending B1/B2.

Latest implementation SHA: ee03da1, published on implementation/frontend. This status document is finalized in the following documentation commit; use the branch head for the latest complete handoff.

Ready screens / changes:
- Root app uses modular marketplace UI, reusable domain components and separate recording lifecycle hook.
- Submitted prototype preserved under features/design/prototype.jsx and /design. Existing Figma exports retained unchanged.
- Guest session/account UX, signout, confirmed profile creation/editing, service area selection, availability and expiry display, search, profile evidence, saved worker IDs and proper empty/error/loading states.
- New profiles have no fabricated history/rating. No sample profile fields are presented as AI extraction.
- Customer request form distinguishes inspection from fixed-price discussion; request list and text conversation use contract-shaped service calls.
- Removed customer-side controls that impersonated a worker marking a job complete. No fabricated quotes or completed jobs in application mode.
- lib/demo is explicitly local, persisted browser fixtures only. No Supabase or real AI is claimed.

Integration seam: features/marketplace/services.js currently re-exports lib/demo/index.js. When B1 is ready, A will replace this with named exports from lib/api/index.js and export an explicit mode marker for UI disclosure. No silent fallback on live errors.

Contract addition for B: getMyWorkerProfile() -> { data: Worker|null, error }. Required to restore the authenticated worker workspace even when the worker is unavailable. Session lacks a worker ID and discovery excludes unavailable workers, so neither can locate the current user's worker profile reliably. Added as an additive call to API_CONTRACT.md; please include in B1 or propose an equivalent explicit shape. No other B-owned files were edited.

Ready calls consumed: getSession, ensureSession, signOut, getMyWorkerProfile, saveWorkerProfile, listWorkers, getWorker, setAvailability, listMyJobs, createRequest, getJob, listMessages, sendMessage; uploadAudio/extractVoice wired behind explicit not-connected response in the demo adapter.

Checks actually run:
- Production `npm run build` passed after final fixes; root and /design statically prerendered.
- `node --test tests/ui/demo-contract.test.mjs`: 3 passed. Covers profile identity/persistence, availability expiry, idempotent request/message retries, distinct-session fixture isolation and no fabricated AI/booking success. These are local fixture checks, not Supabase authorization or race tests.
- Browser: created Frontend QA Worker through confirm/save, enabled availability, reloaded and verified persisted identity/availability, saw the new worker in discovery, sent a demo request to another worker, sent a text message and verified it after refresh.
- 390px phone and 1440px desktop inspected; no phone horizontal overflow. Microphone capture was not exercised because it requires the user's browser permission; lifecycle/error handling is implemented.
- /design still contains all five submitted compositions. Existing static HTML/Figma output files unchanged.
- Screenshot: tests/ui/evidence/machine-a-desktop.png.

Dependencies requested: none.

Blockers: real adapter and shared database B1/B2 handoff. Quote editor, allowedActions rendering, approval/completion/reviews UI integration follows B2/B3; no end-to-end backend acceptance claimed.

Concurrent work preserved: an unrelated uncommitted one-word edit to MACHINE_B_PROMPT.md was present at kickoff and is not included in A's implementation commit.

Next batch: merge B1 when handed off, connect the real service boundary, run the two-device profile/discovery gate, then finish A2 quote and audio-message UI against delivered backend contracts.
