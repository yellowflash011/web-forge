# Browser service contract v1 — proposed freeze before Batch 1

UI import boundary: `lib/api/index.js`. Machine B owns this file and its implementation. Machine A imports named functions from it and never imports database tables or provider SDKs into individual screen components. A can develop an explicit demo adapter in lib/demo while B's real calls are not ready. Do not change a call from stub to live without labelling its current capability.

This contract specializes COMPLETE_APP_BLUEPRINT.md for the two-machine build. It defines normalized JavaScript objects independent of database column names. B maps snake_case rows to camelCase at the boundary. Use JSDoc or adjacent .d.ts types if helpful; a full conversion of the existing JSX app to TypeScript is not a prerequisite.

## Conventions

- Every function is async and resolves `{ data, error }`. Success has `error: null`; data is the documented shape (`getSession` may return null when signed out). Failure has `data: null` and an error `{ code, message, retryable }`. Catch transport/provider exceptions at the boundary. UI displays understandable messages, never raw SQL errors.
- UUID strings for IDs, ISO 8601 UTC timestamps from the server. UI formats local times. `null` means unknown; zero is a real value. PKR integer minor units: Rs 800 = 80000. UI formats with an agreed helper, not model text.
- Each mutation receives `idempotencyKey` generated once per user intent and reused on retries. State mutations additionally receive `expectedVersion`. New intent gets a new key.
- Missing session returns UNAUTHENTICATED. Caller ownership is inferred from verified auth, never a browser-supplied customer/worker ID.
- Codes: UNAUTHENTICATED, FORBIDDEN, VALIDATION_ERROR, NOT_FOUND, INVALID_TRANSITION, QUOTE_STALE, WORKER_UNAVAILABLE, VERSION_CONFLICT, RATE_LIMITED, UPLOAD_FAILED, AI_UNAVAILABLE, NETWORK_ERROR.
- Immediate jobs only. Coarse locality IDs are controlled strings such as `g-10-islamabad`. Trades: `plumber`, `electrician`. Display labels are localized by A.

## Normalized entities

Session: `{ userId, isAnonymous, displayName, hasWorkerProfile }`. Having a worker profile does not remove customer capabilities. Role switch is UI state only.

Worker: `{ id, ownerUserId, name, tradeIds, localityId, serviceAreaIds, bio, yearsExperience, avatarUrl, availabilityOptIn, availabilityExpiresAt, isAvailableNow, approximateDistanceKm, completedJobCount, reviewCount, averageRating, isDemo }`. Public shape excludes private contact/address. Nullable avatar/distance/experience/rating require proper UI. `isAvailableNow` incorporates active-assignment exclusion and expiry.

Job: `{ id, customerId, workerId, tradeId, localityId, task, pricingPath, state, version, latestQuote, acceptedAgreement, createdAt, updatedAt, isDemo }`. pricingPath is `fixed` or `inspection`. Private address details are a separately authorized read, not embedded in public worker discovery.

Quote: `{ id, jobId, version, purpose, scope, currency, labourMinor, visitFeeMinor, visitFeeCredited, materialsPolicy, expiresAt, supersededAt }`. purpose is `fixed_job`, `inspection_visit` or `repair_after_inspection`. materialsPolicy is `excluded_approval_required` for this build. Accepted agreement includes an immutable quote snapshot plus acceptedAt. Backend supplies deterministic total fields where needed; both owners agree on fee-credit arithmetic before using it.

Message: `{ id, jobId, senderId, kind, text, audioRef, transcript, createdAt }`. kind is text/audio. An audioRef is an opaque private reference; request a fresh playback URL rather than persisting expiring signed links as canonical message data.

Review: `{ id, jobId, workerId, authorId, rating, punctuality, priceHonoured, text, createdAt, isDemo }`. rating 1–5; tags nullable when unknown. One review per eligible completed job.

## Calls

| Function | Input | Successful data |
|---|---|---|
| ensureSession | none; requires existing registered user session | Session |
| getSession | none | Session or null |
| getMyWorkerProfile | none; authenticated registered caller only | Worker or null if no worker profile |
| signOut | none | `{ signedOut: true }` |
| register / signUp | `{ email, password, displayName, redirectTo? }` | `{ user: Session, sessionConfirmed: boolean, confirmationRequired: boolean, message: string }` |
| signIn / signInWithPassword | `{ email, password }` | Session |
| requestPasswordReset / resetPasswordForEmail | `{ email, redirectTo? }` | `{ sent: boolean, message: string }` |
| resetPassword / updatePassword | `{ newPassword }` | `{ updated: boolean, message: string }` |
| saveWorkerProfile | `{ fields: { name, tradeIds, localityId, serviceAreaIds, yearsExperience, bio }, idempotencyKey }` | Worker |
| getWorker | `{ workerId }` | `{ worker, reviews: Review[] }` |
| listWorkers | `{ tradeId?, localityId, query?, sort: 'recommended' or 'nearest', limit: 3..20 }` | `{ items: Worker[], hasMore: boolean }` |
| setAvailability | `{ available, idempotencyKey }` | Worker |
| createRequest | `{ workerId, tradeId, localityId, task, pricingPath, audioRef?, idempotencyKey }` | Job |
| listMyJobs | `{ workspace: 'customer' or 'worker' }` | `{ items: Job[] }` |
| getJob | `{ jobId }` | `{ job: Job, allowedActions: string[] }` |
| listMessages | `{ jobId, afterCreatedAt?, afterId?, limit? }` | `{ items: Message[], hasMore: boolean }` |
| sendMessage | `{ jobId, kind, text?, audioRef?, idempotencyKey }` | Message |
| issueQuote | `{ jobId, expectedVersion, quoteFields, idempotencyKey }` | Job |
| acceptQuote | `{ jobId, quoteId, expectedVersion, idempotencyKey }` | Job |
| transitionJob | `{ jobId, action, expectedVersion, reason?, idempotencyKey }` | Job |
| submitReview | `{ jobId, rating, punctuality?, priceHonoured?, text?, idempotencyKey }` | `{ review: Review, worker: Worker }` |
| reportIssue | `{ jobId, reason, expectedVersion, idempotencyKey }` | Job |
| uploadAudio | `{ blob, purpose: 'onboarding' or 'request' or 'message', jobId?, idempotencyKey }` | `{ audioRef, durationSeconds? }` |
| getAudioPlaybackUrl | `{ audioRef }` | `{ url, expiresAt }` |
| extractVoice | `{ audioRef, purpose: 'worker_profile' or 'job_request', locale: 'ur' or 'en' }` | `{ transcript, fields, missingFields: string[], ambiguities: string[] }` |

quoteFields uses the Quote fields above excluding IDs, author-controlled versions and server timestamps. `fields` from extractVoice are suggestions only: worker-profile keys match saveWorkerProfile; job-request keys are tradeId/localityId/task. No ownership, rating, availability, price or state fields may be accepted from model output.

Message pagination uses a stable `(createdAt,id)` cursor to avoid skipping messages sharing a timestamp. Refresh/poll reads canonical state. Supabase project configuration errors must not silently switch a real user into fixtures.

## State and action vocabulary

States: `requested`, `discussing`, `quoted`, `confirmed`, `visiting`, `awaiting_repair_approval`, `in_progress`, `awaiting_completion`, `completed`, `visit_done`, `declined`, `expired`, `cancelled`, `issue_open`.

Actions: `respond` (worker), `decline` (worker), `start_visit` (worker, inspection booking), `start_work` (worker, fixed booking), `mark_work_done` (worker), `confirm_completion` (customer), `decline_repair` (customer), `cancel` (eligible participant), `release_assignment` (worker in an unresolved physical-assignment case). Quote issuance, acceptance, review and issue reporting use their dedicated calls. A shows controls from allowedActions; B rechecks permissions regardless of what the UI shows.

Atomic acceptQuote acquires the single active immediate-worker assignment. Repair quote acceptance keeps the existing assignment; it must not conflict with the same job's own reservation. On awaiting_completion, the physical assignment is released, while the job's outcome awaits customer confirmation. An issue does not silently count as successful work or authorize a review. Exact transitions follow the complete blueprint, with B supplying executable authorization checks.

## Integration handshake

B1 delivers usable session/profile/discovery calls. B2 delivers request/message/quote calls. B3 delivers acceptance/transitions/review. B4 delivers audio extraction. During incremental development an undelivered call must return an explicit unavailable/error state rather than a fabricated success. A records which real calls are connected at each checkpoint.

Once both machines agree, mark this document frozen and record the baseline SHA. Any ambiguity blocking money, authorization or state changes must be resolved before coding that operation; do not invent different answers independently.
