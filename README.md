# Roshan Rozgar — Next.js design prototype

## Completed quote, job-action and review frontend

The job workspace now includes the worker quote editor, exact-quote customer consent, role-specific transitions, completion, cancellation/issue reporting and completed-job reviews. These use the real API facade in live mode; the backend remains authoritative. Local demo mode still explicitly fails undelivered operations instead of fabricating a successful booking or review.

`npm test` runs 23 local checks. `npm run test:ui` runs 6 interactive component journeys using jsdom and a role-scoped in-memory test adapter, including fixed-price and inspection flows, stale consent, duplicate-intent retry and reviews. These checks were run on Node 24 and do not establish hosted readiness. The tests also generate ignored HTML fixtures for visual inspection; the optional `node tests/ui/evidence-server.mjs` serves only those fixtures on localhost:3010 and is not part of the application deployment.

Machine B's hosted B5 verification remains independent. The submitted `/design/` reference and Figma export assets remain preserved. See coordination/status-A.md for the latest handoff, pricing semantics and remaining acceptance checks. Older checkpoint notes below are historical.

## Backend integration repair checkpoint

Machine B's backend is merged on `implementation/frontend`. The real service facade is connected at the frontend boundary and defaults to live mode. Use `NEXT_PUBLIC_APP_MODE=demo` explicitly for local fixture work; live setup/network failures never silently select fixtures. The root app supports either Supabase publishable-key or legacy anon-key environment names. See `.env.example` and `docs/backend/INTEGRATION_REPAIR.md`.

Migrations through 00004 and deployment/configuration of the authenticated `extract-voice` Edge Function are required for live use. Provider keys belong only in function secrets. Real hosted acceptance is still B5 work: see `coordination/MACHINE_B_NEXT_TASK.md`. Current local verification does not prove deployment, real Urdu quality or simultaneous hosted booking behavior. Quote/action/review UI integration remains the next frontend batch.

The earlier checkpoint below describes the prior fixture-only state and is retained as history.

## Current implementation checkpoint — Machine A

The root app now uses a modular frontend with explicit local demo services. The submitted design remains at `/design/` and the existing HTML exports are preserved. See `coordination/status-A.md` for connected calls, verification and the B1 integration requirement.

Working locally: guest session/signout, confirmed worker-profile creation/editing, service areas, availability with expiry, filtered discovery, public profiles, saved IDs, request creation and text conversations. Local demo records persist across refresh in this browser only. Booking confirmation, worker/customer cross-device messages, quote operations, real authentication, AI and database authorization await Machine B. Demo operations must not be presented as real services.

Frontend service seam: `features/marketplace/services.js`. Backend ownership remains `lib/api/`, `lib/supabase/` and `supabase/`; these directories were not created or edited by Machine A. Build and development caches are separated to avoid breaking the running preview during production builds.

Run the focused fixture-contract checks with `node --test tests/ui/demo-contract.test.mjs`. They test local UI development fixtures, not real Supabase permissions or concurrency.

A responsive frontend design for a voice-first neighbourhood trade marketplace. Built with Next.js App Router, React and Lucide icons. No Supabase or AI service is connected yet.

## Open locally

```sh
npm install
npm run dev
```

Open http://localhost:3000 for the interactive prototype. Open http://localhost:3000/design/ for all five screen compositions in one page.

## HTML to Figma

```sh
npm run build
npm run export:figma
```

- `exports/roshan-rozgar-design.html` is a standalone static collection with embedded CSS and profile images. It has no React runtime or working controls; use it for file-based HTML import, if your chosen plugin supports it. Google Fonts still needs internet.
- After exporting, `http://localhost:3000/figma-design.html` previews this same standalone file through the development server.
- `out/index.html` and `out/design/index.html` are the Next.js static export. Serve the entire `out` directory over HTTP; keep `_next` and `images` alongside the pages. Do not open individual exported Next.js HTML files with `file://` and expect asset paths to resolve.
- For URL/browser-based import, capture `http://localhost:3000` or `/design/` with your HTML-to-Figma plugin. Some cloud URL importers cannot reach localhost; use the plugin's current-browser capture or host `out` on a static host.
- Suggested capture widths: 1440 desktop and 390 mobile. Wait for fonts and images to finish loading. Inspect the imported layers, fonts, SVG icons and Auto Layout; conversion fidelity depends on the plugin and has not been tested in Figma.

## Included interactions

Category and text filters, locality selection, saved workers, profile navigation, sample quote acceptance/completion/review, local audio recording/playback, messages in session, worker availability switch and a guided onboarding preview. These are design-session interactions and reset on reload. Demo bookings are not cross-user reservations. No real OTP, AI extraction, speech synthesis, messaging backend, payments, identity verification or profile publication is present. Urdu greeting and sample content exist; full translation is pending. Microphone capture requires permission plus HTTPS or localhost.

## Assets and disclosure

All worker names, experience, reviews, jobs and conversation text are illustrative. Portrait photos are downloaded from Unsplash and depict illustrative people, not the named workers. Image sources:
- https://images.unsplash.com/photo-1560250097-0b93528c311a
- https://images.unsplash.com/photo-1500648767791-00dcc994a43e
- https://images.unsplash.com/photo-1506794778202-cad84cf45f1d

Fonts: DM Sans, Manrope and Noto Sans Arabic via Google Fonts. Icons: Lucide (ISC license). Dependencies retain their respective licenses. AI coding assistance: OpenAI Codex. No runtime AI service used in this prototype.

See COMPLETE_APP_BLUEPRINT.md for the planned connected backend and business logic. Its earlier Vite proposal is superseded by the user's choice of Next.js in this implementation. Static export is for the design delivery; adding server routes later requires changing the export configuration or keeping privileged operations in external functions.

## Existing partner starter

The existing Next.js/Supabase starter is preserved under web-forge-project/. Its Supabase dependencies are also retained in the root package. The root app is the design prototype; no backend connection is claimed. Installed node_modules and local environment configuration are excluded from source tracking.

