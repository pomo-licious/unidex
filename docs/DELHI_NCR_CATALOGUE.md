# Delhi NCR college catalogue

The website imports the current **version 7** of `Delhi_NCR_MBA_PGDM_Database_2026_Final.xlsx`, Library identity `libfile_cd4f5961026c8191af6ad127e6240c5e`. Its public-source audit is dated **18 October 2026**. The source workbook remains unchanged and is not committed to Git.

Source fingerprint: `9d069dc833727be077817551a60b16ce6c2c8adb011d42da5a84a89befc623eb` (SHA-256). Import date does not replace individual evidence dates, cohorts or admission cycles.

## Reconciliation

| Inventory | Institutions | Programme records |
| --- | ---: | ---: |
| Complete workbook | 173 | 216 |
| Active website catalogue | 157 | 199 |
| Active six-city core | 148 | 189 |
| Active broader NCR references | 9 | 10 |
| Held or unconfirmed, audit only | 16 | 17 |

The six-city core is Delhi, Gurugram, Noida, Greater Noida, Ghaziabad and Faridabad. Broader NCR records retain their geographic label. These are researched inventory counts, not a claim of regulator-complete statutory NCR coverage.

Every workbook programme identifier occurs exactly once across active programmes and held records. Institutions have one discovery card with programme child records. Existing institution IDs and `programme-ncr-...` programme IDs are preserved when the source identity is unchanged. The new JSS University record remains separate from the held legacy JSS Academy of Technical Education MBA; their approval, intake, fees and placements are not combined.

## Reproducible import

- `scripts/data/delhi-ncr-workbook-v7.json.gz` deterministically compresses (gzip, timestamp zero) the complete current-facts snapshot. Its decompressed JSON preserves every nonempty row and original Excel row number from the 13 current workbook sheets. It includes all 70 College Master columns and the linked fee, career, contact, exam, shortlist, estimate, gap and commercial views. Cached workbook values are read; the unchanged workbook remains the formula authority.
- `docs/data/delhi-ncr-workbook-v7-audit.json.gz` retains the Source Tracker's 4,805 evidence rows and Change Log's 7,133 correction rows, plus headers/context. This historical audit is outside public assets and JavaScript imports.
- `scripts/data/delhi-ncr-verified-rules.json` preserves stable identities and limited verified admissions rules. Its separate `currentOfficialChecks` records explicit current-source overlays without silently rewriting workbook evidence.
- `src/data/delhiNcrColleges.js` is the generated discovery, matching and application contract, including held audit summaries. Its ordered college records are split into generated modules under `src/data/delhiNcrCatalogue/`, each at most 250,000 UTF-8 bytes. The public exports and catalogue values are unchanged; regeneration only removes stale files matching `part-\d{2}.generated.js` in that generated directory.
- `public/data/college-research/{collegeId}.json` retains all 70 current master columns and linked student-facing views for one institution, with scoped programme fields and source sheet/row lineage. Full research loads on request through `loadCollegeResearch`; it is not bundled into the homepage or matching calculation.

Regenerate from the checked-in source snapshot:

```sh
node scripts/generate-delhi-ncr-catalogue.mjs
```

To re-read the actual version 7 workbook first (Python with read-only `openpyxl` required):

```sh
python scripts/import-delhi-ncr-workbook.py /absolute/path/Delhi_NCR_MBA_PGDM_Database_2026_Final.xlsx
```

The generator refuses duplicate programme/institution IDs and fails if version 7 totals do not reconcile. Programme-labelled paragraphs are separated rather than copied from the reference programme. Non-reference programme research views leave the master numeric reference columns blank; their own amounts remain in explicitly labelled published-detail cells.

Internal partnership, referral and salary-growth assumptions remain in the repository research snapshot. They are not advertised as a college agreement, actual referral income, admission probability or forecast salary.

## Data contract

`DELHI_NCR_COLLEGES` is an institution array. `id` is a stable catalogue identifier independent of a Supabase UUID. `sourceInstitutionRecordId` points to the consolidated workbook row. `programmes` contains active child records whose `sourceRecordId` identifies the workbook programme.

Top-level programme facts mirror `representativeProgrammeId`. A selected programme must use its own facts and ID; executive, international, healthcare and newly approved programmes must not inherit flagship eligibility, fee, deadline or placement rules. `acceptedExams` is programme-specific; `allAcceptedExams` is a discovery union only. `acceptedExamsLabel` preserves restrictions such as international/NRI-only GMAT routes.

Programme records preserve fee/placement labels, scopes, evidence, sources, checked dates, cohort, eligibility, entrance conditions, intake, recruiters, published roles, inferred career paths, ranking context, office contact and application signals. Complete cells and caveats are available in on-demand research. Linked views include Career Outcomes & Outlook, Admissions & Placement Contacts, Fee & ROI View, Exam & Cutoff View, Data Gaps and Fee Estimates.

Missing or noncomparable numeric values are null, never zero. A numeric reference does not establish a current payable invoice or an individual salary outcome.

## Evidence boundaries

- Expected CAT/XAT bands remain screening-estimate text, not official numeric selection thresholds or admission probabilities.
- Approximate and conditional fees are not exact budget constraints. FMS has `feesInr: null`; its conditional four-semester ₹2,43,272 calculation remains in `feeEstimate`. The institute-published approximate IMM ₹17.25 lakh reference similarly stays separate. `publishedFeeReferenceInr` retains an explicitly numeric workbook reference even where approximate status prevents use in `feesInr`. Living costs, refundable deposits, travel, application charges and revisions retain their original scope.
- `averageCtcInr` is withheld for pooled, undated, headline, secondary, interim, proxy or otherwise noncomparable evidence. `reportedMeanReferenceInr`, original labels and separate `ctcReference` preserve the research. Highest packages, peer estimates and future salary scenarios never substitute for an average.
- No comparable verified average entrant GMAT or average work-experience benchmarks are established across the imported programmes. `matchingBenchmarks` remains null; no average or admission probability is invented. More experience and higher prior salary are not assumed to improve every application.
- Explicit minimum graduation, degree-duration, school-mark and work-experience rules retain their sources and cycle flags. The current MDI IB rule stays programme-specific; older executive rules remain subject to a cycle check.
- MERI's official page lists completed ICAI CA or ICSI CS final examinations as alternative eligibility routes, but cites older exam years. It is marked `official_previous_cycle_requires_confirmation`, not a current selection bonus or a CMA route. The current university brochure controls.
- Jindal's unversioned GMAT 450 label remains research text, not a numeric rule that could be applied to GMAT Focus. Other specifically sourced criteria retain raw-score versus percentile units.

## Current official overlays

| Programme | Source | Interpretation |
| --- | --- | --- |
| MDI PGDM, HRM and Business Analytics | [Current official PGDM page](https://mdi.ac.in/admissions/post-graduate-diploma-in-management-pgdm), checked 18 October 2026 | 2027–29 schedule totals ₹26,55,310 including ₹27,500 security. Displayed net reference is ₹26,27,810, with gross/security separately retained. Instalment dates establish the named cycle; fees remain subject to revision. IB and executive programmes do not inherit this amount. |
| MDI PGDM, HRM, Business Analytics and IB | [Official IB page](https://mdi.ac.in/admissions/post-graduate-diploma-in-management-international-business-pgdm-ib), checked 16 October 2026 | Preserved deadline: 28 November 2026, 17:00 IST, 2027–29 intake. IB separately requires a four-year bachelor degree and one year post-degree work by 31 January 2027. Test routes remain programme-specific. |
| BIMTECH variants | [Official admissions page](https://www.bimtech.ac.in/admissions), checked 16 October 2026 | Preserved programme-specific tests and graduation rules. MAT is retained for Insurance/Retail, not General/IB. Latest workbook fees/scopes supersede older imported amounts. |
| MERI MBA | [Official institute page](https://meri.edu.in/meri/ipu-mba-admission-2/), reopened 18 October 2026 | CA/CS final alternative retained as historical official text needing current confirmation; older CAT/CMAT years are not adopted as current admissions. |

Workbook primary and discovery sources remain distinguishable. A source URL does not mean every field was independently reverified during this import.

## Deadlines, forms and held records

Only sourced current-cycle deadlines have a concrete date. Preserved MDI deadlines include `closesAt: 2026-11-28T17:00:00+05:30` and `timeZone: Asia/Kolkata`. Unknown windows have `date: null` and `verificationStatus: confirmation_required`. Historical admission-closed, counselling and vacancy signals are context, not current availability claims.

Unknown official form schemas stay `requirementsStatus: pending_verification`. The limited MDI preference selector has its official source; FMS SOP and Jindal result-status fields remain preparation aids. Capturing a Unidex draft does not mean a college has received or accepted an official submission.

All 16 held institutions / 17 programmes stay in `DELHI_NCR_EXCLUDED_RECORDS`, excluded from discovery and matching. Version 7 now also holds Prakash Deep, AAFT Noida, legacy JSSATE MBA and other previously retained records. Unknown identities, approvals and operations are not repaired by guessing a website or transferring another campus's outcomes.

IIM Lucknow's Noida IPMX is a possible workbook coverage gap; its [official programme page](https://iiml.ac.in/ipmx) merits a separately verified supplement. No invented NCR ID, fee, eligibility or deadline was attached to IIM Rohtak, and this release keeps the 173-institution source inventory exact.

## Validation

Tests reconcile all 216 programme identities, 173 source institutions, 157 active cards, 199 active programmes, 148 active core institutions, 189 active core programmes, 16 held institutions and 17 held programmes. They cover stable IDs, numeric versus conditional fees, MDI programme isolation, JSS identity separation, absence of fabricated averages, numeric-reference isolation, all 70 on-demand research columns, historical audit retention and research-loader cancellation/identity checks.
