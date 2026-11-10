# Roshan Rozgar

A Next.js App Router marketplace for finding nearby professionals, agreeing quotes, and managing local jobs. The root application is in this directory; `web-forge-project/` is the preserved partner starter.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. For a production server:

```sh
npm run build
npm start
```

The application requires a Next.js server or a compatible Next.js host. Dynamic profile/job routes replace the earlier static export. Do not deploy the old `out/` folder as the application.

## Pages and navigation

| URL | Next.js page |
| --- | --- |
| `/` | `app/page.jsx` |
| `/profile/:workerId/` | `app/profile/[workerId]/page.jsx` |
| `/jobs/` | `app/jobs/page.jsx` |
| `/jobs/:jobId/` | `app/jobs/[jobId]/page.jsx` |
| `/worker/` | `app/worker/page.jsx` |
| `/worker/profile/` | `app/worker/profile/page.jsx` |
| `/onboarding/worker/` | `app/onboarding/worker/page.jsx` |
| `/account/` | `app/account/page.jsx` |
| `/saved/` | `app/saved/page.jsx` |
| `/design/` | `app/design/page.jsx` |

`/profile/` redirects to `/account/`. Malformed record IDs return 404. Pages use Next.js links and navigation; the hash router and its monolithic screen switch are removed. Client-side views live in `features/marketplace/`, with shared components in `components/marketplace/`.

The root provider preserves session identity, neighbourhood, search filters, saved IDs, and per-professional request drafts across navigation. Saved IDs and neighbourhood persist on this device; unsent drafts remain in memory until submission or signout. Direct links and refresh restore identity through the service facade. Job content remains subject to backend authorization.

## Workflows and service mode

Discovery, saved workers, public profiles, guest sessions, confirmed worker onboarding/editing, availability, request creation, conversations, audio recording/playback, quote editing, exact-quote consent, job actions, and completed-job reviews retain the shared design and API boundary.

`features/marketplace/services.js` selects the real Supabase facade by default. Copy `.env.example` into `.env.local` and configure the public URL/key. Explicit local fixtures require `NEXT_PUBLIC_APP_MODE=demo`; live failures never silently select fixtures. Demo data persists only in that browser and unsupported backend operations fail explicitly.

Live use requires the migrations and authenticated `extract-voice` deployment described in `docs/backend/INTEGRATION_REPAIR.md`. Hosted auth, Storage, AI, and booking concurrency remain Machine B's B5 acceptance work. Local checks do not establish hosted readiness. Provider secrets belong only in Edge Function secrets.

## Verification

```sh
npm test
npm run test:ui
npm run build
```

The first command runs 23 domain, facade, voice-boundary, local PostgreSQL, demo-contract and job-policy checks. The UI suite runs six interactive component journeys: fixed-price completion/review, stale consent, inspection/repair approval, issue reporting, lost-response quote retry and cancellation. Its role-scoped in-memory adapter is separate from real Supabase.

Routing was also checked in a browser using an isolated explicit demo process: profile links, back/forward, retained filters/saves/drafts, request creation, message persistence after refresh, worker creation/editing, and denied signed-out job access. Desktop (1440px) and phone (390px) screenshots are in `tests/ui/evidence/`. See `coordination/status-A.md` for the current handoff and limitations.

## HTML to Figma

```sh
npm run build
npm run export:figma
```

`/design/` retains the submitted five-screen collection. The export script reads the prerendered design page from the current production build and writes `exports/roshan-rozgar-design.html` and `public/figma-design.html`. It embeds CSS and profile images and removes runtime scripts. Google Fonts still needs internet. This standalone design file remains available independently of the dynamic application.

For browser-based capture, open `/design/` or `/figma-design.html` through the development server. Suggested widths are 1440 and 390. Inspect fonts, layers, icons and Auto Layout after conversion; Figma importer fidelity has not been verified here.

## Assets and disclosure

Demo identities, history, jobs and reviews are illustrative. Unsplash portraits depict illustrative people, not the named workers:

- https://images.unsplash.com/photo-1560250097-0b93528c311a
- https://images.unsplash.com/photo-1500648767791-00dcc994a43e
- https://images.unsplash.com/photo-1506794778202-cad84cf45f1d

Fonts: DM Sans, Manrope and Noto Sans Arabic via Google Fonts. Icons: Lucide (ISC). Dependencies retain their licenses. AI coding assistance: OpenAI Codex. Runtime voice extraction requires the separately configured backend service. Microphone capture requires permission and HTTPS or localhost.
