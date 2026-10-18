# Free document extraction — 18 October 2026

The current document screen uses PDF.js and Tesseract.js in the browser. It makes no OCR or generative-model API request, requires no provider key or credits, and has no paid fallback. Originals are still uploaded to the existing private Unidex storage; the browser downloads only its signed-in owner’s file for extraction and saves bounded supported suggestions back to that account. Raw OCR text is not persisted. Existing hosting/storage/bandwidth and device limits still apply.

## Options researched

| Option | Official limits and data handling | Decision |
| --- | --- | --- |
| PDF.js + Tesseract.js | Open-source local processing. No inference API charge or provider quota. Uses device CPU/memory. | Default for this release. |
| Gemini API unpaid tier | Some models offer unpaid quota; limits are per project/model and use requests and tokens. No general 100-document entitlement was found. Google’s unpaid-service terms instruct users not to submit sensitive, confidential or personal information and permit product improvement/human review. | Not used for student records or identity documents. |
| OCR.space free API | 25,000 requests/month, 500/day/IP, 1 MB per file and 3 PDF pages, no SLA. Requires an API key/registration and sends files to another processor. | Poor fit for the existing 10 MB private-document flow. |

## Runtime and accuracy

The engine first reads an embedded PDF text layer. Scanned PDF pages and supported images use local Tesseract OCR. English printed documents up to 5 PDF pages and 10 MB are supported; handwriting, complex marks tables, multi-column CVs, poor scans, ambiguous dates and unlabelled details can require manual entry. Explicit labels and consistent printed values produce supported profile suggestions. The parser does not infer missing facts, convert grading scales, derive percentage from arbitrary marks or assign one exam score to multiple exams.

The existing single-document review, batch conflict checking, source tracking and correction confirmation remain in use. Empty fields can be filled only after the user chooses autofill; conflicting and ambiguous values remain for review. A photograph is selected directly and is never OCR input. Identity categories contribute only supported printed common facts, without government ID numbers.

Runtime libraries/model/worker assets are pinned and delivered by Unidex’s own build, with no runtime CDN dependency. Extraction software runs on the user’s device; this is not an LLM with general document understanding. A working OCR test on synthetic fixtures does not establish accuracy on every real student file.

## Primary sources checked

- Gemini terms: https://ai.google.dev/gemini-api/terms
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Tesseract.js releases: https://github.com/naptha/tesseract.js/releases
- Tesseract.js local assets: https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md
- PDF.js releases: https://github.com/mozilla/pdf.js/releases
- OCR.space API: https://ocr.space/ocrapi
- OCR.space privacy: https://ocr.space/privacypolicy

No billing, paid inference, real private-document extraction, new external-provider account or key provisioning was performed for this change. The older gated OpenAI function is preserved but is not called by the free document screen.
