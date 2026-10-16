# Delhi NCR college catalogue

`src/data/delhiNcrColleges.js` imports the existing Business Idea research into the admissions experience. It does not seed, update or query the production database.

## Provenance

- Authoritative source: `/Business Idea/Delhi_NCR_MBA_PGDM_Database_2026_Final.xlsx`, version 2, Library identity `libfile_cd4f5961026c8191af6ad127e6240c5e`.
- The workbook's current contents were materialized and read on 16 October 2026. Its continuation audit is dated 7 October 2026. Original field verification dates are retained; import date is not substituted for a source audit date.
- The source contains 205 programme records under 169 distinct institution names. Of these, 199 programme records under 163 institutions are marked `Active / credible inventory`. Those 163 institutions form the default catalogue. This is a researched inventory, not a claim of regulator-complete coverage.
- The six requested core cities contain 191 active programme records under 156 institutions: Delhi, Gurugram, Noida, Greater Noida, Ghaziabad and Faridabad. Seven additional institutions in Sonipat, Rohtak and Jhajjar are marked `broader_ncr`.
- Workbook sheets inspected: College Master, Exam & Cutoff View, Source Tracker, Executive Summary, Assumptions, Data Gaps, Change Log and the programme-linked fee/placement views.
- The older `Delhi_NCR_MBA_PGDM_Database_2026.xlsx` was found but not used as the authoritative source because the Final version records subsequent corrections and held leads.

## Data contract

`DELHI_NCR_COLLEGES` is an array of institution records. `id` is a stable readable catalogue identifier independent of a Supabase college UUID. `sourceInstitutionRecordId` preserves the representative workbook row identifier.

Each institution has `programmeNames` for display and `programmes` for programme-specific matching, planning and forms. A programme preserves the original workbook `sourceRecordId`, with an application-local `id` such as `programme-ncr-009`.

Top-level eligibility, exam, fee, placement, deadline and form fields mirror `programmes[0]`, whose identity is recorded as `representativeProgrammeId`. Applications selecting a different programme must use that programme's own fields and preserve its identifier in the application snapshot. The executive experience/fee rules must never inherit the institution's full-time programme rules.

`acceptedExams` describes the representative programme; `allAcceptedExams` is the institution-wide union for discovery only. Neither means every exam is valid for every programme, applicant category, test year or admission cycle. `acceptedExamsLabel` retains the published route conditions.

Null numeric values mean unavailable, unverified or not comparable. They do not mean zero. `feesLabel`, `averageCtcLabel`, `feeScope`, `placementScope`, evidence fields, source URLs and dates retain the distinctions needed to interpret the original research.

## Values deliberately withheld from scoring

- The workbook expressly calls expected CAT bands screening estimates. Those remain `examCutoffLabel` text. No estimated band or arbitrary tier was converted into an official numeric cutoff.
- `examCriteria` contains only the official published Jindal MBA exam minimums rechecked in this session. A raw GRE, GMAT or NMAT score is never treated as a percentile.
- Minimum graduation percentages are numeric only for the specifically sourced FMS full-time MBA, IIT Delhi full-time MBA, MDI full-time programmes, BIMTECH and Jindal MBA records. Unknown requirements remain null. Category-specific FMS and IIT exceptions are separately preserved.
- Inherited approximate fees, third-party estimates, incomplete totals and conflicting schedules are not exposed as verified numeric fees. Their source labels remain available for review.
- Average CTC is numeric only where the workbook identifies a published programme/cohort mean. Pooled-campus, top-percentile, interim, third-party, incomplete-scope and stale figures remain null in that field. The published label and evidence still identify what was originally reported.
- No salary, referral agreement, application deadline, ranking, new programme or admission probability was invented. Prior salary is student profile information; this catalogue does not claim that colleges officially weight it.

## Official checks on 16 October 2026

| Institution / programme | Fields checked | Source and interpretation |
| --- | --- | --- |
| MDI Gurgaon: PGDM, HRM, Business Analytics and International Business | Current deadline, academic eligibility, programme preferences; IB degree and experience rules | [Official PGDM-IB admissions page](https://mdi.ac.in/admissions/post-graduate-diploma-in-management-international-business-pgdm-ib) publishes the shared 2027–29 application deadline as 28 November 2026 at 17:00 IST. The four imported full-time programmes share that deadline. IB separately requires a four-year degree and one year of post-degree experience by 31 January 2027. The page's fee/installment text contains earlier-cycle labels, so it did not overwrite historical fee values. |
| BIMTECH: General, International Business, Insurance Business Management, Retail Management | 2027–29 exams, minimum graduation marks and full-course tuition | [Official admissions page](https://www.bimtech.ac.in/admissions) distinguishes accepted tests by programme. MAT is included for Insurance and Retail; it is not assigned to General or IB. The current published tuition is ₹14 lakh for each programme; housing, mess and refundable security are extra. No current closing date was inferred. |
| Jindal Global Business School: full-time MBA | Graduation and exam minimums, fee basis, application result-status handling | [Official full-time MBA page](https://jgu.edu.in/jgbs/admissions/full-time-mba-programme) publishes 50 percentile for CAT/MAT/XAT/CMAT/ATMA, GRE 295, GMAT 450 and NMAT 160. It permits an awaited exam result. Annual tuition is ₹7.5 lakh; the displayed two-year base of ₹15 lakh excludes annual increases, accommodation and services. The page mixes cycle labels, so no deadline is asserted. |
| FMS Delhi: full-time MBA | General and reserved-category graduation rules; statement-of-purpose interview component | [Official 2026–28 bulletin](https://www.fms.edu/static/programmes/MBA_2026.pdf), page 6. This remains a previous-cycle rule, explicitly identified as such; it is not presented as a verified 2027–29 application window. |
| IIT Delhi: full-time MBA | Minimum graduation mark, category relaxation | [Official admissions page](https://dms.iitd.ac.in/admission-mba/) was reconfirmed through the official-domain search index. Direct opening timed out twice, so `eligibilityVerificationStatus` identifies a search reconfirmation rather than a complete current-page audit. |

Sources linked by the original workbook remain available in each programme's `sourceUrls`. Those include both primary evidence and clearly identifiable discovery sources; presence in that list does not mean every field was independently reverified today.

## Deadline handling

Only the four imported MDI full-time programmes have `verificationStatus: 'verified_current_cycle'` and a concrete `date`. Their `closesAt` carries `+05:30` and `timeZone` is `Asia/Kolkata`, avoiding UTC/local-date drift.

Every other deadline has `date: null`, `verificationStatus: 'confirmation_required'`, an explicit confirmation label and its admissions source URL. Historical workbook vacancy signals are retained separately as `applicationSignal`; they do not establish current availability.

## Institution-specific forms

Unknown official form schemas have `requirementsStatus: 'pending_verification'` and no asserted required institution-specific fields. The shared Unidex application can collect the student's general profile and college-specific drafts, but capturing a draft is separate from an institution accepting a submission.

The verified MDI programme-preference selector is required because the official shared application instructs applicants to select their programmes. FMS statement-of-purpose preparation and Jindal result-status fields are optional. These limited fields do not claim to reproduce complete institution application forms; those records have at most partially verified requirements.

## Held and weak records

The following six source rows remain in `DELHI_NCR_EXCLUDED_RECORDS` for audit only. They are not in `DELHI_NCR_COLLEGES`:

| Source ID | Institution | Source status |
| --- | --- | --- |
| NCR-062 | Dr. Akhilesh Das Gupta Institute of Professional Studies | Verification required — exclude |
| NCR-096 | I.T.S Institute of Management, Greater Noida | Verification required — exclude |
| NCR-130 | Rishi Chadha Vishvas Girls Institute of Technology – MBA | Verification lead — exclude |
| NCR-150 | DPG Institute of Technology and Management | Verification lead — exclude |
| NCR-163 | Faridabad College of Engineering and Management (formerly DITMR) | Verification lead — exclude |
| NCR-170 | Rishihood University – School of Entrepreneurship | Verification lead — exclude |

The inherited active record NCR-128, Prakash Deep Institute of Management and Technology, lacks a verified official website. It is retained to preserve the researched inventory, with `website: null`, no accepted-exam assertion and `dataStatus: 'identity_verification_required'`. Third-party listings found during the current search did not establish present primary-source admissions status. Discovery should show its need for confirmation and avoid presenting it as a verified recommendation.

## Validation

The import reconciles 163 unique institution IDs, 199 programme records, 156 core institutions, 191 core programmes and six excluded programme rows. Numeric facts are finite positive values or null. Every concrete deadline has a current official-source record. Source programme identifiers remain unique. The source workbook was not modified.
