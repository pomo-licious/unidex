# Document-led profile autofill

The category selected before upload is saved on the student's private document record. Extraction reads that saved category, requests its relevant fields, and maps supported results directly into the matching profile section. The browser applies the same field allowlist before individual or batch review. A category is a routing hint, not proof of a document's contents or authenticity.

| Selected upload | Profile destination |
| --- | --- |
| Class 10 mark sheet | Class 10 school, board, passing year, printed overall percentage or CGPA/scale |
| Class 12 mark sheet | Class 12 school, board, stream, passing year, printed overall percentage or CGPA/scale |
| Graduation mark sheet | Undergraduate university, college, degree, branch, passing year and printed results |
| Entrance scorecard | Exam attempts, printed edition/year, total score, percentile and section results |
| Professional qualification / doctorate | CA, CS, CMA, CPA, ACCA, CFA, doctorate or other named qualifications |
| Work experience / CTC | Employers, roles, employment dates, explicitly stated months and annual INR CTC |
| Defence service / discharge record | Printed service details and explicitly stated experience/annual INR CTC |
| Resume / Other document | All supported, explicitly identified profile sections |
| Government ID | Printed name, birth date, nationality and city only; no identity numbers |
| Profile photograph | Direct photo assignment; no AI text extraction |

Printed student name and birth date can accompany a targeted academic, qualification or work record. School contact details must not be treated as the student's contact details. No percentage is calculated from subject marks, and CGPA is not converted to percentage.

## Student workflow

1. Select the category and upload the corresponding record. The upload form previews which profile details it can fill.
2. Choose **Build selected with AI** or **Build from all documents**, and approve processing and empty-field autofill.
3. Agreed facts fill empty profile fields automatically, with document provenance. Existing values and disagreements stay available for review rather than being overwritten.
4. Check the prefilled profile. A partial academic read remains visible when expected academic details are absent. The pending-document action can explicitly reread those files.

An explicitly detected category contradiction returns `OCR_DOCUMENT_TYPE_MISMATCH`; that read saves no suggestions. A Class 12 result is never renamed into Class 10 solely because Class 10 was selected. This safeguard depends on what the model can read and does not guarantee correct classification.

## Efficiency and cache

The Edge Function and browser share `supabase/functions/admissions-ai-extract/documentTargets.js`. Narrow uploads receive a smaller blank data template and bounded output allowance: Class 10/12 use 1,536 tokens, compared with 8,192 for a multi-section resume. These are request ceilings, not measured latency or accuracy claims. All approved pages remain included in one extraction request for that document.

Extraction schema **4** records the canonical `document_type`. Reuse requires the current model, current schema, matching saved category and usable supported facts. Older results require a fresh approved read. A current partial result can still contribute its valid personal facts for review without automatic repeat inference; explicitly rereading pending documents bypasses that cache.

The existing Cloudflare free-plan gate, ownership checks, private originals, processing consent, request leases, identity restrictions and revision-safe saves remain in force. No new provider or paid fallback is introduced.

## Verification boundary

Handler tests exercise actual request construction, category masking, mismatches and owner-scoped saves with synthetic provider doubles. Frontend tests exercise mapping, cross-document provenance, cache versions, partial coverage and preservation of existing profile values. Live model accuracy and signed-in browser interactions require a separate end-to-end check; code tests do not establish those results.
