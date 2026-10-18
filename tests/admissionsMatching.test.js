import { describe, expect, it } from 'vitest'
import { createEmptyProfile } from '../src/lib/admissionsProfile.js'
import { MATCHING_WEIGHTS, hasCompletedProfessionalEntryRoute, matchCollege, normalizeProgrammeFamily, normalizeStudyMode, rankColleges } from '../src/lib/admissionsMatching.js'
import { DELHI_NCR_COLLEGES } from '../src/data/delhiNcrColleges.js'

const collegeById = id => DELHI_NCR_COLLEGES.find(college => college.id === id)
const reason = (match, key) => match.reasons.find(item => item.key === key)
const profile = patch => ({ ...createEmptyProfile(), ...patch })
const jindal = collegeById('ncr-jindal-global-business-school')
const mbi = collegeById('ncr-mdi-gurgaon')

describe('Admissions matching with sourced criteria', () => {
  it('withholds academic match scores on a new account with only default preferences', () => {
    expect(matchCollege(createEmptyProfile(), mbi).score).toBeNull()
  })

  it('does not treat an absent graduation percentage as zero', () => {
    expect(reason(matchCollege(profile({ academic_graduation: { percentage: null } }), mbi), 'academics').status).toBe('unknown')
  })

  it('does not treat a whitespace-only graduation value as zero', () => {
    expect(reason(matchCollege(profile({ academic_graduation: { percentage: '   ' } }), mbi), 'academics').status).toBe('unknown')
  })

  it('preserves a real zero percentage as a result requiring review', () => {
    expect(reason(matchCollege(profile({ academic_graduation: { percentage: 0 } }), mbi), 'academics').status).toBe('review')
  })

  it('does not turn CGPA into a guessed graduation percentage', () => {
    expect(reason(matchCollege(profile({ academic_graduation: { cgpa: 8.9 } }), mbi), 'academics').status).toBe('unknown')
  })

  it('compares a CAT percentile with a sourced CAT percentile minimum', () => {
    expect(reason(matchCollege(profile({ exam_scores: [{ exam: 'CAT', percentile: 60 }] }), jindal), 'exam').status).toBe('met')
  })

  it('does not compare a CAT raw score with a percentile minimum', () => {
    expect(reason(matchCollege(profile({ exam_scores: [{ exam: 'CAT', total_score: 80 }] }), jindal), 'exam').assessed).toBe(false)
  })

  it('withholds a generic GMAT raw-score comparison when the published edition is ambiguous', () => {
    expect(reason(matchCollege(profile({ exam_scores: [{ exam: 'GMAT', total_score: 500 }] }), jindal), 'exam').assessed).toBe(false)
  })

  it('does not compare a GMAT percentile with a raw GMAT minimum', () => {
    expect(reason(matchCollege(profile({ exam_scores: [{ exam: 'GMAT', percentile: 99 }] }), jindal), 'exam').assessed).toBe(false)
  })

  it('excludes a blank exam percentile rather than failing it as a zero result', () => {
    expect(reason(matchCollege(profile({ exam_scores: [{ exam: 'CAT', percentile: ' ' }] }), jindal), 'exam').assessed).toBe(false)
  })

  it('treats alternative accepted exams as alternative qualification paths', () => {
    expect(reason(matchCollege(profile({ exam_scores: [{ exam: 'CAT', percentile: 40 }, { exam: 'GRE', total_score: 310 }] }), jindal), 'exam').status).toBe('met')
  })

  it('does not award exam points solely for naming a listed exam', () => {
    expect(reason(matchCollege(profile({ exam_scores: [{ exam: 'CAT', percentile: 99 }] }), mbi), 'exam').assessed).toBe(false)
  })

  it('never introduces an official cutoff from an inherited expected band', () => {
    const college = { ...mbi, examCutoffLabel: 'Expected 95+ percentile' }
    expect(reason(matchCollege(profile({ exam_scores: [{ exam: 'CAT', percentile: 99 }] }), college), 'exam').assessed).toBe(false)
  })

  it('keeps compensation neutral across otherwise identical applicant profiles', () => {
    const base = profile({ academic_graduation: { percentage: 75 }, exam_scores: [{ exam: 'CAT', percentile: 75 }] })
    expect(matchCollege({ ...base, last_drawn_ctc: 0 }, jindal).score).toEqual(matchCollege({ ...base, last_drawn_ctc: 50000000 }, jindal).score)
  })

  it('does not infer college fees from an unverified published estimate', () => {
    const college = { ...mbi, feesInr: null, feesLabel: '₹5 lakh approximately' }
    expect(reason(matchCollege(profile({ preferences: { max_fees_inr: 1000000 } }), college), 'budget').assessed).toBe(false)
  })

  it('shows only assessed framework coverage when criteria are missing', () => {
    expect(matchCollege(profile({ academic_graduation: { percentage: 75 }, preferences: {} }), { ...mbi, mode: null }).confidence.percentage).toBe(25)
  })

  it('withholds scores for an institution needing identity verification', () => {
    const college = { ...jindal, dataStatus: 'identity_verification_required' }
    expect(matchCollege(profile({ academic_graduation: { percentage: 99 }, exam_scores: [{ exam: 'CAT', percentile: 99 }] }), college).score).toBeNull()
  })

  it('does not mutate applicants or college data during ranking', () => {
    const candidate = profile({ academic_graduation: { percentage: 75 } })
    const list = [mbi, jindal]
    const before = JSON.stringify({ candidate, list })
    rankColleges(candidate, list)
    expect(JSON.stringify({ candidate, list })).toBe(before)
  })

  it('does not rank a withheld institutional score above a comparable assessed match', () => {
    const list = [mbi, { ...jindal, id: 'unverified', dataStatus: 'identity_verification_required' }]
    expect(rankColleges(profile({ academic_graduation: { percentage: 75 } }), list)[0].id).toBe(mbi.id)
  })

  it('does not fabricate a numerical match when every academic rule is unavailable', () => {
    const college = { ...mbi, minGraduationPercent: null, examCriteria: [] }
    expect(matchCollege(profile({ academic_graduation: { percentage: 100 }, exam_scores: [{ exam: 'CAT', percentile: 100 }] }), college).score).toBeNull()
  })

  it('flags a known Class 10 minimum even when graduation results are strong', () => {
    expect(matchCollege(profile({ academic_graduation: { percentage: 90 }, academic_10th: { percentage: 20 } }), mbi).eligibility).toBe('review_required')
  })

  it('flags a known Class 12 minimum even when graduation results are strong', () => {
    expect(matchCollege(profile({ academic_graduation: { percentage: 90 }, academic_12th: { percentage: 20 } }), mbi).eligibility).toBe('review_required')
  })

  it('flags the international-business work-experience requirement for a fresh graduate', () => {
    const ib = mbi.programmes.find(programme => programme.sourceRecordId === 'NCR-196')
    expect(matchCollege(profile({ academic_graduation: { percentage: 90 }, total_work_experience_months: 0 }), { ...mbi, ...ib }).eligibility).toBe('review_required')
  })

  it('does not verify degree duration from the graduation degree name alone', () => {
    const ib = mbi.programmes.find(programme => programme.sourceRecordId === 'NCR-196')
    expect(reason(matchCollege(profile({ academic_graduation: { degree: 'B.Com', percentage: 90 } }), { ...mbi, ...ib }), 'degreeDuration').status).toBe('unknown')
  })
})

describe('Budget-aware recommendations and transparent fit', () => {
  const evidence = 'https://example.edu/admissions/current-programme'
  const candidate = patch => profile({ academic_graduation: { percentage: 80 }, ...patch })
  const programme = patch => ({ ...jindal, feesInr: 1200000, examCriteria: [], acceptedExams: ['CAT', 'GMAT'], ...patch })

  it('keeps the documented fit framework at 100 points', () => {
    expect(Object.values(MATCHING_WEIGHTS).reduce((sum, value) => sum + value, 0)).toBe(100)
  })

  it('keeps an above-budget college outside recommendations despite strong academics', () => {
    expect(matchCollege(candidate({ academic_graduation: { percentage: 99 }, preferences: { max_fees_inr: 1000000 } }), programme()).recommendationGroup).toBe('other')
  })

  it('accepts a fee exactly at the student budget cap', () => {
    expect(matchCollege(candidate({ preferences: { max_fees_inr: 1200000 } }), programme()).budget.status).toBe('within_budget')
  })

  it('does not mark unknown fees as affordable under a stated cap', () => {
    expect(matchCollege(candidate({ preferences: { max_fees_inr: 1200000 } }), programme({ feesInr: null })).recommendationGroup).toBe('needs_review')
  })

  it('does not penalise a candidate who has not set a budget', () => {
    expect(matchCollege(candidate({ preferences: {} }), programme({ feesInr: 100000000 })).score).toBe(matchCollege(candidate({ preferences: {} }), programme({ feesInr: null })).score)
  })

  it('treats an explicit zero budget as a cap rather than unrestricted spending', () => {
    expect(matchCollege(candidate({ preferences: { max_fees_inr: 0 } }), programme()).budget.status).toBe('over_budget')
  })

  it('allows a known free programme at an explicit zero budget cap', () => {
    expect(matchCollege(candidate({ preferences: { max_fees_inr: 0 } }), programme({ feesInr: 0 })).budget.status).toBe('within_budget')
  })

  it('withholds the fit score for a saved programme no longer present in the current catalogue', () => {
    expect(matchCollege(candidate(), programme({ programmeUnavailable: true })).score).toBeNull()
  })

  it('preserves an unavailable saved programme under To confirm rather than recommending it', () => {
    expect(matchCollege(candidate(), programme({ programmeUnavailable: true })).recommendationGroup).toBe('needs_review')
  })

  it('orders within-budget recommendations ahead of above-budget higher-scoring options', () => {
    const list = [programme({ id: 'over', feesInr: 1400000 }), programme({ id: 'within', feesInr: 800000 })]
    expect(rankColleges(candidate({ preferences: { max_fees_inr: 1000000 } }), list)[0].id).toBe('within')
  })

  it('keeps known unmet academic requirements under Other colleges', () => {
    expect(matchCollege(candidate({ academic_graduation: { percentage: 40 } }), programme()).recommendationGroup).toBe('other')
  })

  it('does not recommend a low fit solely because it clears an eligibility minimum', () => {
    expect(matchCollege(candidate({ academic_graduation: { percentage: 50 }, preferences: {} }), programme()).recommendationGroup).toBe('other')
  })

  it('requires more evidence before recommending an experience-only fit', () => {
    expect(matchCollege(profile({ total_work_experience_months: 24, preferences: {} }), programme({ minGraduationPercent: null, minWorkExperienceMonths: 24 })).recommendationGroup).toBe('needs_review')
  })

  it('distinguishes stronger graduation marks above the same minimum', () => {
    expect(matchCollege(candidate({ academic_graduation: { percentage: 90 }, preferences: {} }), programme()).score).toBeGreaterThan(matchCollege(candidate({ academic_graduation: { percentage: 55 }, preferences: {} }), programme()).score)
  })

  it('includes Class 10 and Class 12 percentages in academic profile alignment', () => {
    const base = candidate({ preferences: {} })
    expect(matchCollege({ ...base, academic_10th: { percentage: 99 }, academic_12th: { percentage: 99 } }, programme()).score).toBeGreaterThan(matchCollege({ ...base, academic_10th: { percentage: 60 }, academic_12th: { percentage: 60 } }, programme()).score)
  })

  it('does not turn a larger salary into an admission-fit advantage', () => {
    expect(matchCollege(candidate({ last_drawn_ctc: 3000000 }), programme()).score).toBe(matchCollege(candidate({ last_drawn_ctc: 300000 }), programme()).score)
  })

  it('uses last annual CTC for programme cost context', () => {
    expect(matchCollege(candidate({ last_drawn_ctc: 600000 }), programme()).financialContext.feeToAnnualCtc).toBe(2)
  })

  it('does not divide financial context by zero CTC', () => {
    expect(matchCollege(candidate({ last_drawn_ctc: 0 }), programme()).financialContext.feeToAnnualCtc).toBeNull()
  })

  it('uses salary from the latest role when the top-level CTC is absent', () => {
    expect(matchCollege(candidate({ last_drawn_ctc: '', work_experience: [{ end_date: '2021-06', last_drawn_ctc: 300000 }, { current: true, start_date: '2025-01', last_drawn_ctc: 600000 }] }), programme()).financialContext.feeToAnnualCtc).toBe(2)
  })

  it('keeps explicit top-level CTC ahead of a role-level salary', () => {
    expect(matchCollege(candidate({ last_drawn_ctc: 400000, work_experience: [{ current: true, last_drawn_ctc: 600000 }] }), programme()).financialContext.feeToAnnualCtc).toBe(3)
  })

  it('does not silently substitute a previous role salary when the latest role CTC is missing', () => {
    expect(matchCollege(candidate({ last_drawn_ctc: '', work_experience: [{ end_date: '2021-06', last_drawn_ctc: 300000 }, { current: true, start_date: '2025-01', last_drawn_ctc: '' }] }), programme()).financialContext.feeToAnnualCtc).toBeNull()
  })

  it('uses a sourced programme-cohort mean for salary context', () => {
    expect(matchCollege(candidate({ last_drawn_ctc: 600000 }), programme({ averageCtcInr: 1200000, placementSourceUrl: evidence, averageCtcVerificationStatus: 'published_historical_cohort' })).financialContext.reportedAverageToLastCtc).toBe(2)
  })

  it('does not use an unsourced placement figure as an individual career benchmark', () => {
    expect(matchCollege(candidate({ last_drawn_ctc: 600000 }), programme({ averageCtcInr: 1200000, placementSourceUrl: null })).financialContext.reportedAverageToLastCtc).toBeNull()
  })

  it('does not use an explicitly noncomparable placement average in salary context', () => {
    expect(matchCollege(candidate({ last_drawn_ctc: 600000 }), programme({ averageCtcInr: 1200000, placementSourceUrl: evidence, averageCtcVerificationStatus: 'unverified_or_noncomparable' })).financialContext.reportedAverageToLastCtc).toBeNull()
  })

  it('does not award an employer prestige bonus', () => {
    expect(matchCollege(candidate({ work_experience: [{ company: 'KPMG', designation: 'Consultant' }] }), programme()).score).toBe(matchCollege(candidate({ work_experience: [{ company: 'Independent firm', designation: 'Consultant' }] }), programme()).score)
  })

  it('does not invent an experience bonus without a sourced benchmark', () => {
    expect(reason(matchCollege(candidate({ total_work_experience_months: 120 }), programme()), 'experience').assessed).toBe(false)
  })

  it('caps experience credit when a published minimum is reached', () => {
    expect(matchCollege(candidate({ total_work_experience_months: 120 }), programme({ minWorkExperienceMonths: 24 })).score).toBe(matchCollege(candidate({ total_work_experience_months: 24 }), programme({ minWorkExperienceMonths: 24 })).score)
  })

  it('still assesses a known experience minimum when optional benchmark metadata has no numeric reference', () => {
    expect(reason(matchCollege(candidate({ total_work_experience_months: 24 }), programme({ minWorkExperienceMonths: 24, matchingBenchmarks: { experience: { sourceUrl: evidence } } })), 'experience').assessed).toBe(true)
  })

  it('does not treat experience above a class average as automatically stronger', () => {
    const college = programme({ matchingBenchmarks: { experience: { averageMonths: 24, cohort: '2026', sourceUrl: evidence } } })
    expect(matchCollege(candidate({ total_work_experience_months: 60 }), college).score).toBeLessThan(matchCollege(candidate({ total_work_experience_months: 24 }), college).score)
  })

  it('uses explicit programme experience bands instead of a universal more-is-better curve', () => {
    const college = programme({ matchingBenchmarks: { experience: { sourceUrl: evidence, bands: [{ minMonths: 0, maxMonths: 11, value: 0 }, { minMonths: 12, maxMonths: 36, value: 1 }, { minMonths: 37, value: 0.3 }] } } })
    expect(matchCollege(candidate({ total_work_experience_months: 48 }), college).score).toBeLessThan(matchCollege(candidate({ total_work_experience_months: 24 }), college).score)
  })

  it('does not score a purported experience average without source evidence', () => {
    expect(reason(matchCollege(candidate({ total_work_experience_months: 24 }), programme({ matchingBenchmarks: { experience: { averageMonths: 24 } } })), 'experience').assessed).toBe(false)
  })

  it('gives qualification fit credit only to completed programme-recognised qualifications', () => {
    const college = programme({ matchingBenchmarks: { professionalQualifications: { accepted: ['CA'], sourceUrl: evidence } } })
    expect(reason(matchCollege(candidate({ professional_qualifications: [{ qualification: 'Chartered Accountant', status: 'Completed' }] }), college), 'credentials').assessed).toBe(true)
  })

  it('does not treat pursuing CA as a completed qualification', () => {
    const college = programme({ matchingBenchmarks: { professionalQualifications: { accepted: ['CA'], sourceUrl: evidence } } })
    expect(reason(matchCollege(candidate({ professional_qualifications: [{ qualification: 'CA', status: 'Pursuing' }] }), college), 'credentials').assessed).toBe(false)
  })

  it('does not manufacture a universal qualification bonus across colleges', () => {
    expect(reason(matchCollege(candidate({ professional_qualifications: [{ qualification: 'CA', status: 'Completed', institution: 'Prestigious institute' }] }), programme()), 'credentials').assessed).toBe(false)
  })

  it('explains a sourced alternative qualification route without inventing a selection bonus', () => {
    const college = programme({ acceptedProfessionalQualifications: ['CA'], professionalQualificationAlternative: true, qualificationEligibilitySourceUrl: evidence })
    expect(reason(matchCollege(candidate({ professional_qualifications: [{ qualification: 'CA', status: 'completed' }] }), college), 'professionalRoute').weight).toBe(0)
  })

  it('does not infer an alternative admission route from an accepted qualification label alone', () => {
    const college = programme({ acceptedProfessionalQualifications: ['CA'] })
    expect(reason(matchCollege(candidate({ professional_qualifications: [{ qualification: 'CA', status: 'completed' }] }), college), 'professionalRoute')).toBeUndefined()
  })

  it('recognises a completed qualification under an explicitly verified current entry route', () => {
    expect(hasCompletedProfessionalEntryRoute(candidate({ professional_qualifications: [{ qualification: 'CA', status: 'completed' }] }), programme({ acceptedProfessionalQualifications: ['CA'], professionalQualificationAlternative: true, qualificationEligibilitySourceUrl: evidence, qualificationEligibilityVerificationStatus: 'verified_current_cycle' }))).toBe(true)
  })

  it('does not waive graduation using a historical qualification route', () => {
    expect(hasCompletedProfessionalEntryRoute(candidate({ professional_qualifications: [{ qualification: 'CA', status: 'completed' }] }), programme({ acceptedProfessionalQualifications: ['CA'], professionalQualificationAlternative: true, qualificationEligibilitySourceUrl: evidence, qualificationEligibilityVerificationStatus: 'official_previous_cycle_requires_confirmation' }))).toBe(false)
  })

  it('does not waive graduation for a pursuing qualification under a current route', () => {
    expect(hasCompletedProfessionalEntryRoute(candidate({ professional_qualifications: [{ qualification: 'CA', status: 'pursuing' }] }), programme({ acceptedProfessionalQualifications: ['CA'], professionalQualificationAlternative: true, qualificationEligibilitySourceUrl: evidence, qualificationEligibilityVerificationStatus: 'verified_current_cycle' }))).toBe(false)
  })

  it('does not turn a current qualification-bonus label into an alternative admission route', () => {
    expect(hasCompletedProfessionalEntryRoute(candidate({ professional_qualifications: [{ qualification: 'CA', status: 'completed' }] }), programme({ acceptedProfessionalQualifications: ['CA'], qualificationEligibilitySourceUrl: evidence, qualificationEligibilityVerificationStatus: 'verified_current_cycle' }))).toBe(false)
  })

  it('does not waive graduation for a qualification missing from the programme route', () => {
    expect(hasCompletedProfessionalEntryRoute(candidate({ professional_qualifications: [{ qualification: 'CMA', status: 'completed' }] }), programme({ acceptedProfessionalQualifications: ['CA'], professionalQualificationAlternative: true, qualificationEligibilitySourceUrl: evidence, qualificationEligibilityVerificationStatus: 'verified_current_cycle' }))).toBe(false)
  })

  it('retains defence service as programme-specific application context without false points', () => {
    expect(reason(matchCollege(candidate({ defence_service: { status: 'serving', branch: 'Army' } }), programme()), 'defence').weight).toBe(0)
  })

  it('compares GMAT raw scores only when both editions match explicitly', () => {
    const college = programme({ examCriteria: [{ exam: 'GMAT', examVersion: 'classic', minScore: 500, scoreType: 'score', sourceUrl: evidence }] })
    expect(reason(matchCollege(candidate({ exam_scores: [{ exam: 'GMAT', exam_version: 'classic', total_score: 700 }] }), college), 'exam').status).toBe('met')
  })

  it('never compares classic GMAT totals to current GMAT totals', () => {
    const college = programme({ examCriteria: [{ exam: 'GMAT', examVersion: 'classic', minScore: 650, scoreType: 'score', sourceUrl: evidence }] })
    expect(reason(matchCollege(candidate({ exam_scores: [{ exam: 'GMAT', exam_version: 'focus', total_score: 705 }] }), college), 'exam').assessed).toBe(false)
  })

  it('never compares an unlabelled GMAT edition against a labelled average', () => {
    const college = programme({ matchingBenchmarks: { examAverages: [{ exam: 'GMAT', examVersion: 'focus', value: 645, scoreType: 'score', sourceUrl: evidence }] } })
    expect(reason(matchCollege(candidate({ exam_scores: [{ exam: 'GMAT', total_score: 705 }] }), college), 'exam').assessed).toBe(false)
  })

  it('does not score an impossible GMAT total outside its explicitly recorded edition scale', () => {
    const college = programme({ examCriteria: [{ exam: 'GMAT', examVersion: 'focus', minScore: 645, scoreType: 'score', sourceUrl: evidence }] })
    expect(reason(matchCollege(candidate({ exam_scores: [{ exam: 'GMAT', exam_version: 'focus', total_score: 100 }] }), college), 'exam').assessed).toBe(false)
  })

  it('uses a higher comparable GMAT total as stronger class-profile alignment', () => {
    const college = programme({ matchingBenchmarks: { examAverages: [{ exam: 'GMAT', examVersion: 'focus', value: 645, scoreType: 'score', sourceUrl: evidence }] } })
    expect(matchCollege(candidate({ exam_scores: [{ exam: 'GMAT', exam_version: 'focus', total_score: 705 }] }), college).score).toBeGreaterThan(matchCollege(candidate({ exam_scores: [{ exam: 'GMAT', exam_version: 'focus', total_score: 605 }] }), college).score)
  })

  it('does not turn below-average exam performance into a failed admission requirement', () => {
    const college = programme({ matchingBenchmarks: { examAverages: [{ exam: 'CAT', value: 95, scoreType: 'percentile', sourceUrl: evidence }] } })
    expect(matchCollege(candidate({ exam_scores: [{ exam: 'CAT', percentile: 85 }] }), college).eligibility).toBe('meets_known_criteria')
  })

  it('does not fabricate an exam average from an unsourced number', () => {
    const college = programme({ matchingBenchmarks: { examAverages: [{ exam: 'CAT', value: 95, scoreType: 'percentile' }] } })
    expect(reason(matchCollege(candidate({ exam_scores: [{ exam: 'CAT', percentile: 99 }] }), college), 'exam').assessed).toBe(false)
  })

  it('does not compare scores from a different explicitly required exam year', () => {
    const college = programme({ examCriteria: [{ exam: 'CAT', minScore: 95, scoreType: 'percentile', examYear: 2026, sourceUrl: evidence }] })
    expect(reason(matchCollege(candidate({ exam_scores: [{ exam: 'CAT', percentile: 99, year: 2025 }] }), college), 'exam').assessed).toBe(false)
  })

  it('does not let a lower old attempt disqualify a stronger comparable attempt', () => {
    const college = programme({ examCriteria: [{ exam: 'CAT', minScore: 80, scoreType: 'percentile', sourceUrl: evidence }] })
    expect(reason(matchCollege(candidate({ exam_scores: [{ exam: 'CAT', percentile: 40 }, { exam: 'CAT', percentile: 99 }] }), college), 'exam').status).toBe('met')
  })

  it('preserves a known minimum when a selected class-average reference is below it', () => {
    const college = programme({ examCriteria: [{ exam: 'CAT', minScore: 95, scoreType: 'percentile', sourceUrl: evidence }], matchingBenchmarks: { examAverages: [{ exam: 'CAT', value: 80, scoreType: 'percentile', sourceUrl: evidence }] } })
    expect(matchCollege(candidate({ exam_scores: [{ exam: 'CAT', percentile: 90 }] }), college).recommendationGroup).toBe('other')
  })

  it('does not silently present historical fee evidence as current-cycle verification', () => {
    expect(matchCollege(candidate(), programme({ feeVerificationStatus: 'official_historical_recheck_cycle' })).warnings.some(value => /earlier cycle/.test(value))).toBe(true)
  })

  it('keeps a known executive-mode conflict outside Recommended despite otherwise strong fit', () => {
    const match = matchCollege(candidate({ total_work_experience_months: 72, preferences: { study_mode: 'Full time', programme: 'MBA/PGDM', max_fees_inr: 2000000 } }), programme({ mode: 'Executive / residential', minWorkExperienceMonths: 36 }))
    expect(match.recommendationGroup).toBe('other')
  })

  it('exposes a clear preference conflict label for an otherwise selectable executive programme', () => {
    expect(matchCollege(candidate({ preferences: { study_mode: 'Full time' } }), programme({ mode: 'Executive / evening' })).label).toBe('Outside your preferences')
  })

  it('normalizes equivalent full-time spelling before comparing preferences', () => {
    expect(matchCollege(candidate({ preferences: { study_mode: 'Full time' } }), programme({ mode: 'Full-time / as published' })).preference.status).toBe('aligned')
  })

  it('normalizes the profile Online / distance choice to a distance programme mode', () => {
    expect(matchCollege(candidate({ preferences: { study_mode: 'Online / distance' } }), programme({ mode: 'Distance learning' })).preference.mode.status).toBe('aligned')
  })

  it('requires format confirmation when a requested mode has no comparable programme mode', () => {
    expect(matchCollege(candidate({ preferences: { study_mode: 'Full time' } }), programme({ mode: null })).recommendationGroup).toBe('needs_review')
  })

  it('does not impose a study-mode restriction when the preference is unset', () => {
    expect(matchCollege(candidate({ preferences: {} }), programme({ mode: 'Executive / residential' })).preference.mode.status).toBe('not_set')
  })

  it('keeps an explicit MBA versus PGDM family conflict outside Recommended', () => {
    expect(matchCollege(candidate({ preferences: { programme: 'MBA', study_mode: 'Full time' } }), programme({ programme: 'PGDM', programmeType: 'PGDM' })).recommendationGroup).toBe('other')
  })

  it('retains an explicit executive-mode preference for a PGDM degree family', () => {
    expect(matchCollege(candidate({ preferences: { programme: 'PGDM', study_mode: 'Executive' } }), programme({ programme: 'PGDM (Business Management)', programmeType: 'PGDM', mode: 'Executive / residential' })).preference.status).toBe('aligned')
  })

  it('treats the generic MBA/PGDM preference as allowing either degree family', () => {
    expect(matchCollege(candidate({ preferences: { programme: 'MBA/PGDM', study_mode: 'Full time' } }), programme({ programme: 'PGDM', programmeType: 'PGDM' })).preference.programmeFamily.status).toBe('aligned')
  })

  it('does not label a regular MBA as matching an explicit Executive MBA preference', () => {
    expect(matchCollege(candidate({ preferences: { programme: 'Executive MBA' } }), programme({ programme: 'MBA', programmeType: 'MBA' })).preference.programmeFamily.status).toBe('conflict')
  })

  it('accepts an explicitly part-time executive format for a part-time preference', () => {
    expect(matchCollege(candidate({ preferences: { study_mode: 'Part time', programme: 'PGDM' } }), programme({ programme: 'PGDM Business Administration', programmeType: 'PGDM', mode: 'Executive / part-time' })).preference.status).toBe('aligned')
  })

  it('exports the mode vocabulary used by discovery programme selection', () => {
    expect(normalizeStudyMode('Online / distance')).toBe('online_distance')
  })

  it('exports the programme family vocabulary used by discovery programme selection', () => {
    expect(normalizeProgrammeFamily('MBA/PGDM')).toBe('management')
  })

  it('warns about an unverified deadline even when a calendar date is present', () => {
    expect(matchCollege(candidate(), programme({ deadline: { date: '2026-06-01', verificationStatus: 'historical' } })).warnings.some(value => /earlier or unverified date/.test(value))).toBe(true)
  })
})
