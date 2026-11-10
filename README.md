# Roshan Rozgar — Next.js design prototype

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
