# Admissions workspace backend

The admissions workspace uses the existing shared Supabase client and authenticated account. It does not depend on legacy `students` column names or replace existing college/application records. No production administrator, institution API, college delivery or payment integration is included.

## Verification status — 16 October 2026

The admissions migration is applied. The new OpenAI `admissions-ocr` endpoint is deployed as version 2 with JWT verification, an explicit server enable gate, and separate billing/rate-limit error handling. The newly authorized OpenAI key is saved locally, but has not been configured as a Supabase server secret. The connector exposes no secret setter.

An authenticated `GET /v1/models` returned HTTP 200. Exactly one synthetic, non-personal PDF request to the Responses API returned HTTP 429 with `error.code: credit_balance_exhausted` and `error.type: insufficient_quota`. This confirms a credit/quota blocker, not successful extraction. No API billing settings or credits were changed. Do not retry live extraction until API credits or spending allowance are addressed. Mocked handler tests cover the request/response flow; they do not override this live blocker. Credit/spending failures show a support/manual-entry message, while ordinary transient rate limits may suggest trying later. Neither condition triggers an automatic provider retry.

## Setup order

1. Apply `supabase/migrations/20261016_admissions_workspace.sql` to the intended Supabase project. It adds owner-scoped profile, document, draft, college plan and immutable submission tables; a server-only OCR request log; a private bucket; and submission/claim functions. It does not drop or migrate existing data, tables or policies. It is designed to run again without duplicate policies/triggers. If an existing bucket with the new name is public, setup stops rather than reusing it unsafely.
2. Configure the new Edge Function **`admissions-ocr`** from `supabase/functions/admissions-ocr/index.ts`. Keep JWT verification enabled. Set **`OPENAI_API_KEY`** and **`OPENAI_OCR_ENABLED=true`** in Supabase Edge Function server secrets. The explicit enable flag defaults to off and must be set only after the authorized key and provider setup are verified; a preexisting project secret alone cannot activate extraction. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are server runtime values. The optional `OPENAI_OCR_MODEL` defaults to the documented snapshot `gpt-5.4-mini-2026-03-17`; overrides must support Responses, image/PDF input and Structured Outputs. Never put the OpenAI or service-role key in frontend variables, source, screenshots or logs.
3. Deploy the new **`admissions-delete-account`** function from its matching source directory with JWT verification enabled. It requires the signed-in account's token and `{confirmation: 'DELETE'}`. It cleans the new private bucket, invokes existing `delete-account` with the same user's authorization to perform legacy/auth cleanup, independently verifies the user is gone and verifies final private cleanup. Only complete deletion returns `{ok:true}`; failures explicitly describe partial cleanup. Do not call this endpoint as a deployment smoke test on a real account.
4. Preserve the existing `ocr-extract`, `get-profile`, `profile-formfill`, `inbound-email` and `delete-account` deployed functions. The new flow calls `admissions-ocr`; it does not change the legacy OCR request contract.
5. The frontend needs the existing public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or compatible publishable browser key). Configure the intended deployment domain in Supabase Auth site/redirect URLs, and verify email confirmation callbacks. Authenticated workspace routes require an actual user session.
6. Deploy the matching frontend after the migration and new functions are ready. Missing migrations, failed uploads, expired sessions and provider failures show errors. They do not produce a local-only success state.

The new admissions flow uses **OpenAI GPT**, not Gemini. The legacy deployed `ocr-extract` remains unchanged for the old application. OpenAI API access requires a valid project key, model access and available quota; a ChatGPT subscription does not provision the Supabase server secret. A key saved locally in ignored `.env.local` is not automatically available to a hosted Supabase function. Configure the same authorized key securely in Supabase server secrets before expecting hosted extraction to work. The currently exposed Supabase connector does not provide a server-secret creation tool; deployment and secret provisioning must be completed through a supported secure channel. Never copy the key into function code or a public frontend environment variable.

The code sends PDFs as inline base64 `input_file` and supported images as base64 `input_image` to `POST /v1/responses`, with `store: false` and strict JSON-schema output. It does not upload persistent OpenAI Files or create an assistant/vector store. `store: false` disables response storage; it does not by itself promise zero provider retention. No live OpenAI request or billing change is performed by the setup instructions.

## Data and API contract

`src/lib/admissionsApi.js` exports:

| Function | Result |
|---|---|
| `loadAdmissionsProfile(expectedUserId?)` | Canonical profile JSON with `schema_version: 1`, or `null` |
| `loadAdmissionsProfileRecord(expectedUserId?)` | `{profile, revision}`; revision is `0` for a read-only legacy/new-account fallback |
| `saveAdmissionsProfile(profile, expectedUserId?, expectedRevision?)` | Persisted canonical profile JSON; optional compare-and-save revision prevents stale review writes |
| `listAdmissionsDocuments()` | Owner's document metadata with five-minute private `signed_url` links |
| `uploadAdmissionsDocument(file, documentType, onProgress?, expectedUserId?)` | Persisted document metadata; accepts PDF, JPG, PNG or WebP up to 10 MB |
| `extractAdmissionsDocument(document, expectedUserId?, openaiDocumentProcessing = false)` | Updated metadata with `extracted_data`, status `needs_review`; explicit document-processing consent required |
| `saveDocumentReview(document, reviewedData, expectedUserId?)` | Updated document metadata with explicit human review recorded |
| `removeAdmissionsDocument(document, expectedUserId?)` | `{id, removed: true}` only after storage and metadata deletion |
| `getAdmissionsDraft()` / `saveAdmissionsDraft(draft, expectedUserId?)` | Durable application draft JSON |
| `listCollegePlans()` / `saveCollegePlan(plan, expectedUserId?)` | Durable owner-scoped college plans; catalogue IDs remain text |
| `removeCollegePlan(id, expectedUserId?)` | `{id, removed: true}` after metadata deletion |
| `submitAdmissionsApplication({profile, colleges, collegeAnswers, consents, requestId, expectedUserId})` | Durable internal receipt and immutable snapshots |
| `recoverAdmissionsSubmission(requestId, expectedUserId?)` | Owner's existing receipt for that request UUID, or `null` |

Pass the account ID captured when an edit/action began as `expectedUserId`. A queued action finding a different signed-in user fails with `ACCOUNT_CHANGED` before mutating data. The submission RPC also requires the captured user UUID and checks it against `auth.uid()`, closing an account switch between client validation and sending the transaction. Read APIs remain scoped to the currently authenticated owner.

Before applying document suggestions, read `loadAdmissionsProfileRecord`, merge against that fresh profile and pass its `revision` to `saveAdmissionsProfile`. Revision `0` inserts only if no canonical profile has been created; a positive revision updates only that same database revision. A competing save returns `PROFILE_CHANGED` and requires reopening/recomparing the review. The existing database revision trigger increments each successful update. Ordinary profile saves may omit the optional revision and retain the existing save behavior.

Profile fields include `full_name`, `email`, `phone`, `date_of_birth`, `gender`, `nationality`, `current_city`, `academic_10th`, `academic_12th`, `academic_graduation`, `exam_scores[]`, `work_experience[]`, `total_work_experience_months`, optional annual INR `last_drawn_ctc`, and `preferences`. Academic/exam values are stored as stated, without converting CGPA to percentage or score to percentile. Salary information is optional and is not an admissions eligibility gate.

When no canonical profile exists, the loader reads only the signed-in user's legacy `students` record and maps known personal, academic and exam fields. Explicit original GPA scales are preserved. This bridge does not write either table; a canonical profile is created only when the student saves.

OCR requires `{document_id, openai_document_processing: true}`. Before any extraction request, the UI must explicitly disclose that the selected document's contents will be sent to **OpenAI GPT** for field extraction and collect an unchecked-by-default, document-specific checkbox consent. It must pass the actual checkbox value to the API's third argument; missing/false consent is rejected by both API and edge function before private file download or provider processing. Uploading a file, accepting general privacy terms, or requesting manual entry does not imply this provider consent. Reset consent on document/account changes and when a new extraction is requested.

The function verifies the session, checks document ownership, downloads from the private bucket itself, validates file size/MIME/signature, extracts whitelisted structured fields and saves suggestions. It accepts no user-supplied URL and never writes profile fields. The UI must show suggestions, let the student edit/include/exclude fields and explicitly confirm them; only then should it call `saveDocumentReview` and `saveAdmissionsProfile` with the reviewed merge. Existing nonempty values must not be silently overwritten. Source documents remain private and can be removed by their owner. No document body, raw model output or training corpus is logged.

The service-only claim RPC creates an extraction lease with a two-minute stale timeout and a fifteen-second per-document cooldown. A private request log enforces twenty attempts per fifteen minutes and sixty per day per account, including failed attempts. Browser clients cannot write/reset the log; deleting a source document does not reset account limits. Completed leases are released by the edge function. Request records contain account/document IDs and timestamps only; account deletion removes them. A restrictive conditional storage policy protects the new bucket even if existing permissive policies are broad, while leaving other buckets unchanged.

`onProgress` supplies upload start (`0`) and completion (`100`) signals only. Supabase's upload method does not expose byte progress. Private links expire after five minutes; reload document metadata to obtain new links.

## Submission meaning and consistency

The submission RPC requires one to fifty distinct selected colleges with `id` and `name`, a reviewed profile with name/email/phone/city/graduation degree and official percentage or CGPA, a combined snapshot below 1 MB, college-answer JSON and all three explicit declarations:

```js
{ accuracy: true, privacy: true, internal_submission: true }
```

Persist `requestId` (a UUID) in the application draft before the first submission attempt and reuse it on retries/reload. A matching retry returns the same receipt; a different payload using that ID is rejected. The API also remembers an attempt ID within a loaded session if callers omit one.

If a request fails ambiguously (for example the network drops after commit), call `recoverAdmissionsSubmission(requestId, expectedUserId)` before allowing a new submission attempt. It returns the committed owner-scoped receipt if one exists, preserving its original snapshot and timestamp; a successful lookup returning `null` means no receipt was found. Lookup failure remains an error and does not imply that submission failed to commit.

The transaction stores profile, college, answer and consent snapshots and creates a timestamped `UDX-…` receipt. It updates college plans from `Researching` to `Submitted to Unidex`, while preserving later user-entered statuses. Students can read their own receipts but cannot update/delete receipt rows through the authenticated client. Account deletion can cascade owned records under the account's deletion workflow.

If `profile.document_references` is present, each item must have a valid UUID belonging to an existing document in the same authenticated account. Attach document metadata only (`id`, `document_type`, `file_name`, `status`, `reviewed_at`); private URLs and storage paths do not belong in application snapshots.

**Received by Unidex is an internal intake status. It does not mean that a college has received, accepted or processed an application.** Institution delivery, administrator access and independent eligibility verification require later integrations.

## Verification before release

Use two disposable authenticated test accounts and test documents containing no real personal data:

- Create/update a profile, sign out/in, and verify that it persists. Confirm the second account cannot select/change the first account's profile, draft, plan, document metadata or receipts.
- Upload PDF/image fixtures, confirm the bucket is private, and verify cross-account storage reads/uploads/deletes fail. Confirm invalid MIME/size/signature rejection.
- Extract fields, confirm the profile stays unchanged, review a selected subset, save it and reload. Test provider failure/expired session and ensure no false success appears.
- Submit with declarations unchecked (must fail), submit once with a saved request UUID, retry it (same receipt) and try a changed payload with the same UUID (must fail). Verify snapshots remain unchanged after profile edits and owner UPDATE/DELETE attempts fail.
- Remove a test document and verify both object and metadata disappear. Reapply the migration to verify idempotency.

Local syntax and mocked-contract checks are useful, but do not establish deployed Auth, RLS, storage, provider quota or end-to-end OCR behavior. Record live verification separately when setup is applied.

## Official OpenAI references

- [Responses file inputs: inline PDF data](https://developers.openai.com/api/docs/guides/file-inputs)
- [Image input formats and detail levels](https://developers.openai.com/api/docs/guides/images-vision)
- [Structured Outputs with Responses `text.format`](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
- [GPT-5.4 Mini: vision, Responses, structured output and model snapshot](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
