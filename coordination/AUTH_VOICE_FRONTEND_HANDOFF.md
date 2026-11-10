# Registered accounts and voice — Machine A handoff

Machine A owns app/, features/marketplace/ and components/marketplace/. Machine B owns backend/auth enforcement, Supabase deployment and hosted acceptance. No credentials are stored here.

## Authentication integration

The frontend account adapter is features/marketplace/auth-service.js. It uses the existing getSupabaseBrowserClient singleton and Supabase SDK email/password operations; it creates no alternative session store. Domain identity still comes from services.getSession() and getMyWorkerProfile(). Expected Session remains {userId, displayName, isAnonymous:false, ...}. If B introduces facade auth methods, consolidate adapter calls here rather than rewriting the pages.

Routes:
- /auth/login/?next=INTERNAL_PATH
- /auth/register/?next=INTERNAL_PATH
- /auth/forgot-password/?next=INTERNAL_PATH
- /auth/reset-password/?next=INTERNAL_PATH
- /auth/callback/?next=INTERNAL_PATH

Register passes display_name in user metadata. Confirmation returns to /auth/callback/; recovery returns to /auth/reset-password/. B must configure approved redirect URLs for localhost and the deployed origin and verify actual email delivery/PKCE links. The frontend handles confirmation-required responses separately from active sessions. It does not store passwords.

MarketplaceShell hides app children until identity is restored and registered. Missing identity redirects to login with a validated internal return path. Anonymous identities are rejected, including legacy anonymous browser sessions. /design/ remains a public reference asset. This client guard is not backend authorization: B must reject anonymous users in RPC/RLS/Storage/functions and provide any required server session boundary. The frontend no longer calls ensureSession to create identities.

Auth state changes clear/remount private page state when identity changes. Same-user token refresh does not intentionally discard drafts. Identity restoration errors show retry/sign-in recovery rather than displaying stale private content.

## Voice integration

VoiceComposer calls uploadAudio({blob,purpose:'message',jobId,idempotencyKey}), then useJobWorkspace.mutate('sendMessage',{kind:'audio',audioRef}). Failed message sends retain the uploaded reference and mutation intent; retry does not upload a second copy. Recorder stop, discard, permission failure, empty recording and unmount cleanup are handled. Browser uploads cannot guarantee server-side idempotency after an upload response is lost; B should assess that separately if needed.

Customer request recording uses uploadAudio purpose:'request', then extractVoice({audioRef,purpose:'job_request',locale:'ur'}). An AI task suggestion requires an explicit 'Use suggested task' click. Existing task text is not overwritten. Audio remains attached if extraction fails. The final createRequest includes audioRef; the existing RPC inserts it as the first audio message. No new Job.audioRef field is required. B must verify participant playback of that initial message under hosted policies.

Worker voice extraction uses purpose:'worker_profile' and the selected language. Profile fields remain editable and require a separate confirmation/save. Pricing and job-state authority remain in existing backend operations. No payment integration was added.

## Language and verification limits

Urdu defaults on worker onboarding/workspace, with English selection and RTL. Key work actions and quote labels have Urdu alternatives and quote amount presets. Language selection persists on this device. Some secondary status/error text remains English; this is not a claim of complete application localization.

Spoken instructions use browser speech synthesis after a deliberate tap. If an Urdu voice is unavailable, the app reports that limitation instead of pretending to play Urdu. Guaranteed Urdu prompts on every device require recorded assets or an agreed deployed speech service; no fake recording is bundled.

Local verification: 25 policy/domain/contract/database checks, 14 interactive UI checks, production build and desktop/mobile auth browser checks. The UI tests use controlled adapters/recorders; they do not prove hosted auth, real phone recording/MIME compatibility, storage transfer or Gemini accuracy. B5 must verify these on the deployed stack using registered customer/worker/outsider accounts.
