# Roshan Rozgar — complete Next.js application blueprint

Status: governing design specification, not a claim of completed implementation or validation. This supersedes BLUEPRINT.md. The user selected Next.js (React) after the initial plan. Supabase is the preferred backend, pending connection. Five hours remains the competition delivery budget, not a promise to finish every longer-term feature below.

### Partner handoff — 10 November 2026

Use this document as the implementation contract. Frontend design work is underway separately; coordinate shared interface and database contracts before overlapping changes. Prioritize Supabase schema, RLS, auth, private storage and transactional booking operations described below. Do not assume the frontend prototype already has real AI, authentication or persistence. No secrets belong in commits.

The immediate design deliverable is a polished Next.js frontend plus a static HTML/CSS/JavaScript export for browser-based HTML-to-Figma capture. Include a `/design` page arranging the principal screens for capture. The export includes asset folders; it is not inherently one self-contained HTML file. Keep application code reusable when connecting Supabase. Build-time static export cannot host Next.js server endpoints; retain Supabase Edge Functions for privileged backend work, or explicitly change deployment mode later if introducing server-only Next.js functionality.

## 1. Product thesis and success

**Bol kar kaam. Samajh kar daam. Bharosay se rozgar.**

A household describes a problem in its own language. A nearby worker understands it, agrees to a fair scope and price, completes the work, and earns a useful reputation. A worker with limited literacy can participate without a CV or conventional typed profile form.

The product succeeds when a job is understood and accepted, both parties know what they are agreeing to, availability remains accurate, and completion creates credible evidence. A beautiful homepage alone is not success. Neither a high rating nor AI output proves someone is safe or qualified.

Design principles:
1. One obvious next action at each stage.
2. Voice is a primary input, supported by icons, playback and ordinary text.
3. Ask only what is needed for the next decision; show uncertainty explicitly.
4. Money, consent and booking states are authoritative database records.
5. Trust claims must have visible evidence and an honest sample size.
6. Every attractive surface must connect to a working action or be omitted.

Initial geography: Islamabad, three neighbouring localities. Initial fully supported trades: plumber and electrician. Other trades are expansion data, not pretend working categories. Target immediate jobs; scheduled appointments require a separate interval-based reservation model later.

## 2. Scope and delivery tiers

| Tier | Scope | Delivery commitment |
|---|---|---|
| A: complete competition journey | Responsive React app, both roles, voice onboarding, discovery, worker profiles, requests, audio conversation, versioned quotes, atomic booking, completion, issue reporting, reviews, auth/session, persisted state, honest demo labels | First five-hour target; all five required outcomes must work |
| B: product depth | Saved workers, photo attachments, richer filters, real SMS login/recovery, notifications inbox, cancellation history, moderation queue, service-area editor | Add only after A passes; otherwise next release |
| C: field-ready operations | Dispute resolution process, account deletion/export, abuse handling, monitoring and retention policies, scheduling, support staffing, verified field usability | Required before broad real-world launch; outside hackathon claim |

Do not introduce payments, government identity checks, native apps, auctions or automated repair diagnosis in this build. Payments may occur outside the platform; the app records an agreed amount, not a verified transaction or wallet balance.

## 3. Experience architecture and routes

One application, one identity, two role-specific workspaces. A person may have a customer profile and opt into a worker profile. Switching the visible workspace does not grant permissions.

| Route | Purpose | Main action |
|---|---|---|
| `/` | Polished public entry with location, two role choices, useful categories and three-step explanation | Describe a problem / Find work |
| `/auth` | Sign in, guest demo or account recovery; preserve intended destination | Continue |
| `/onboarding/worker` | Guided audio introduction, field confirmation and service area | Publish profile |
| `/find` | Problem recorder, interpreted request and ranked workers | Send request |
| `/workers/:id` | Public profile, skills, coverage and evidence | Request this worker |
| `/requests/new` | Confirm task, area, timing and pricing preference | Send |
| `/jobs` | Customer active and past jobs | Resume active job |
| `/jobs/:id` | Shared job workspace: messages, quote, agreement, timeline and role-specific actions | Current permitted action |
| `/jobs/:id/review` | Completion-linked feedback | Submit review |
| `/worker` | Availability, incoming requests and current assignment | Respond / Resume job |
| `/worker/profile` | Voice-assisted profile editing and coverage | Save changes |
| `/account` | Language, account, support and role switch | Contextual |
| `/saved`, `/notifications`, `/admin/reports` | Tier B only | Relevant working action |

Mobile customer navigation: Find, Jobs, Account. Mobile worker navigation: Home, Requests, Profile. Desktop adds a restrained navigation rail and wider job workspace; it does not stretch phone controls across an enormous canvas. Contextual screens keep a clear back action and persistent job context.

## 4. Art direction: local, confident and exceptionally clear

Visual concept: a warm neighbourhood service brand with editorial typography, real trade imagery and strong information hierarchy. Emerald communicates actions, warm paper backgrounds reduce visual noise, amber highlights the next step. Avoid stock SaaS dashboards, gratuitous gradients and decorative graphs.

Proposed tokens (contrast must be measured during implementation):

| Token | Value / rule |
|---|---|
| Canvas | `#F6F4EE` |
| Surface | `#FFFFFF` |
| Ink | `#142C25` |
| Secondary text | `#53645C` |
| Primary | `#12634B`, white foreground subject to contrast verification |
| Accent | `#E6B655`, dark ink foreground |
| Border | `#DCE3DA` |
| Error | `#B42318` plus text/icon |
| Spacing | 4/8/12/16/24/32/48/64px |
| Corners | 12px controls, 20px cards, full radius status pills |
| Typography | Inter or similar legible sans for English; Noto Sans Arabic for Urdu; load only needed weights and credit licenses |
| Motion | 150–220ms opacity/position changes; honour reduced motion |

Hero: oversized concise promise on the left, a real functional request composer on the right. Below: trade tiles, available worker previews using actual data, then a compact explanation of how trust works. On phones, the composer comes immediately after the promise. Do not hide the product under marketing content.

Discovery: request summary across the top; filters below; cards show portrait/initials, trade, availability timestamp, locality/approximate distance, completed-job count, review count and pricing basis. Use a small “Why this match” line derived from data. Desktop can show a sticky request summary; mobile uses an expandable sheet.

Job workspace: conversation is the primary column; agreement is a sticky side card on desktop and a collapsible card above messages on mobile. A concise timeline explains state changes. The next action sits at the bottom without covering messages or keyboard input.

Worker home: a large availability control, one active-job card, then incoming requests. Earnings, if ever shown, must say “agreed value of completed jobs”, not imply received payment. No decorative analytics.

Accessibility requirements: semantic headings and landmarks, keyboard access, visible focus, labelled controls, text alternatives, contrast checks, screen-reader state announcements, modal focus management, accessible audio controls, 56px primary touch targets, no colour-only status. Validate at 360/390/768/1440px and browser zoom. Urdu sets `lang` and `dir`; phone numbers, prices and mixed Roman Urdu use bidi isolation. Spoken prompts require a user gesture and never autoplay unexpectedly.

## 5. Shared component inventory

Build a small consistent system: AppShell, RoleNavigation, LanguageSwitch, ActionButton, IconChoice, VoiceRecorder, AudioMessage, ListeningPrompt, FieldConfirmationCard, WorkerCard, EvidenceBadge, AvailabilityControl, RequestSummary, QuoteCard, AgreementCard, JobTimeline, ReviewComposer, EmptyState, ErrorState, Skeleton, ConfirmDialog and Toast.

Every interactive component specifies normal, focused, loading, disabled, success and error states. VoiceRecorder additionally handles permission request, denied permission, recording, stopped preview, uploading and retry. A waveform represents actual audio data, not a fake processing animation. Loading copy states what is happening without fabricating progress percentages.

## 6. Worker journey

1. Choose “Find work”; hear a short Urdu prompt after tapping play.
2. Record name, trade, area and experience. AI suggests structured fields.
3. Confirm each field with icon/audio-supported cards. Missing facts remain missing; the worker can re-record or use guided choices.
4. Choose service areas and availability. Optional portrait is never a prerequisite.
5. Save a usable profile and see a preview. Demo guest identity is explicit; real account recovery is explained before relying on a guest session.
6. Receive a request with task audio, coarse area and requested timing. Accept conversation or decline; no automatic commitment.
7. Clarify, then propose a fixed quote or inspection fee. Confirm amount and scope explicitly.
8. On customer acceptance, see a confirmed assignment and become unavailable for competing immediate jobs.
9. Mark arrival/start, request approval of any new work, mark work done, then wait for customer confirmation or issue handling.
10. See completed job evidence and return to discovery when the physical assignment is released.

Availability is a self-declared opt-in with an expiry. Initial product policy: valid for two hours, with a reminder to renew; configurable after field testing. A worker's last app activity is separate from this declaration. “Available” is not an arrival-time guarantee.

## 7. Customer journey and matching

1. Browse without sign-in. Pick a locality or optionally grant geolocation; manual locality remains first-class.
2. Describe symptoms by voice, Roman Urdu or text. AI proposes the trade and concise task; the customer confirms uncertain details.
3. Filter eligible workers by trade, service coverage, current availability and lack of active assignment.
4. Rank eligible workers by area proximity, then relevant completed-job evidence; show new workers fairly through a defined rotating tie-break. No invented AI compatibility score. All ranking factors are explainable.
5. Inspect profile, feedback and pricing basis. Create authenticated session before sending a request.
6. Contact one worker per request in Tier A. If declined or expired, choose another worker. Multi-worker dispatch is deferred to avoid conflicting commitments.
7. Exchange playable audio/text and accept an exact quote version.
8. View agreement, status and contact channel. Confirm completion or report an issue.
9. Review completed work with satisfaction, punctuality, price-honoured and optional audio/text. The worker's next customer sees updated evidence.

Geography: locality-centroid distance is explicitly approximate and not driving time. Exact home address is private and only shared with the assigned worker after confirmation. Matching needs only coarse locality. Do not expose customers' coordinates in public responses.

## 8. Pricing and agreement rules

Two valid paths:
- Fixed price: clear task, labour amount, inclusions, material policy and arrival window confirmed before booking.
- Inspection first: explicit visit fee is accepted before travel; worker inspects and proposes a repair quote. Customer must accept that quote before repair begins. If declined, record the visit outcome and agreed inspection fee; do not describe the repair as completed.

Each quote is immutable once issued and carries a version, currency PKR, pricing type, scope, labour, visit fee, materials rule, whether the visit fee is credited, expiry and author. A replacement supersedes the old quote. Acceptance is tied to the exact current version. Totals are computed deterministically from integer minor units and rendered clearly; AI never calculates binding amounts.

Materials use “excluded; separate approval required” in Tier A, or a defined included allowance. No open-ended “materials included” promise. Additional work requires a change quote and explicit customer acceptance. An agreement snapshot preserves what both sides accepted even if the public profile later changes.

## 9. State machine and concurrency

Separate three concepts: request/conversation, physical assignment, and job outcome. This prevents a dispute from leaving someone permanently busy.

| Current state | Actor/action | Next state and side effect |
|---|---|---|
| requested | Worker responds | discussing |
| requested/discussing | Worker declines or request expires | declined/expired; no assignment |
| discussing | Worker issues quote | quoted |
| quoted | Customer accepts current valid quote | confirmed; atomically create active assignment |
| confirmed | Worker starts visit | visiting for inspection; in_progress for fixed job |
| visiting | Worker issues repair quote | awaiting_repair_approval; assignment remains active |
| awaiting_repair_approval | Customer accepts | in_progress |
| awaiting_repair_approval | Customer declines | visit_done; release assignment, preserve inspection agreement |
| in_progress | Worker marks done | awaiting_completion; release physical assignment |
| awaiting_completion | Customer confirms | completed; enable completed-job review |
| awaiting_completion | Customer reports problem | issue_open; no success/review aggregate increment |
| confirmed before start | Either participant cancels with reason | cancelled; release assignment |
| visiting/in_progress | Cancellation requested | issue_open; explicit worker release or authorized resolution required |
| issue_open | Authorized resolution | completed/cancelled/visit_done with audit reason |

Tier A issue reporting persists the problem and shows a truthful pending state; it does not pretend staffed resolution exists. Moderator resolution is Tier B. No automatic financial penalties or refunds are implied.

Database invariants:
- At most one active immediate assignment per worker, enforced with a unique index on active assignments.
- Quote acceptance locks the worker and job in consistent order, checks participant ownership, quote version/expiry, eligible state and availability, then writes agreement, assignment and event in one transaction.
- Repeated requests with the same idempotency key return the original result; competing requests produce one success and a conflict response.
- Only authorized transitions exist; clients cannot update arbitrary `status` or participant IDs.
- Complete jobs produce at most one customer review. Completion totals come from records, not mutable counters sent by the browser.
- Stale screens refetch on conflict and explain the new truth. Optimistic UI never claims a confirmed booking before server success.
- Expiry uses server time and is checked during queries/mutations even if no scheduled cleanup has run.

## 10. Next.js and backend architecture

Selected framework: Next.js App Router (React), using its file-based routing. TypeScript is the target for domain/service contracts; frontend scaffolding may initially use JSX. Use Tailwind or shared CSS tokens with a small accessible component primitive library; TanStack Query for server state; React Hook Form and Zod for structured forms/schema checks; Supabase for Auth, Postgres and private Storage. Confirm package compatibility and lock versions at setup. The earlier Vite/React Router recommendation is superseded.

Privileged AI operations run in Supabase Edge Functions. Domain transactions run as restricted Postgres RPCs with explicit caller authorization. Browser reads and ordinary permitted writes use the authenticated Supabase client and RLS. This avoids maintaining a second Node API while still keeping secrets and critical logic off the client. If a dependency makes Edge Functions unsuitable, use one small server API rather than two competing implementations.

Suggested structure:
```
app/                   # Next.js App Router pages, layouts and role shells
  design/              # screen gallery for HTML-to-Figma capture
src/
  components/ui/       # accessible primitives and design tokens
  components/domain/   # recorder, worker card, quote, timeline
  features/            # auth, onboarding, discovery, jobs, messages, reviews
  lib/                 # supabase client, validation, locale, errors
  services/            # typed service contracts and backend implementation
  locales/             # English/Urdu strings and spoken prompt manifests
supabase/
  migrations/          # schema, grants, RLS, RPCs and constraints
  functions/           # authenticated AI endpoints
  seed.sql             # clearly labelled demonstration records
tests/                 # domain, database authorization and browser journeys
docs/                  # setup, architecture, demo and disclosures
```

Backend connection policy: UI can be designed against typed fixtures, but fixture mode is visibly labelled and cannot be represented as a functioning marketplace. Real two-user persistence, authentication and concurrency acceptance require Supabase. Connect early; do not postpone it until after every screen is polished. No separate mock logic should become the only implementation of booking rules.

## 11. Data model

All business tables use UUID keys and server timestamps. Money uses integer minor units. Foreign keys, uniqueness and check constraints protect business rules.

| Table | Essential contents |
|---|---|
| profiles | auth user ID, display name, locale, public avatar reference |
| worker_profiles | owner ID, bio, experience, opted-in availability and expiry, publication state |
| trades / worker_trades | controlled trade catalog and declared skills |
| localities / worker_service_areas | controlled coarse location and coverage |
| jobs | customer, selected worker, task, trade, locality, pricing path, state, version |
| job_private_details | exact address/contact instructions; separate access policy |
| quotes | job, author, immutable versioned scope and price fields, expiry, superseded status |
| agreements | accepted quote snapshot, customer acceptance timestamp, worker quote timestamp |
| assignments | job, worker, acquired_at, released_at, release reason |
| messages | job, sender, type, text/transcript or private object reference, delivery timestamp |
| job_events | actor, transition, previous/new state, reason, timestamp |
| reviews | unique job, author, target worker, satisfaction, tags, optional audio/text |
| reports | reporter, job/user reference, reason, status; private |
| mutation_keys | actor, operation, idempotency key, result reference |
| notifications | recipient, event reference, read_at; Tier B |

Do not store redundant public/private copies of phone numbers or exact addresses in broad profile JSON. Public discovery uses a deliberately limited projection with authorization semantics verified; do not assume a view automatically preserves RLS.

## 12. Authentication, permissions and storage

Browse publicly. For the demo, Supabase anonymous sign-in creates distinct authenticated identities without forcing typing; show a clear guest-session label and explain that clearing browser data may lose account access. Anonymous users are not the same as unauthenticated requests. Real adoption needs phone OTP and account recovery, requiring a configured SMS provider and tested delivery; do not fake OTP verification. Link a permanent identity without losing jobs when supported and tested.

Roles: customer privileges belong to the authenticated job owner; worker privileges require an owned worker profile; moderator privileges are provisioned server-side. Never trust client-editable user metadata for admin authorization.

RLS matrix:
- Public: published worker profile projection and approved review evidence only.
- Profile owner: own editable profile fields; never self-assigned admin privileges or completion metrics.
- Job participants: permitted job details, messages and relevant audio only.
- Customer: own request creation, quote acceptance, completion and eligible review through authorized operations.
- Worker: own quotes and allowed execution actions.
- Moderator: restricted reports and resolution functions, audited.

Private buckets for job audio/photos. Enforce participant access to objects as well as rows; possession of a guessed path must not grant access. Use short-lived signed links after authorization. Public avatars are optional and isolated. Validate file size/type, randomize paths and clean up abandoned uploads. Proposed audio clip cap: 30 seconds and 5 MB, subject to device tests.

Production gates: rate limits, anonymous-signup abuse controls, AI quota limits, approved retention policy, recovery and deletion flows. Never log raw audio, private addresses, tokens or full prompts containing personal data. Service credentials remain server-side; only public project configuration belongs in the frontend environment.

## 13. Service contracts

Use typed results with structured error codes: UNAUTHENTICATED, FORBIDDEN, VALIDATION_ERROR, QUOTE_STALE, WORKER_UNAVAILABLE, INVALID_TRANSITION, RATE_LIMITED, AI_UNAVAILABLE and UPLOAD_FAILED.

Core calls: `extractWorkerProfile(audioRef, locale)`, `extractJobRequest(audioRef/text, locale)`, `saveWorkerProfile(confirmedFields)`, `findWorkers(criteria)`, `createRequest(input, key)`, `sendMessage(jobId, payload, key)`, `issueQuote(jobId, fields, expectedVersion)`, `acceptQuote(jobId, quoteId, key)`, `transitionJob(jobId, action, expectedVersion, key)`, `submitReview(jobId, feedback, key)` and `reportIssue(jobId, reason, key)`.

Every mutation checks auth, ownership, validated input, current state and expected version. Search accepts only supported filters; pagination is bounded. Poll current job/messages every few seconds while visible, pause while hidden and refetch on focus. Realtime is a Tier B enhancement with private-channel authorization and authoritative refetch after events.

## 14. AI that removes actual barriers

Mandatory uses: spoken Urdu -> confirmed worker fields; symptom description -> confirmed task/trade/locality. Optional uses: message transcription and evidence-grounded review summaries. Never use AI for identity assurance, worker safety labels, repair guarantees, authoritative price setting or booking state changes.

Provider contract returns a bounded schema: extracted fields, source transcript, missing fields and explicit ambiguities. Validate enums/ranges server-side. An unknown place asks for a locality choice. An uncertain trade asks a simple clarification. Do not treat model self-reported confidence as a calibrated probability.

Audio is untrusted content, not instructions to the system. The extraction model has no direct database mutation tools. Users confirm outputs before publication. A transcript and source audio can be replayed/corrected. Explain that recordings are processed by an external AI service, with a non-AI path available.

Test real accents, background noise, Urdu/Roman Urdu, code switching and microphone denial. Smoke-test provider credentials/model/latency in the first build block. Standard browser speech recognition is not the sole required implementation because actual device/language support must be verified. Use short prerecorded Urdu navigation prompts; dynamic readback is optional and must be tested. Never silently substitute cached AI output during a live demonstration.

## 15. Reliability, weak networks and privacy

Preserve unsent text drafts. Keep a recorded blob while the active page retries; if not durably saved, warn before leaving rather than claiming offline persistence. Use upload progress, bounded retries and idempotent message submission. No offline confirmation of bookings or prices: financial/job commitments require server acknowledgement.

Display pending, failed and sent states distinctly. Reconnect/refocus triggers reconciliation. Expired signed audio links can be renewed after authorization. Lazy-load noncritical routes and images; avoid large video backgrounds, map SDKs and oversized icon bundles. Measure mobile load and interaction quality rather than claiming performance scores in advance.

Microphone requires a secure browser context: HTTPS on deployment; localhost for desktop development. A phone opening an HTTP LAN address may not provide recording access, so verify the actual phone demo transport early.

## 16. Trust and real-world operation

Trust card: job count, review sample size, recency, clear skill claims and customer feedback. “Phone confirmed” means control of a phone number only. “New worker” gets a fair introduction without fabricated ratings. Allow reports of misleading profiles and inappropriate messages; do not launch publicly without someone owning report response.

Issue flow captures reason, optional evidence, last accepted agreement and event history. Users see the actual resolution status. The platform cannot assert that cash was paid or a repair was safe merely because the customer tapped complete.

Field validation after the event: observe 3-5 workers and 3-5 households attempting the flow without coaching. Measure assistance required, onboarding completion, request response time, quote acceptance, completed jobs, cancellations and price disagreements. These are planned measures, not current results. Test whether audio instructions actually help, whether visit fees are understood, and whether workers remember to update availability.

## 17. Five-hour implementation sequence

| Time | Build slice | Gate |
|---|---|---|
| 0-25 min | React shell/tokens, Supabase connection, distinct sessions, audio smoke test, initial schema | Real database round-trip and one Urdu extraction |
| 25-65 | Domain transactions, RLS, seeds, two-role skeleton | Authorized job flow persists; competing booking rejected |
| 65-110 | Worker onboarding, profile and availability; customer composer/discovery | Worker can publish without conventional typing and be found |
| 110-160 | Shared workspace, audio messages, quotes and agreement | Two browsers agree on exact scope/price |
| 160-200 | Inspection/fixed paths, completion, issue state and review | All five competition outcomes operate end to end |
| 200-235 | Visual finish, mobile/RTL, empty/error/loading states | Complete flow looks coherent at phone and desktop sizes |
| 235-265 | Security/concurrency checks, final deployment or dependable local setup, README | Critical checks pass and limitations disclosed |
| 265-280 | Two rehearsals and blocker repairs | Four-minute live demonstration succeeds |
| 280-300 | Freeze, repository/public access and submission checks | Submission completed with deadline buffer |

If Supabase cannot connect early, explicitly choose between a disclosed local persisted backend and reduced scope; never claim a frontend fixture is a complete connected application. Do not build both alternatives preemptively. If time slips, cut Tier B, image uploads, realtime, dynamic speech output and marketing sections first. Preserve every required outcome and core invariants. Inspection pricing may use a compact stepper, not another large screen family.

AI coding workflow: implement one vertical slice, inspect the diff, run its meaningful checks, then proceed. Design components and domain contracts first so generated screens remain consistent. Never let an assistant independently invent a second status model in a component. Use repository instructions and this blueprint as the shared contract. Team members, if available, can own Urdu content, manual testing and rehearsal; no autonomous agent delegation is assumed.

## 18. Verification and definition of done

Automated checks: TypeScript/build; schema validation; quote total rules; allowed transitions; transaction race with two authenticated customers; stale quote rejection; repeated submission idempotency; forbidden user reads/writes; private-object access; review eligibility and uniqueness. Browser tests cover one fixed-price journey and one inspection journey, with separate worker/customer contexts. Fixtures do not substitute for real database authorization tests.

Manual checks: fresh voice onboarding, noisy/ambiguous input, playback on actual demo devices, permission denial, no-match discovery, busy worker, refresh/reconnect, interrupted upload, expired session, RTL mixed text, keyboard navigation, mobile keyboard and empty/error states. Verify microphone access on the real demo URL.

Definition of complete Tier A: all visible primary actions work; both roles have persisted independent sessions; five required outcomes connect; availability and booking concurrency are enforced by backend; AI is actually exercised; simulation disclosures are visible where relevant; app survives refresh; build passes; repo has setup instructions and no secrets; demo rehearses successfully. This is a working competition product, not a claim of production readiness.

## 19. Presentation and differentiation

Demonstrate one worker and one household across two browsers. Open with spoken onboarding, show a matched worker, play the actual request, agree on a transparent fee, confirm booking, show the worker disappearing from available results, then complete/review and show updated evidence. Explain inspection pricing briefly with an existing separate example if the four-minute main path uses a fixed job.

Three defensible differentiators: low-literacy participation; explicit scope/price agreement; reliable booking and evidence-based reputation. The design reinforces each one rather than competing for attention.

README must list AI services/models, coding assistants, libraries/assets and licenses, what is seeded/mock, real backend configuration, account modes, known limitations, local/deployed startup and demo instructions. Competition-specific code must be written during the official hacking window and genuine commit history retained. Local demonstration is acceptable under the supplied brief; deployment is desirable when reliable.

## 20. Decisions ready for implementation

Confirmed: Next.js (React), complete connected workflow as the target, strong visual quality, real-world usefulness, and a polished frontend with static HTML export for HTML-to-Figma capture.

Proposed defaults: TypeScript domain contracts, Supabase backend, emerald/ivory visual system, Urdu-first worker experience, two trades/three localities, immediate jobs, both pricing paths, guest demo auth with later phone upgrade, server-owned booking transactions.

Inputs needed at build kickoff: official remaining deadline; Supabase project connection/configuration; available AI provider credentials via safe environment configuration; whether SMS login is already configured; actual devices for demonstration. Secrets should not be placed in the blueprint or public repository. Optional choices must not block layout/domain work, but real backend acceptance cannot be claimed until connected.

## References and evidence limits

Competition source: `C:/Users/hhuss/OneDrive/Desktop/Roshan_Rozgar_Problem_Statement.pdf`, read in the preceding planning turn. Competition requirements are source facts; proposed UX, state machine, timings and product policies above are design decisions.

- Supabase anonymous authenticated sessions and account linking: https://supabase.com/docs/guides/auth/auth-anonymous
- Auth and RLS integration: https://supabase.com/docs/guides/auth
- Private storage access policies: https://supabase.com/docs/guides/storage/security/access-control
- Realtime authorization (optional): https://supabase.com/docs/guides/realtime/authorization
- Transactional database functions: https://supabase.com/docs/guides/database/functions
- Audio understanding capabilities: https://ai.google.dev/gemini-api/docs/audio

Documentation supports the proposed mechanisms, not successful integration, real-user impact, Urdu accuracy or deployment. Those remain verification work.
