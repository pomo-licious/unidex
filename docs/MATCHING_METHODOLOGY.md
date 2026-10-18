# MBA fit scoring

Version `2026-10-18.1` · Evidence reviewed 18 October 2026.

`src/lib/admissionsMatching.js` compares a student's recorded profile, the **selected programme** and their saved preferences. The percentage is a transparent **fit score**, not a probability of admission, a ranking of institutions, a verified eligibility certificate or a salary prediction. Interview performance, applicant competition, category-specific rules, sponsorship and admissions decisions are outside this model.

## Why a common fit model rather than an invented admissions probability

Primary admissions sources show materially different selection rules:

| Source checked | Evidence relevant to this design | Consequence |
| --- | --- | --- |
| [MDI Gurgaon, current PGDM admissions page](https://mdi.ac.in/admissions/post-graduate-diploma-in-management-pgdm) | The 2027–29 page lists proposed shortlist weights: entrance score 65%, three academic records 5% each, experience 10%, academic/gender diversity 5% each. Domestic GMAT entry is specifically limited to PGDM-IB and stated test-centre/date conditions. | Programme and admission route matter. An accepted exam label is insufficient to establish eligibility or infer a cut-off. The earlier [2026–28 selection PDF](https://mdi.ac.in/resources/admin_uploads/announcement/1757419094Selection-Criteria-for-2-year-Full-Time-PGP-2026-28.pdf) used different shortlist weights and is not the current-cycle formula. |
| [FMS Delhi, official MBA 2026–28 bulletin](https://www.fms.edu/static/programmes/MBA_2026.pdf), admission section | FMS uses a weighted CAT sectional score, school marks and later assessment stages; the published full-time formula does not establish a universal salary or work-experience bonus. Its graduation rules also have category/final-year provisions and require official CGPA equivalence. | Never infer a percentile cut-off from FMS's composite score, substitute salary for merit or convert CGPA automatically. Keep eligibility checks separate from profile fit. |
| [IIM Kozhikode, official PGP 2026–28 policy](https://iimk.ac.in/uploads/programsmenu/PGP%20Admissions%20Policy%2026-28_20251209102809.pdf), experience annexure and resume assessment | The experience table peaks at 35–36 months and falls thereafter; qualifying experience excludes specified internships/articleships. Completed CA/CMA/CS receive programme-specific resume credit. | More experience is not always better. Qualification recognition must be evidenced for the programme; these Kozhikode rules are **not** copied into Delhi NCR colleges or added as catalogue entries. |
| [IIM Lucknow Noida, current IPMX programme](https://iiml.ac.in/ipmx) | The indexed official 2027–28 text states a four-year full-time post-qualification minimum by 31 March 2027 and includes academic/professional profile in final assessment. | Use a programme-specific minimum, not a generic minimum copied from an earlier cycle or all MBA programmes. |
| [DMS IIT Delhi, official 2026–28 shortlisting PDF](https://dms.iitd.ac.in/wp-content/uploads/2017/08/Shortlisting-Criteria_2026_mba-Full-Time.pdf) | The official document was found, but retrieval repeatedly returned HTTP 502 during this review. | No uninspected selection table or third-party summary is encoded as a newly verified numerical benchmark. Existing linked programme conditions retain their own evidence status. |
| [GMAC, comparing GMAT editions](https://support.mba.com/hc/en-us/articles/14075296581275-GMAT-Can-I-Compare-My-GMAT-Focus-Edition-Score-to-My-Previous-GMAT-10th-Edition-Score) | Current GMAT totals run 205–805 and the previous 10th Edition runs 200–800; the two totals are not on a common scale. | A GMAT total is comparable only when **both** the student's record and the benchmark explicitly identify the same edition. No arithmetic conversion or edition inference from the score is used. |

The weights below are **Unidex product heuristics** for planning. They are not quoted or presented as any college's official selection formula, and they have not been statistically calibrated against admissions outcomes. The data adapter supplies institution-specific evidence; it must not invent class-average GMAT scores, experience averages or cut-offs when the workbook does not provide comparable official values. The imported catalogue contains 199 active programme records. Eleven have existing structured graduation minima; an additional 37 contain an unambiguous explicit bachelor minimum that the small runtime reference adapter now reads from their existing sourced eligibility prose. These 37 imported references retain source/cycle caveats and are not newly verified criteria. The remaining 151 programmes retain unknown academic references under the conservative parser. There is still only one programme with structured numeric exam criteria and nine with a structured experience minimum, and no verified programme-specific average GMAT/work-experience benchmarks. Many programmes therefore have a limited-coverage fit or no numeric fit at all. Professional qualifications are captured for the profile and applications; the five-point credential factor remains unassessed wherever a programme-specific sourced recognition rule has not been modelled. Merely adding a CA or doctorate must not be described as proving a college-specific admission advantage.

## Framework and missing facts

| Factor | Maximum weight | Assessment |
| --- | ---: | --- |
| Entrance exam | 40 | Sourced programme minimum or sourced class average, on the same exam/score type/edition and explicitly required year when present. Alternative accepted exams are alternative routes. A class average is not an eligibility cut-off. |
| Academic record | 25 | A comparable graduation reference and graduation percentage must exist before this factor is assessed. An existing structured rule takes priority; otherwise the conservative imported eligibility reference described below can supply it. Class 10, Class 12 and graduation percentages then receive internal proportions 25%, 25%, 50%, reweighted over the recorded percentages. The component value is that percentage divided by 100. Missing school results are omitted. |
| Experience | 15 | Sourced programme bands, preferred range or class average when available; otherwise a published positive minimum, capped at the minimum. No programme reference means no numerical experience bonus. |
| Professional qualifications | 5 | A completed qualification explicitly recognised in sourced programme metadata. No automatic CA, CS, CMA, PhD, institute prestige or employer-brand bonus across every institution. |
| Fee budget | 10 | Known fee within a stated cap scores full budget alignment; above-cap alignment is `cap / fee` but the programme is moved to Other colleges. No cap means no affordability penalty. |
| Location | 3 | Saved city/Delhi NCR preference versus programme location. |
| Study mode | 2 | Saved study mode versus the programme mode. A known conflict is also a recommendation gate, so its small numeric weight cannot override the student's chosen format. |
| **Total** | **100** | Only assessable factors enter the score denominator. |

`fit = round(100 × sum(weight × componentValue) / sum(assessedWeight))`.

The displayed coverage is the assessed weight out of the full 100, independent of the displayed fit. For example, 80% fit at 25% coverage describes a much narrower comparison than 80% fit at 90% coverage. A high fit with limited coverage is not a comprehensive assessment. Default preferences alone never create a fit score; at least one academic, exam, experience or qualification factor must be assessable. Records awaiting institution identity verification have no score.

### Existing workbook eligibility prose

`src/lib/admissionsEligibilityReference.js` supplies the same graduation reference to both academic fit and the eligibility review. It does not change the catalogue, workbook snapshot, programme source or application qualification-route waiver. An existing structured value always takes priority; an invalid structured value is not silently replaced.

When the numeric field is absent, the adapter requires the selected programme's existing eligibility text and a valid `eligibilitySourceUrl`. It recognises an explicit bachelor degree plus minimum operator (`≥`, `>=`, `at least` or `minimum`) and exactly one percentage. No generic MBA minimum or CGPA conversion is inferred. Multiple percentages, category exceptions, CA/CS/CMA alternative routes, specialist health/master-degree routes, school thresholds, numeric CGPA alternatives and expected/estimated references remain unstructured. An unknown or unavailable selected programme cannot borrow a representative programme's text.

Each accepted reference carries the exact excerpt, programme ID, existing verification status and source URL. Match explanations explicitly say this is imported workbook text whose source and admissions cycle still need confirmation. Examples newly used include IMT NCR-013/215, IMI NCR-014/015/016, FORE NCR-017, JMI NCR-018/019 and Jaipuria NCR-024. This makes existing facts usable without describing the import as a fresh official verification. The conservative exclusions leave more complex eligibility rules available as prose for review.

Academic percentages outside 0–100, blanks, whitespace and non-finite values are missing. A real zero remains a real result. CGPA remains CGPA until the student supplies a percentage supported by an institution's conversion rule; neither extraction nor matching guesses the conversion.

### Entrance component

For a minimum reference `t`, a score exactly at `t` has component value 0.70. Below `t`, the value is `0.70 × actual / t`; above `t`, the remaining 0.30 rises linearly to the comparable supplied maximum (100 for percentiles), or a bounded 20% score margin if no maximum is supplied. A cohort average instead uses 0.85 at the reference, with the same bounded treatment. This headroom differentiates scores above a known reference without calling them admission chances.

The highest comparable **eligible alternative attempt/path** is used. A weaker old attempt does not invalidate a stronger permitted attempt. A sourced minimum remains a requirement even when a class-average reference is also present. Naming CAT/GMAT without a comparable score adds no points. No comparison between a raw score and percentile, GMAT editions, or different explicitly required exam years is allowed. Sectional cut-offs, allowed score-validity windows and domestic/international route conditions still require source verification.

### Experience component

Priority is a sourced explicit band (`value` between 0 and 1), then a sourced preferred range, then a sourced class average, then a published minimum:

- Inside a sourced preferred range: value 1. Below it: `months / lowerBound`; above it: `upperBound / months`.
- With a class average only: `min(months, average) / max(months, average)`. This is similarity to a cohort, **not** proof that an above-average applicant is more likely to enter.
- With a positive published minimum only: `min(1, months / minimum)`. Extra years beyond the requirement do not accumulate unlimited credit.
- No comparable programme reference: the experience history is retained, but the 15-point factor is excluded.

The engine uses the saved total months. It does not sum overlapping roles, infer post-degree/full-time status, infer qualifying military service or certify the total at a historical cutoff. Meeting a month count therefore remains a partial eligibility check until those definitions and dates are verified. Leadership descriptions and service records can support an application but are not machine-assigned prestige points.

## Study-mode and programme preferences

Known study-mode or programme-family conflicts cannot appear under Recommended, even if the two-point mode deduction leaves a high score. Such programmes remain selectable alternatives under Other colleges, with an explicit label and warning. Unknown programme mode/type under a meaningful saved preference goes to To confirm. A student's explicit programme selection or saved application is preserved; matching never silently replaces it.

`normalizeStudyMode` treats spacing/hyphens consistently, recognises full time, part time, executive and online/distance. Online/distance is the single family offered in the profile form. A source explicitly labelled Executive / part-time supports both of those stated modes; a plain executive/residential label does not establish a full-time preference match. Ambiguous full-time/part-time labels require confirmation.

The generic MBA/PGDM programme choice permits either degree family. Explicit MBA or PGDM choices compare that family; Executive MBA requires a programme with an executive indicator. A sourced PGP with no established MBA/PGDM equivalence does not silently become the preferred degree. Unset/Other preferences do not impose a fabricated restriction. Programme auto-selection prioritises preference alignment before weighted fit while preserving explicit/saved choices.

`match.preference` exposes a combined `status` (`aligned`, `conflict`, `unknown`, `not_set`) and separate `mode`/`programmeFamily` comparisons for the interface.

## Budget and recommendation groups

Eligibility checks are separate from the weighted fit. A known result below a published graduation, school, entrance-test or experience minimum generates `review_required`; a professional/defence route or category concession may change the eventual eligibility decision and should be confirmed with the institution.

| Group | Rules | User action |
| --- | --- | --- |
| `recommended` | Fit is at least 65, at least 25 of the 100 framework points are assessable, no known unmet requirement or saved format/programme-family conflict, no known fee above the cap; fees are known if a cap exists. These are Unidex planning thresholds, not college cut-offs. | Compare programme details, evidence, coverage and deadlines. This label does not certify eligibility. |
| `needs_review` | No substantive comparison yet, coverage is below 25 points, the programme format/type cannot confirm a saved preference, or a budget is set but comparable programme fees are missing. | Supply profile facts or confirm the fee. Unknown fees are never called affordable. |
| `other` | Known fee exceeds the student's cap, a published requirement needs review, a saved mode/programme preference conflicts, fit is below the 65-point planning threshold, or identity verification is pending. | Still visible and selectable; inspect the reason and source before including it. |

Ranking sorts these groups first, then fit, then coverage, then college name. The directory chooses the best programme unless the student explicitly selects a different programme. A saved selection and a submission snapshot preserve that programme's requirements and deadline evidence. Existing `createCollegeSnapshot` intentionally excludes the profile-dependent match result.

A blank/missing budget leaves the full catalogue eligible for consideration. An explicit zero is a real zero-rupee cap; it is not silently changed into unrestricted spending. A saved programme absent from the current catalogue remains in the student's plan, but its score is withheld and its group is To confirm until availability/current requirements are checked. A fee is the workbook's reported programme amount with its fee scope and evidence status; living costs, extra charges, annual increases and earlier-cycle amounts require review. Historical/recheck evidence emits an explicit cycle warning and is never relabelled as a current confirmed deadline.

## CTC and financial context

An experienced applicant supplies last **annual** CTC in INR. The canonical profile helper uses an explicit top-level amount first, including zero; otherwise it uses the latest current/date-sorted role only. It does not silently substitute an earlier role's salary when the latest salary is missing. Matching exposes:

- Reported programme fee / last annual CTC.
- Published programme-cohort mean annual CTC / student's last annual CTC, only when both values exist.
- Fee and placement scopes alongside a caution that cohort outcomes do not predict an individual's salary.

These are cost and career-planning comparisons, not admission points or a payback calculation. Tuition alone omits foregone earnings, living costs and financing; mean placement CTC does not establish individual take-home pay, salary growth or employability. Neither a high last CTC nor KPMG/another employer name creates an admissions advantage in this model without explicit programme evidence.

## Optional programme metadata contract

All fields are programme-specific; institution-wide statistics must not be silently copied into every programme. Empty values mean unavailable, not zero.

```js
matchingBenchmarks: {
  admissionsCycle: '2027–29',
  sourceUrl: 'https://official-institution.example/admissions',
  examAverages: [{
    exam: 'GMAT', scoreType: 'score', examVersion: 'focus',
    value: null, // Populate only from an inspected, comparable official source.
    maxScore: 805, examYear: null,
    cohort: 'Published programme cohort label', sourceUrl: null,
  }],
  experience: {
    averageMonths: null,
    preferredMinMonths: null, preferredMaxMonths: null,
    bands: [], // [{minMonths, maxMonths, value: 0..1}] from sourced criteria.
    cohort: null, sourceUrl: null,
  },
  professionalQualifications: {accepted: [], sourceUrl: null},
}
```

Application validation can use `hasCompletedProfessionalEntryRoute(profile, programme)` only after resolving the current canonical selected programme. This predicate requires an explicit alternative route, accepted completed CA/CS/CMA qualification, a valid source URL and `verified_current_cycle` or `verified_official_current_page` status. Historical evidence, pursuing qualifications, generic bonus labels and unverified snapshot claims cannot waive graduation requirements. The application wrapper must establish this for **every** selected programme before relaxing the common bachelor-field requirement.

A separately sourced alternative qualification route uses `acceptedProfessionalQualifications`, `professionalQualificationAlternative: true`, `qualificationEligibilitySourceUrl` and `qualificationEligibilityVerificationStatus`. It produces a conditional route explanation for completed matching qualifications, not an invented official selection bonus. Earlier-cycle MERI CA/CS-final evidence must be reconfirmed against current university rules.

The existing `examCriteria` entries use `{exam, scoreType, minScore, sourceUrl, examVersion?, maxScore?, examYear?}`. The student field is `exam_version: 'focus' | 'classic' | ''`. Generic GMAT benchmarks remain unscored until their edition is established. The existing `minGraduationPercent`, `minClass10Percent`, `minClass12Percent`, `minWorkExperienceMonths`, `minBachelorDurationYears` and `workExperienceCutoffDate` provide separate eligibility checks.

## Verification

`tests/admissionsEligibilityReference.test.js` covers real imported IMI/IMT/FORE/JMI/Jaipuria statements, ambiguity denials, selected-programme scope, source provenance, unchanged structured rules and immutability. `tests/admissionsMatching.test.js` exercises strict budget grouping, missing fee/budget handling, profile coverage, stronger academics, minimum gates, raw/percentile separation, GMAT editions and years, permitted alternative attempts, sourced class averages, non-monotonic experience, completed qualifications, salary/employer neutrality and preserved data immutability. Revisit weights only with explicit product review and outcome validation; never present a changed heuristic as a newly calibrated admission probability.
