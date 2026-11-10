# Roshan Rozgar: five-hour competition blueprint

## The bet

**Bol kar rozgar. Bharosay ke saath.** A worker speaks, a customer finds the right nearby person, both agree on a price, and a completed job builds evidence for the next customer.

Make the worker experience the differentiator. Build one convincing end-to-end journey, with real persisted state and meaningful AI. No feature can displace the five required outcomes.

Planning assumptions: five hours from implementation kickoff; one primary builder using an AI coding assistant; API credentials and a database can be obtained quickly. Additional teammates can own manual QA, Urdu recordings, seed content and rehearsal. This is a target scope, not a guarantee. No implementation or deployment has been performed by this blueprint.

## Competition alignment

The supplied brief assigns technical execution 30%, problem understanding 20%, meaningful AI 20%, accessibility 15%, presentation 15%. It requires onboarding, discovery, communication, booking and post-job trust in one flow. Local demonstration is explicitly acceptable. Payments, government identity verification and native apps are outside scope.

All project-specific implementation must start inside the official hacking window. Confirm official start and submission time before coding; keep genuine commit history, make the repository public, and disclose AI tools, services, libraries, seed data and simulations. Do not backdate commits or present simulations as live integrations.

## The product to build

### 1. Worker: speak your profile

The opening screen has two huge illustrated choices: find work / find a worker. Worker onboarding plays a short prerecorded Urdu instruction after a tap. Record 10-25 seconds: “Mera naam Aslam hai. Main G-10 mein plumber hoon. Das saal se kaam kar raha hoon.”

AI returns name, trade, locality, years of experience, a concise bio and missing fields. Normalize trade and locality against small allowlists. Never invent missing experience or skills. Show illustrated confirmation cards, the source recording and clear confirm/re-record buttons. Use prerecorded Urdu prompts for missing fields; trade and locality can be selected from icons with spoken labels. Save only after confirmation. No conventional typed signup form is required in the demo.

Create a session-backed demo identity; disclose that phone/OTP ownership verification is outside the demonstrated flow. Do not force a low-literacy worker through email/password signup. Availability is a giant toggle with icon, words and audible feedback.

### 2. Customer: describe the problem

Record “G-10 mein kitchen ka nal leak ho raha hai, abhi plumber chahiye.” AI extracts trade, task and locality; customer confirms. Offer icon selection as a real fallback. Return at most three eligible workers: trade match, chosen service area, available now. Rank by approximate distance, then completed-job evidence. Explain each result using actual database fields.

Use three localities and two trades initially: G-9, G-10, G-11; plumber and electrician. Seed 6-8 workers, including unavailable workers. Locality-centroid distance is labelled approximate; do not pretend it is live GPS distance or road travel time. No map is needed.

### 3. Communication: voice and a clear quote

Customer sends a playable voice request. Worker listens and replies by recording or using large price presets plus +/- controls. Worker confirms an explicit quote with scope, labour charge, whether materials are excluded, and visit timing. Customer accepts that exact quote version. Keep audio available even if transcription fails. A simple message thread with polling is sufficient; no WebSocket system is necessary.

The agreement card is the memorable visual: job, place, time, price, materials policy and both confirmations. Do not let AI decide or silently change a price. Avoid an unbounded chatbot.

### 4. Booking: prove consistency

Accepting the quote must atomically confirm the booking and reserve the worker. Two customers racing for the same worker must produce exactly one active booking. The losing customer sees a clear unavailable response and can choose another worker. A refreshed second browser sees the same truth.

State: requested -> quoted -> confirmed -> in_progress -> completed. Cancellation is permitted before completion and releases the worker. Worker marks work done; customer confirms completion. Review creation is allowed only afterward. Available-for-search means worker opted in AND has no active confirmed/in-progress booking.

### 5. Trust: evidence after real completion

Customer chooses large satisfaction faces and optional punctuality/price-honoured buttons, then records a short review. Persist the completed job and review; show count, ratings and actual feedback to the next customer. One review per job. A new worker is clearly labelled new.

Optional AI review summary only after the core flow passes. Summaries may condense feedback but may never invent reliability, identity verification, qualifications or safety guarantees. Label seeded historical reviews as demo data. “Completed jobs on this demo” is defensible; “verified safe” is not.

## Visual direction

Warm ivory background, deep emerald actions, restrained amber accents, large human profile cards and generous spacing. Worker UI is mobile first with one major action per screen, 56px minimum touch targets as our design target, visible recording/playback states, icons plus labels, Urdu/English toggle and correct RTL layout. Urdu is the default worker experience; Roman Urdu can appear as support. Avoid dashboards full of tiny metrics and long English forms.

Customer navigation: Find -> Request -> Booking. Worker navigation: Availability -> Requests -> Current job. Every state needs loading, empty, error and retry feedback. Do not rely on colour alone.

## Implementation architecture

Recommended target: React + Vite + TypeScript, a small Node server, Supabase Postgres/Auth/Storage, and one server-side audio-capable AI provider. Use one repository and one deployable server serving the built frontend. Use ordinary polling for updates. Choose the team's most familiar existing component library and keep dependencies small.

AI flow: browser recording -> authenticated server endpoint -> audio understanding and schema extraction -> server validation -> user confirmation -> database write. Validate audio MIME support with the actual demo browser first. Limit clip size and duration, handle timeout visibly, and keep provider credentials server-side. Verify Urdu quality with actual recordings before committing to a provider/model.

Gemini documents audio understanding and structured transcription; this establishes capability, not tested Urdu quality, account access, quota or latency. Pick a currently available model only after a successful smoke test. Do not spend the event comparing providers.

Database tables: profiles (session identity and role); worker_profiles (trade, area, experience, availability); jobs (customer, worker, task, state, agreed quote version); quotes (job, author, amount, scope, materials policy, version); messages (job, author, private audio reference, optional transcript); reviews (unique job, customer, worker, rating, tags, audio).

Transactions must lock the relevant worker row, validate job ownership and quote version, and check for active assignments before confirmation. Add a partial unique index on worker_id for confirmed/in_progress jobs as the final invariant. All job transitions are server-authorized; the AI cannot change booking state. Review author must be the completed job's customer. Private audio is visible only to job participants, with limited-duration access links. Public discovery exposes only public profile fields.

Apply row-level security to browser-accessible tables and storage. Never expose a database service key. Supabase database functions support data-intensive transactional logic; carefully restrict execution and authorize the caller. If cloud setup is still blocked at minute 20, switch decisively to the same app with local SQLite and server sessions; local demo is permitted. Do not maintain two backends.

## Five-hour build schedule

| Minutes | Deliverable | Hard exit condition |
|---|---|---|
| 0-20 | Lock scope, initialize app, database/session, test Urdu audio API | One real audio clip produces usable fields; database write/read works |
| 20-65 | Schema, seeds, role screens, booking transactions | Two sessions see one persisted request; duplicate reservation is rejected |
| 65-110 | Worker recording, extraction, spoken prompts, profile confirmation | New worker can onboard without typing and appear in discovery |
| 110-155 | Customer request, filtered worker list, audio messages and quote | Customer and worker exchange playable audio and confirm an exact price |
| 155-195 | Booking, work completion, review and updated profile | Entire required journey works across two browsers |
| 195-225 | Mobile and Urdu polish, errors, reset and recovery | Phone-sized flow remains usable; refresh preserves state |
| 225-255 | Acceptance checks, deployment attempt if easy, README | Reliable local demo and complete disclosure exist |
| 255-280 | Rehearse twice, repair only blocking defects | Demo finishes within four minutes without explanation of broken features |
| 280-300 | Freeze, public repository check and submission | Submit with buffer before the actual official deadline |

If the official deadline is sooner, reserve the final 20 minutes and compress scope now. At minute 195, cut every optional feature if any required outcome is incomplete. At minute 255, stop adding features regardless of ambition.

## AI-assisted development workflow

Ask the coding assistant for small integrated slices with acceptance criteria, not a whole application in a single vague prompt. Build schema and state transitions first, then screens against that contract. Review each diff; run focused checks before the next slice. Human ownership: verify Urdu clarity, work through both roles, watch the deadline, and rehearse answers.

Implementation prompt: “Implement only the next milestone in BLUEPRINT.md. Preserve the five-outcome flow. Keep AI output untrusted until validated and confirmed. Keep booking transitions authoritative on the server. Add meaningful checks for concurrency and authorization. Report what works, what is simulated, and remaining blockers. Do not expand scope.”

Do not build: payment flows, CNIC verification, native apps, live GPS tracking, route maps, automated dispatch, bidding auctions, video calls, a general chatbot, elaborate admin analytics or model training. Photo-based diagnosis and dynamic text-to-speech are optional only after all five outcomes and rehearsal pass.

## Acceptance checklist

- A new worker finishes onboarding without reading a paragraph or typing; rejected microphone permission has a visible retry and icon-based fallback.
- Ambiguous Urdu produces a correction prompt rather than fabricated profile facts.
- Discovery excludes busy, offline, wrong-trade and out-of-area workers.
- Audio is playable on the actual phone/browser; the recipient receives the message after refresh/poll.
- A quote change invalidates acceptance of the old version.
- Two competing accept operations yield one booking; repeated acceptance is idempotent.
- Another user cannot change someone else's quote, job or review, or access private audio.
- Completion/cancellation releases availability correctly; reviews cannot be duplicated or submitted before completion.
- AI failure leaves audio playback and manual icon/price choices usable. Disclose a fallback during the demo rather than pretending AI succeeded.
- Restart/refresh preserves data. Reset script affects demo records only and runs before rehearsal, never unexpectedly during a presentation.

## Four-minute demonstration

0:00-0:20: “Most marketplaces ask a worker to fill a form. Our first interaction is a conversation in their own language.” Show the worker phone view.

0:20-1:00: Speak a fresh Urdu introduction, show extracted confirmation cards, confirm and go available. Highlight that the words were genuinely processed live.

1:00-1:40: In the customer browser, describe the leaking tap; show the worker among nearby available matches and explain the match using visible evidence.

1:40-2:30: Send the voice request, listen as worker, quote Rs 800 labour with materials excluded, accept as customer. Show the agreement card and that the worker disappears from another customer's available list.

2:30-3:20: Start/finish job, customer confirms, records review, and show the updated worker evidence available to the next customer.

3:20-4:00: Explain transactional booking, what AI removes, and what is seeded. Close: “A spoken skill became a booked job, and that job became evidence for the next household.”

If asked what fails without AI: natural Urdu cannot automatically become structured searchable skills or a structured job request; users must fall back to guided icons and human listening. AI removes the interpretation and typing burden. Booking and payments are never controlled by model guesses.

If asked about verification: reputation here comes from completed jobs and attributable reviews; government identity checks are out of scope. If asked about scalability: this is a narrow urban demonstration, not evidence of real-world adoption or measured production scale.

## Submission pack

README: purpose, setup/env template, stack, schema and flow, AI provider/model and coding assistant disclosures, credited libraries, seed/reset instructions, demo roles, known limits and simulation list. Include local startup steps and deployed URL if achieved. Never commit real credentials. Keep a short backup screen recording labelled as a recording; it supplements rather than replaces a live demonstration.

Source brief: C:/Users/hhuss/OneDrive/Desktop/Roshan_Rozgar_Problem_Statement.pdf.

Technical references checked for planning:
- https://ai.google.dev/gemini-api/docs/audio
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/database/postgres/row-level-security

These references establish available mechanisms. Runtime compatibility, provider access, Urdu quality and deployment remain implementation-time checks.
