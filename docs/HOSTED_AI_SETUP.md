# Hosted AI profile builder — free account setup

The website now prepares document pages for a hosted vision model, fills agreed empty profile fields and opens a prefilled review. It does not run Tesseract by default. Cloudflare Workers AI is the selected provider; the fixed model is `@cf/google/gemma-4-26b-a4b-it`.

**Current activation status:** the integration is implemented, but a Cloudflare account/token is not connected. Hosted extraction stays disabled until the account is configured and the synthetic check passes. Deployment alone is not proof of successful AI extraction.

## 1. Create or select a free Cloudflare account

Open [Cloudflare](https://dash.cloudflare.com/), sign in and select the account that will own Unidex's AI usage. Keep **Workers Free**. Do not enable Workers Paid, prepaid AI Gateway credits or a paid fallback.

[Cloudflare's pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) currently includes 10,000 neurons per day on Workers Free, shared by the account and reset at 00:00 UTC. Further operations fail when the free limit is reached. There is no guaranteed number of documents: image size, tokens and output length determine consumption. The application never upgrades the plan or switches to a paid provider.

## 2. Create an account-scoped AI token

In Cloudflare, open **Workers AI → Use REST API → Create a Workers AI API Token**. Use the dedicated template, scoped to the selected account. Cloudflare's [REST setup guide](https://developers.cloudflare.com/workers-ai/get-started/rest-api/) describes the account ID and Workers AI permissions. Copy the account ID and token directly into a secure local environment or the Supabase server secret form. Never paste the token into chat, GitHub, frontend variables or screenshots.

This does not move the website from Vercel or change DNS.

## 3. Verify a synthetic record before enabling

Use the included synthetic image, which contains no real student information. In an ignored environment file **outside the repository**, set:

```dotenv
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_AI_TOKEN=your_account_scoped_token
CLOUDFLARE_AI_FREE_PLAN_CONFIRMED=true
```

Run Node 24 with that file, for example:

```sh
node --env-file=/absolute/path/to/private-ai.env scripts/verify-hosted-ai.mjs
```

The script checks model metadata, makes one hosted inference call using the synthetic image, and verifies the printed name, board, year and percentage. It prints neither credentials nor raw provider responses. Do not enable the feature if it fails. This check establishes connectivity and basic image/JSON behavior; it does not establish accuracy on all real records or exercise the signed-in storage flow.

## 4. Set Supabase server secrets

Open the [Unidex Supabase project's Edge Function secrets](https://supabase.com/dashboard/project/siheziegpnrfjgzubjrk/functions/secrets). Add these names using the secure dashboard form:

| Server secret | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Selected Cloudflare account ID |
| `CLOUDFLARE_AI_TOKEN` | Account-scoped Workers AI token |
| `CLOUDFLARE_AI_FREE_PLAN_CONFIRMED` | `true`, after verifying the account remains on Workers Free |
| `CLOUDFLARE_AI_ENABLED` | `true`, only after the synthetic check passes |

The existing `admissions-ai-extract` function reads these at runtime. No secret belongs in a `VITE_` variable. Keep JWT verification enabled. Existing Supabase runtime credentials stay managed by Supabase.

The connected Supabase tools can deploy functions but do not provide a server-secret setter. These four settings are the remaining owner-side connection step.

## 5. Verify the student flow

Sign in, open **Upload documents**, and confirm that AI availability changes from awaiting connection to configured. Upload the synthetic record under Class 10, choose **Build my profile with AI**, approve Cloudflare processing and empty-field autofill, then check the prefilled review. Use a test account; never submit a college application during this check.

The student sees document-sourced facts, corrections and missing information. Existing values are preserved; conflicts require review. Photos are applied directly and are never sent for text extraction. ID proofs remain optional; government identifiers are excluded from profile extraction.

## Limits and privacy

Application limits are 10 MB per original, at most five PDF pages (larger documents are rejected without silently skipping pages), bounded page images and an 8 MiB complete request. The browser renders pages; the hosted model interprets their content. These are Unidex limits, not a claimed Cloudflare page allowance.

Only explicitly approved, owned document pages reach standard stateless Cloudflare inference. No AI Gateway, provider file upload, batch persistence, raw document logs or training logs are used. Cloudflare's [data policy](https://developers.cloudflare.com/workers-ai/platform/data-usage/) states no model training on customer content and zero retention for standard stateless inference, subject to operational/legal/security exceptions. Unidex retains the original in existing private storage and bounded extracted suggestions/source history in the student's account.

Gemini's unpaid API was rejected for this use because its [terms](https://ai.google.dev/gemini-api/terms) prohibit submitting personal information to unpaid services. No promise of “100 free documents” is made for any provider.
