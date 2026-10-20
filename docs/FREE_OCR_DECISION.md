# Free document extraction — 18 October 2026

Document-led autofill uses the saved upload category to target the matching profile fields. See [DOCUMENT_AUTOFILL_MAPPING.md](DOCUMENT_AUTOFILL_MAPPING.md) for category destinations, partial-read handling and cache rules. Deploy both `index.ts` and its imported `documentTargets.js`; the canonical profile schema and database tables are unchanged.

**Current default:** hosted Cloudflare Workers AI vision with a prefilled, source-tracked review. Cloudflare credentials, free-plan confirmation and enablement are connected. The stable schema-4 handler is deployed as version 31 with platform JWT verification enabled and no diagnostic hooks. The earlier schema-2 synthetic request confirmed document reading/saving but omitted richer facts; complete live schema-4 rich-field calibration remains unverified. Offline prompt/normalizer tests pass. Final source parity and frontend publication are recorded in [RELEASE_STATUS.md](RELEASE_STATUS.md). An enabled connection does not guarantee quota or accuracy. See [HOSTED_AI_SETUP.md](HOSTED_AI_SETUP.md).

The browser now renders owned PDF/image pages with PDF.js/canvas, then sends the explicitly approved pages to the fixed `@cf/google/gemma-4-26b-a4b-it` model. Workers Free supplies a bounded daily neuron allowance, not a guaranteed number of documents or unlimited extraction. The application has no paid fallback. Original files stay in private Unidex storage; bounded extracted suggestions and source history remain owner-scoped. No AI Gateway, persistent provider file upload or raw document/model-output logging is used.

The expanded schema supports professional qualifications/doctorates, defence service, repeated jobs/exams and explicit GMAT editions. Automatic cache reuse requires current-model, schema-4, category-matched usable suggestions without processing/error state. Unsupported or uncertain facts remain missing and conflicts remain review items. The student can save partial AI-filled details; experienced applicants are prompted for their last annual INR CTC without inventing it from a monthly amount, employer or rank.

## Historical browser-local decision

Before hosted vision became the default, the document screen used PDF.js and Tesseract.js entirely in the browser, with no inference API or provider key. That code remains historical/fallback implementation, not the current screen's extraction route. Local synthetic OCR success did not establish useful accuracy on the student's real documents; the user requested hosted AI interpretation instead.

## Options researched

| Option | Official limits and data handling | Decision |
| --- | --- | --- |
| Cloudflare Workers AI vision | Workers Free has 10,000 neurons/day, shared by the account and reset at 00:00 UTC. Standard stateless inference is subject to the provider's published data policy; no universal document count. | Current connected default, with explicit processing approval and no paid fallback. |
| PDF.js + Tesseract.js | Open-source local processing. No inference API charge or provider quota. Uses device CPU/memory. | Superseded browser-local route; retained in source, not the default UI. |
| Gemini API unpaid tier | Some models offer unpaid quota; limits are per project/model and use requests and tokens. No general 100-document entitlement was found. Google’s unpaid-service terms instruct users not to submit sensitive, confidential or personal information and permit product improvement/human review. | Not used for student records or identity documents. |
| OCR.space free API | 25,000 requests/month, 500/day/IP, 1 MB per file and 3 PDF pages, no SLA. Requires an API key/registration and sends files to another processor. | Poor fit for the existing 10 MB private-document flow. |

## Historical local runtime and accuracy

The older engine first reads an embedded PDF text layer. Scanned PDF pages and supported images use local Tesseract OCR. Its English printed-document support is bounded to 5 PDF pages and 10 MB; handwriting, complex marks tables, multi-column CVs, poor scans, ambiguous dates and unlabelled details can require manual entry. Explicit labels and consistent printed values produce supported profile suggestions. The parser does not infer missing facts, convert grading scales, derive percentage from arbitrary marks or assign one exam score to multiple exams.

The existing single-document review, batch conflict checking, source tracking and correction confirmation remain in use. Empty fields can be filled only after the user chooses autofill; conflicting and ambiguous values remain for review. A photograph is selected directly and is never OCR input. Identity categories contribute only supported printed common facts, without government ID numbers.

That local implementation's libraries/model/worker assets are pinned and delivered by Unidex’s own build, with no runtime CDN dependency. Its recognition runs on the user's device and is not an LLM with general document understanding. The current browser still renders pages locally, but Cloudflare performs the explicitly approved AI interpretation. Neither a local OCR test nor one hosted synthetic test establishes accuracy on every real student file.

## Primary sources checked

- Cloudflare pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Cloudflare data handling: https://developers.cloudflare.com/workers-ai/platform/data-usage/
- Cloudflare REST setup: https://developers.cloudflare.com/workers-ai/get-started/rest-api/
- Gemini terms: https://ai.google.dev/gemini-api/terms
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Tesseract.js releases: https://github.com/naptha/tesseract.js/releases
- Tesseract.js local assets: https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md
- PDF.js releases: https://github.com/mozilla/pdf.js/releases
- OCR.space API: https://ocr.space/ocrapi
- OCR.space privacy: https://ocr.space/privacypolicy

The earlier local-only milestone involved no provider provisioning. Cloudflare has since been connected through owner-supplied server secrets. No paid-plan upgrade, credit purchase, automatic paid fallback or further live calibration retries are part of this release. The older gated OpenAI function remains preserved and unused by the current default. Actual verification limits and publication results must be read from the release record, not inferred from this provider decision.
