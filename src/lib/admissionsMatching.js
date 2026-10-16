// Transparent profile alignment, never an estimate of admission probability.
// Missing facts are excluded from the denominator and disclosed as coverage.
import { getProfileProgress } from './admissionsProfile.js'

const WEIGHTS = { academics: 30, exam: 40, budget: 15, city: 10, mode: 5 }

function number(value) {
  if (value === null || value === undefined || (typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function text(value) { return String(value || '').trim().toLowerCase() }
function normaliseExam(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^CMATEXAM$/, 'CMAT').replace(/^CATEXAM$/, 'CAT')
}

function scoresFromProfile(profile) {
  if (Array.isArray(profile?.exam_scores)) return profile.exam_scores
  if (profile?.exam_scores?.exam || profile?.exam_scores?.exam_type) return [{ ...profile.exam_scores, exam: profile.exam_scores.exam || profile.exam_scores.exam_type }]
  return []
}

function examValue(score, scoreType) {
  if (/percentile/i.test(scoreType || '')) return number(score.percentile)
  // A raw score and a percentile must never be compared on the same scale.
  return number(score.total_score ?? score.score)
}

export function profileCompleteness(profile) {
  return getProfileProgress(profile || {})
}

export function createCollegeSnapshot(college) {
  const snapshot = { ...college }
  delete snapshot.match // A computed, profile-dependent explanation is not catalogue data.
  const id = college.programme_key || college.selectedProgrammeId || college.selected_programme?.id
  const programme = college.programmes?.find(item => item.id === id) || college.selected_programme || null
  // Keep evidence for the selected programme, without repeating the entire
  // institution catalogue in every saved plan and submission payload.
  snapshot.programmes = programme ? [programme] : []
  if (programme) {
    snapshot.programme_key = programme.id
    snapshot.selectedProgrammeId = programme.id
    snapshot.selectedProgrammeName = programme.name
    snapshot.selected_programme = { id: programme.id, name: programme.name }
  }
  return snapshot
}

export function matchCollege(profile, college) {
  const reasons = []
  const warnings = []
  const preferences = profile?.preferences || {}
  const add = (key, label, status, detail, value = null) => {
    reasons.push({ key, label, status, detail, weight: WEIGHTS[key] || 0, value, assessed: value !== null })
  }
  const graduation = number(profile?.academic_graduation?.percentage ?? profile?.academic_background?.graduation_percentage)
  const minimumGraduation = number(college?.minGraduationPercent)
  if (minimumGraduation !== null && graduation !== null) {
    const meets = graduation >= minimumGraduation
    add('academics', 'Graduation eligibility', meets ? 'met' : 'review', `${graduation}% in your profile · published minimum ${minimumGraduation}%. Category-specific concessions, degree requirements and final eligibility need confirmation.`, meets ? 1 : Math.max(0, graduation / minimumGraduation))
  } else {
    add('academics', 'Graduation eligibility', 'unknown', minimumGraduation === null ? 'A comparable numeric minimum has not been verified for this programme.' : `Add your graduation percentage to compare with the published ${minimumGraduation}% minimum.`)
  }

  // Programme-specific eligibility conditions can flag a review independently
  // of the 100-point preference framework. Do not invent school/experience rules.
  for (const [key, field, academic, label] of [
    ['school10', 'minClass10Percent', 'academic_10th', 'Class 10 eligibility'],
    ['school12', 'minClass12Percent', 'academic_12th', 'Class 12 eligibility'],
  ]) {
    const minimum = number(college?.[field])
    if (minimum === null) continue
    const actual = number(profile?.[academic]?.percentage)
    add(key, label, actual === null ? 'unknown' : actual < minimum ? 'review' : 'met', actual === null ? `The published minimum is ${minimum}%. Add your percentage; no CGPA conversion is assumed.` : `Your ${actual}% · published minimum ${minimum}%. This additional eligibility check is outside the weighted match score.`)
  }
  const minimumExperience = number(college?.minWorkExperienceMonths)
  const experience = number(profile?.total_work_experience_months)
  if (minimumExperience !== null) {
    const cutoff = college.workExperienceCutoffDate ? ` by ${college.workExperienceCutoffDate}` : ''
    add('experience', 'Work experience eligibility', experience === null ? 'unknown' : experience < minimumExperience ? 'review' : 'partial', experience === null ? `This programme publishes a ${minimumExperience}-month minimum${cutoff}. Add your work history, then verify qualifying service and dates with the institution.` : `${experience} months recorded · published requirement ${minimumExperience} months${cutoff}. The programme may require post-degree, full-time experience; recorded total months alone do not verify that condition. This eligibility check has no numeric score weight.`)
  }
  if (number(college?.minBachelorDurationYears) !== null) {
    add('degreeDuration', 'Bachelor’s degree duration', 'unknown', `This programme requires a ${college.minBachelorDurationYears}-year bachelor’s degree. The profile records a degree and passing year, not verified programme duration, so this condition needs manual confirmation.`)
  }

  const examScores = scoresFromProfile(profile)
  const accepted = Array.isArray(college?.acceptedExams) ? college.acceptedExams : []
  const acceptedNames = accepted.map(exam => typeof exam === 'string' ? exam : exam.exam || exam.name).filter(Boolean)
  const criteria = Array.isArray(college?.examCriteria) ? college.examCriteria.filter(item => number(item.minScore) !== null) : []
  const compared = []
  for (const criterion of criteria) {
    const relevantScores = examScores.filter(score => normaliseExam(score.exam) === normaliseExam(criterion.exam))
    for (const score of relevantScores) {
      const actual = examValue(score, criterion.scoreType)
      const minimum = number(criterion.minScore)
      if (actual !== null && minimum !== null && minimum > 0) compared.push({ actual, minimum, criterion, ratio: actual / minimum })
    }
  }
  if (compared.length) {
    // Alternative accepted entrance tests are alternatives, not cumulative hurdles.
    const best = compared.sort((a, b) => b.ratio - a.ratio)[0]
    const unit = /percentile/i.test(best.criterion.scoreType || '') ? ' percentile' : ' score'
    add('exam', 'Entrance exam', best.ratio >= 1 ? 'met' : 'review', `${best.criterion.exam}: your ${best.actual}${unit} · published reference ${best.minimum}${unit}. Exam year, category, section cut-offs and admissions cycle still require confirmation.`, Math.max(0, Math.min(1, best.ratio)))
  } else {
    const compatible = examScores.filter(score => acceptedNames.some(exam => normaliseExam(exam) === normaliseExam(score.exam)))
    if (compatible.length) {
      add('exam', 'Entrance exam', 'partial', `${compatible.map(score => score.exam).join(', ')} is listed among accepted tests. No comparable, verified numeric cut-off is available, so this contributes no score.`)
    } else {
      add('exam', 'Entrance exam', 'unknown', !examScores.length ? 'Add your entrance tests and scores to check programme requirements.' : acceptedNames.length ? `Listed tests: ${acceptedNames.join(', ')}. Your recorded tests do not yet establish eligibility; verify other admission routes with the institution.` : 'Accepted tests and comparable cut-offs need verification for this programme.')
    }
  }

  const fees = number(college?.feesInr)
  const budget = number(preferences.max_fees_inr)
  if (fees !== null && budget !== null && budget > 0) {
    const meets = fees <= budget
    add('budget', 'Fee budget', meets ? 'met' : 'review', `Verified reported fee ₹${fees.toLocaleString('en-IN')} · your budget ₹${budget.toLocaleString('en-IN')}. Check the fee scope and extra charges.`, meets ? 1 : Math.max(0, budget / fees))
  } else add('budget', 'Fee budget', 'unknown', fees === null ? 'A verified comparable fee is not available; no estimate is used.' : 'Set your fee budget to assess affordability.')

  const cities = Array.isArray(preferences.preferred_cities) ? preferences.preferred_cities : []
  if (cities.length && college?.city) {
    const city = text(college.city)
    const regional = ['delhi ncr', 'ncr', 'delhi-ncr']
    const aligns = cities.some(preferred => regional.includes(text(preferred)) || text(preferred) === city || (text(preferred) === 'delhi' && city === 'new delhi') || (text(preferred) === 'gurgaon' && city === 'gurugram'))
    add('city', 'Location preference', aligns ? 'met' : 'review', `${college.city}${college.geographicScope === 'broader_ncr' ? ' · wider NCR' : ''} · compared with your saved preferred cities.`, aligns ? 1 : 0)
  } else add('city', 'Location preference', 'unknown', 'Add preferred cities to assess location alignment.')

  const normaliseMode = value => {
    const mode = text(value).replace(/[^a-z]/g, '')
    if (mode.startsWith('fulltime')) return 'fulltime'
    if (mode.startsWith('parttime')) return 'parttime'
    if (mode.startsWith('executive') || mode.startsWith('workingprofessional')) return 'executive'
    if (mode.startsWith('online')) return 'online'
    if (mode.startsWith('distance')) return 'distance'
    return ''
  }
  const mode = normaliseMode(college?.mode)
  const preferredMode = normaliseMode(preferences.study_mode)
  if (mode && preferredMode) {
    const matches = mode.replace(/[^a-z]/g, '') === preferredMode.replace(/[^a-z]/g, '')
    add('mode', 'Study mode', matches ? 'met' : 'review', `Programme: ${college.mode} · preference: ${preferences.study_mode}.`, matches ? 1 : 0)
  } else add('mode', 'Study mode', 'unknown', 'The programme mode or your study preference is not yet recorded.')

  const assessed = reasons.filter(reason => reason.assessed)
  const coveredWeight = assessed.reduce((sum, reason) => sum + reason.weight, 0)
  // Preferences alone do not establish an academic match, including default
  // preferences on a newly created account or the public browsing experience.
  const informative = assessed.some(reason => reason.key === 'academics' || reason.key === 'exam')
  const identityUnverified = college?.dataStatus === 'identity_verification_required'
  const score = !identityUnverified && informative && coveredWeight > 0 ? Math.round(assessed.reduce((sum, reason) => sum + reason.weight * reason.value, 0) / coveredWeight * 100) : null
  const eligibilityReasons = reasons.filter(reason => ['academics', 'exam', 'school10', 'school12', 'experience', 'degreeDuration'].includes(reason.key))
  const eligibility = eligibilityReasons.some(reason => reason.status === 'review') ? 'review_required' : eligibilityReasons.every(reason => reason.status === 'met') ? 'meets_known_criteria' : 'unknown'
  if (eligibility === 'review_required') warnings.push('At least one published academic, exam or experience requirement needs review. Category, programme and cycle-specific exceptions may apply.')
  if (coveredWeight < 100) warnings.push(`Only ${coveredWeight}% of the scoring framework is assessable. Missing criteria are excluded, never scored as zero.`)
  if (identityUnverified) warnings.push('This institution record still needs identity verification. A match score is withheld until that review is complete.')
  if (!college?.deadline?.date) warnings.push('The current application deadline needs confirmation directly with the college.')
  return {
    score,
    label: score === null ? 'More information needed' : eligibility === 'review_required' ? 'Review requirements' : score >= 85 ? 'Strong profile alignment' : score >= 65 ? 'Some preferences align' : 'Explore your options',
    reasons,
    warnings,
    confidence: { label: coveredWeight >= 80 ? 'Higher coverage' : coveredWeight >= 50 ? 'Partial coverage' : 'Limited coverage', percentage: coveredWeight, assessed: assessed.length, total: reasons.length },
    eligibility,
  }
}

export function rankColleges(profile, colleges) {
  return colleges.map(college => ({ ...college, match: matchCollege(profile, college) })).sort((a, b) => (b.match.score ?? -1) - (a.match.score ?? -1) || b.match.confidence.percentage - a.match.confidence.percentage || a.name.localeCompare(b.name))
}
