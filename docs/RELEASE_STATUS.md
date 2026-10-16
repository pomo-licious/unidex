# Unidex admissions revamp — release handoff

Prepared 16 October 2026. This is an engineering handoff, not product-facing copy.

## Source and rollback

- Baseline: `2ca018a9045bd64db2089a2d0b73eac2d4c962fe`.
- Working branch: `codex/unidex-admissions-revamp`.
- Earlier committed revamp source: `5903797` (`Keep newer auth events ahead of initial session lookup`); the OpenAI provider changes require the release owner’s final source revision.
- Revamp worktree: `/workspace/repos/unidex-revamp`.
- Original checkout `/workspace/repos/unidex-original` remains unchanged.
- Baseline archive: `/workspace/scratch/b5c56afea89d/unidex-before-revamp-20261016.tar.gz`.

## Release state

| Area | State at handoff |
| --- | --- |
| Frontend | Premium redesign and admissions workspace implemented. The updated OpenAI/variance-review private build is published at https://unidex-experience.purpleamber128.chatgpt.site. Original production domain unchanged. |
| Backend migration | `supabase/migrations/20261016_admissions_workspace.sql` applied successfully to the existing project. Six new tables have RLS; the document bucket is private with a 10 MB limit. |
| New Edge Functions | OpenAI-based `admissions-ocr` deployed successfully: active version 2, platform JWT validation enabled. `OPENAI_OCR_ENABLED` defaults off; its hosted enabled flag and new OpenAI key are not set. `admissions-delete-account` is active, version 1, with platform JWT validation enabled; anonymous invocation returns 401. Preserve existing functions. |
| OpenAI account/API | A new key named `Unidex OCR` was created securely in Personal / Default and saved in ignored `.env.local`. `GET /v1/models` returned 200. One synthetic-PDF Responses test returned HTTP 429, `credit_balance_exhausted` / `insufficient_quota`; extraction did not complete. No retries or billing changes. |
| GitHub delivery | Owner installation for `pomo-licious` is now visible. Repository write verified by successfully creating `backup/pre-revamp-20261016` at the original baseline. Revamp publication is in progress. |
| Production frontend | Not claimed deployed. The user’s existing GitHub `main` workflow auto-deploys to Vercel; direct Vercel access is not required. Merge/push through the authorized repository path after access and checks are complete. |
| Google sign-in | Provider is disabled. Requires a Google OAuth client, Supabase Google-provider configuration and the correct authorized site origins/callback/redirect URLs. No live Google login verified. |
| Email/session flows | Implementation reviewed locally. The secure login flow returned declined; no live authenticated member journey or password-reset email round trip was verified. |
| Validation | Final OpenAI-provider checks: 151 tests across 9 suites, full ESLint, production build and diff whitespace check passed. The private preview refresh was published successfully. Built assets contain no OpenAI key. Anonymous profile access, submission and deletion requests returned 401. Browser and authenticated end-to-end checks remain unverified. |

Backend setup and test order: [ADMISSIONS_BACKEND_SETUP.md](ADMISSIONS_BACKEND_SETUP.md).

## Product and data boundaries

- The application builder saves an **internal Unidex submission receipt** and snapshots. It does not deliver an application to a college, establish acceptance, or pay institution fees. Final institution submission/payment remains on official college portals.
- The imported source contains **199 active programme records across 163 institutions**. Coverage, source dates, weak records and field-level qualifications are documented in [DELHI_NCR_CATALOGUE.md](DELHI_NCR_CATALOGUE.md). This is a researched inventory; it is not a claim that every programme, fee, cutoff, form or deadline was freshly verified.
- Last-drawn annual CTC is optional profile information. It is neutral in matching and is not an admissions eligibility gate.
- Uploaded documents are stored privately. The new document UI/API use OpenAI GPT with a per-document consent box that starts unchecked and must be checked for each request to send that specific file to OpenAI for suggested-field extraction. Approving selected fields for profile autofill is a separate action. The deployed extraction gate remains off; do not claim operational OCR availability or successful extraction.
- Do not replace actual backend failures with browser-only success messages. Do not use real account deletion as a smoke test.

## OCR provider decision and pending release checks

The earlier Gemini-based draft was blocked by automatic approval review because disclosure of private documents to Google Gemini was not explicitly authorized. That draft was not deployed. The user subsequently declined Gemini, chose GPT/OpenAI and approved provisioning a new OpenAI API key through the secure flow. This supersedes the earlier provider proposal; it does not authorize deploying the Gemini draft.

The new admissions OCR path and its per-document disclosure now use OpenAI GPT. Deployment of the new OpenAI-based `admissions-ocr` function succeeded (active version 2, platform JWT validation enabled), superseding the blocked Gemini proposal. Legacy Gemini functions remain untouched and are not the new workspace’s extraction route.

A new key named `Unidex OCR` was created through the approved secure flow in the Personal organization / Default project and saved only in ignored `.env.local`. No key value is included here. `GET /v1/models` returned HTTP 200. A single real Responses request with a synthetic PDF returned HTTP 429 with `credit_balance_exhausted` / `insufficient_quota`; it did not produce an extraction. No retry or billing change was made.

The hosted function has not received the new server-side key or `OPENAI_OCR_ENABLED=true`: the current Supabase connector cannot manage function environment secrets. The gate defaults off, so deployment is not operational enablement. Hosted secret/flag configuration, usable provider quota and authenticated end-to-end verification remain outstanding. Keep the gate off until configuration and release checks are complete. No live successful OpenAI extraction is claimed.

## Authentication follow-up

`src/pages/Login.jsx` contains reset-request and reset-password forms, backend error display, loading state and a `PASSWORD_RECOVERY` listener. Both `/forgot-password` and `/reset-password` are registered in `src/App.jsx`.

Before release, verify the deployed origin’s `/reset-password` and onboarding callbacks are allowed in Supabase Auth. Test a real reset email using a disposable account, a valid link, an expired link and a provider/network failure. The recovery page now reports expired/invalid callbacks, empty sessions, returned auth errors and rejected session lookups, and provides a new-link action. Forms remount for login/forgot/reset route changes. Four isolated SSR cases passed; a real email round trip remains unverified.

## Release owner’s completion record

- Migrations deployed: admissions workspace and legacy email-alias ownership fix. The existing alias helper now rejects anonymous callers and checks the authenticated student owner before any alias access; trusted service-role provisioning is retained.
- New functions deployed: OpenAI-based `admissions-ocr` active version 2 with JWT validation, hosted key/enable flag unset and gate off; `admissions-delete-account` active with JWT validation.
- Backend checks: all six new tables have RLS; private bucket verified; anonymous submission and service-only OCR lease execution denied. Three unauthenticated HTTP checks returned 401. Submission/OCR/deletion logic checked with mocks; no live user data or files were created/deleted. The separate direct synthetic-PDF OpenAI test was attempted once and failed for exhausted quota; no successful extraction or authenticated hosted OCR test.
- Final frontend checks: 151/151 Vitest tests across 9 suites, full ESLint, production build and diff whitespace check passed. The tests cover OpenAI handler safeguards, profile revision conflicts, empty/matching/variance autofill, record ambiguity/deduplication, stale targets and coherent CGPA scales. OpenAI key absent from built assets. Private preview publication succeeded with owner-only access retained.
- Desktop/mobile browser verification: unavailable in the managed environment; no browser installed or improvised preview started. Responsive layout and flow received SSR/contract checks only.
- GitHub repository write access: verified after owner installation; original baseline preserved remotely in `backup/pre-revamp-20261016`. Revamp source publication and production URL verification are in progress. Private review publication succeeded; owner-only audience retained.
- Google OAuth verification: pending provider setup.
- Authenticated end-to-end verification: pending an authorized test session.

## Latest review publication

The OpenAI/variance-review build was published successfully through Sites. Source commit: `22af11fd3fe8c655c09ecf4a1bfa53f5b7bb749b`. This private publication does not change the original GitHub repository or www.unidex.co.in. New provider extraction is not live until API credits and hosted secrets/enablement are configured.
