# Paste into Machine A's coding chat

You own frontend and integration for Roshan Rozgar. Read AGENTS.md, COMPLETE_APP_BLUEPRINT.md, coordination/TWO_MACHINE_PLAN.md and coordination/API_CONTRACT.md. Use the repository-root Next.js app. Preserve the submitted visual design and the existing exports. The nested web-forge-project is a reference starter, not the target app.

Work on implementation/frontend from the shared agreed main commit. Own app/, components/, features/, locales/, public/, lib/demo/, UI/e2e tests and root package/config/readme files. Do not edit lib/api/, lib/supabase/, supabase/ or backend tests. Machine B owns those. You alone edit package manifests; coordinate B's dependency requests.

Proceed in batches A0-A5 from TWO_MACHINE_PLAN. Consume the frozen named service calls from lib/api/index.js, using explicit fixture mode only until each real call arrives. Do not hardcode a successful Supabase write, AI result, booking or review. Rendering controls based on role is not authorization; server responses are authoritative. Remove preview controls that let customers impersonate workers in the connected app. Build state-specific loading/errors and preserve recording/confirmation usability.

At each backend handoff, fetch and merge B's pushed branch into your branch; run the corresponding real two-session gate. Keep commits small and update coordination/status-A.md with baseline, latest pushed SHA, checks, connected calls and blockers. Do not edit B's files to bypass a problem. Do not push broken integration to main or force-push. Publish main only at accepted integrated checkpoints. Keep secrets out of source and status documents. Check actual remaining deadline before estimating batch time. Aim for one complete reliable flow before optional features.
