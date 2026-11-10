# Two-machine implementation plan

Purpose: turn the submitted design prototype into one connected Next.js application. This is a work allocation and integration contract, not completed implementation. Time blocks are estimates from the next joint kickoff; calculate the actual remaining competition time first. Two machines improve throughput but do not guarantee a 2x reduction in total time.

## 1. One product, two owners

Use the repository ROOT application: `app/`, root `package.json`, root Next config. `web-forge-project/` is a preserved starter; neither machine develops a separate product inside it. Consult it as reference only. Preserve the submitted visual direction and existing Figma exports.

Machine A is the UI and integration owner. Machine B is the backend and AI owner. Divide by files and service contracts, not customer versus worker: both roles need the same jobs, auth and messages.

| Area | Machine A | Machine B |
|---|---|---|
| Next.js pages, components, CSS, navigation | Owns | Does not edit |
| Onboarding, discovery, job workspace, worker workspace | Owns rendering and interactions | Supplies data and authorized operations |
| Client service interface | Consumes; implements explicit demo adapter if needed | Owns real adapter and boundary |
| Supabase Auth, database, storage, RLS | Uses returned session/data | Owns |
| Quote totals, booking transactions, allowed states | Displays server results | Owns authoritative rules |
| Voice | Owns recording, playback, confirmation UX | Owns upload, AI extraction, authorization |
| Integration and final app build | Owns final merge/build | Supplies evidence and fixes backend failures |
| Final two-browser acceptance | Runs customer session | Runs worker session and backend checks |

## 2. File ownership: do not overlap

### Machine A

- `app/**`, including splitting the current large `app/ui.jsx` into maintainable screen components.
- `components/**`, `features/**`, `locales/**`, `public/**` (excluding any agreed backend-generated files).
- `lib/demo/**` for an explicitly labelled demo adapter only.
- `tests/ui/**` and `tests/e2e/**`.
- Root `package.json`, `package-lock.json`, `next.config.mjs`, `README.md`, `.gitignore` and export scripts.
- `coordination/status-A.md`.

### Machine B

- `lib/api/**`: browser-safe service facade and normalized results.
- `lib/supabase/**`: browser client and session integration.
- `supabase/migrations/**`, `supabase/functions/**`, `supabase/seed.sql`.
- `tests/backend/**`, `docs/backend/**`, `.env.example` with placeholders only.
- `coordination/status-B.md`.

### Shared contract

`coordination/API_CONTRACT.md` is frozen v1 before the first code batch. Machine A is the file editor; B proposes changes in its status file or in a direct team message. Additive changes are preferable; a breaking change must be acknowledged by both people before implementation. Machines never edit the other owner's files to fix an integration problem: describe the issue and let the owner patch it.

Dependency rule: B requests new packages by exact name and version/range in status-B; A alone changes package manifests and lockfile. Supabase client dependencies are already present. B may use a disposable local development setup for Edge Functions but must not commit conflicting root manifests.

## 3. Git flow

Before either starts: both fetch and start from the SAME agreed commit. Record it in status-A/status-B. At plan creation the local main was aligned with origin/main; check again rather than assuming it stays so.

On Machine A, after committing/publishing these coordination documents to main:
```
git fetch origin
git switch -c implementation/frontend origin/main
```

On Machine B:
```
git fetch origin
git switch -c implementation/backend origin/main
```

Use separate clones on separate machines. Each pushes ONLY its own branch. A integrates completed backend batches into its frontend branch at checkpoints; main remains the last accepted integrated build. Do not force-push, rewrite shared commits or have both machines push to main. Never copy whole directories over each other.

B handoff: commit a coherent batch and push `implementation/backend`; report commit SHA, migration order, implemented service calls, tested operations and blockers. A fetches and merges `origin/implementation/backend` into `implementation/frontend`. Because ownership is disjoint, conflicts should be exceptional. Do not resolve a conflict by blindly taking one entire version.

After a checkpoint passes, A can fast-forward/merge the accepted integrated frontend branch into main and push. B merges updated origin/main into its own branch before the next batch to keep a shared baseline. Do not rebase already-shared branch history. Coordinate the exact checkpoint SHA before either resumes dependent work.

If there are concurrent uncommitted changes, commit or isolate them before switching branches. Do not reset or stash someone else's work as a shortcut.

## 4. Batches and integration gates

### Batch 0 — lock the seam, 15 minutes

Both: agree root app, branch baseline, function names and returned shapes in API_CONTRACT. Confirm remaining deadline and that both machines use the SAME Supabase project for shared integration.

A: establish the API import location, preserve the submitted layout, split only enough to connect screens safely. Define loading/error UX and provide demo mode as an explicit UI indicator.

B: verify project configuration and auth settings, publish environment variable NAMES and schema plan, verify AI provider access with an actual Urdu sample. Configure secrets securely; no keys in status documents. Only B applies schema migrations to the shared database.

Exit: both can explain the same session, job and quote shapes. If project access is blocked, surface it now; do not burn two hours building against incompatible assumptions.

### Batch 1 — identity, worker profile and discovery, 45 minutes

A1: bind session state, add usable guest/auth entry, connect editable worker onboarding fields, worker profile display, discovery loading/empty states and availability control. Keep captured audio available even before AI is ready. Do not pretend sample fields are extracted.

B1: create schema foundation, anonymous authenticated sessions (if enabled), profile upsert, controlled trades/localities, availability expiry, public worker search and safe profile projection. Add RLS and clearly labelled seed data. Deliver ensureSession, saveWorkerProfile, getWorker, listWorkers, setAvailability and listMyJobs stub shape returning a real empty array when appropriate.

Gate 1: Machine B creates a worker from one session; Machine A sees that worker on another device, refreshes without losing the profile, and cannot change it as an unrelated account. Correctly scoped empty results are acceptable; hardcoded fake successful persistence is not.

### Batch 2 — requests, conversations and quotes, 45 minutes

A2: connect request creation, worker inbox, job workspace, participant-aware controls, message send/playback, amount/scope quote editor and conflict/error states. Fixed-price and inspection quote labels must be clear. Remove the customer button that impersonates a worker completing work.

B2: implement owned requests, participant-only job reads, text messages, authorized private audio upload and playback links, worker inbox, versioned quotes and server-calculated price display fields. Add request/quote expiry and idempotency support.

Gate 2: customer on A sends a request; worker on B sees it and replies; customer receives it after polling/refocus. A real quote created by B appears on A with the same immutable ID/version and price. An unrelated third session cannot read the conversation or audio.

### Batch 3 — authoritative booking, completion and trust, 45 minutes

A3: bind acceptance, progress timeline, inspection approval, completion confirmation, cancellation/issue UX and completed-job review. Reconcile UI from returned server state; never claim a successful booking optimistically.

B3: atomic quote acceptance and assignment lock, stale-quote/conflicting-worker rejection, allowed state transitions, inspection/repair quote sequence, completion and issue persistence, one eligible review per completed job. Return refreshed entities after each operation. Restrict direct status/quote changes in RLS/grants so RPC rules cannot be bypassed.

Gate 3: two customers race for one worker; exactly one books. Customer cannot invoke worker-only actions. Fixed-price journey completes across two real sessions; review persists and updates the public evidence. Inspection scenario agrees visit fee first and requires approval of repair price before repair work.

### Batch 4 — real AI and usable Urdu, 35 minutes

A4: connect recording -> upload -> extraction -> field confirmation. Make correction/re-record, denied microphone, failed upload and slow AI states understandable. Add short Urdu strings/prompts for primary worker actions. Never publish extracted fields without confirmation.

B4: deliver authenticated audio extraction Edge Function and validated response schema; handle Urdu/Roman Urdu, ambiguous/missing fields, rate limits and provider errors. AI cannot mutate jobs or agreements. Keep upload access private and delete/expire abandoned files under the documented policy.

Gate 4: live Urdu profile recording produces real suggestions, worker corrects/confirms, publishes and becomes discoverable. Customer voice request produces a confirmed trade/task/location. Remove a provider key in a test setup or simulate a provider failure explicitly: audio/manual alternatives still work and no cached fake AI result appears.

AI access smoke test belongs in Batch 0. B may prepare its independent function while earlier batches are under UI integration, but business-state delivery must not be delayed for optional AI features.

### Batch 5 — joint acceptance and submission, at least 40 minutes

A5: production build, mobile layouts, role/session checks, refreshed pages, README/setup/disclosures and final deployment/local launch. Final export regeneration only if required; Figma is already submitted.

B5: authorization, concurrency, migration repeatability, private-object checks, actual deployed function/environment validation and seed/reset instructions. Never reset a shared database while A is rehearsing.

Together: run the complete five-outcome journey twice in independent browser contexts, then rehearse within four minutes. Show what is live and what remains simulated. Freeze feature additions before the final rehearsal and submit before the actual deadline.

These estimates total about 225 minutes including checkpoint work. Keep additional time as buffer; if less time remains, reduce Tier B scope and optional polish immediately rather than shortening security checks or the final rehearsal.

## 5. Critical cut rules

- Keep identity, onboarding, discovery, communication, booking and trust. Cut richer dashboards, saved-worker persistence, realtime, maps, attachments other than audio, analytics and SMS setup if not already configured.
- Use polling with visibility/refocus refresh first. Do not let websocket setup block communication.
- Keep one connected backend. A visibly labelled fixture adapter supports design work but does not pass a real integration gate.
- No last-minute switch from root app to nested starter, no rewrite of the visual system, no new state enum in a screen component.
- If a contract issue blocks either machine for more than 10 minutes, contact the other owner with function name, expected/actual response, exact error and relevant commit; omit secrets and private recordings.

## 6. Status format

Each owner updates ONLY their status file at the end of a batch:
```
Baseline SHA:
Batch:
Latest pushed SHA:
Ready calls/screens:
Checks actually run:
Migration required (B only):
Dependencies requested:
Blockers / contract proposals:
Next batch:
```

Status files are asynchronous handoffs, not a replacement for confirming that the other machine has fetched the right commit. B owns the shared database; A owns final integration and deployment. This is the coordination rule that prevents both code conflicts and shared-environment surprises.
