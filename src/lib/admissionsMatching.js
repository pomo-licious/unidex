// Transparent profile alignment, never an estimate of admission probability.
// Missing facts are excluded from the denominator and disclosed as coverage.
import { getLastDrawnCtc, getProfileProgress } from './admissionsProfile.js'
import { getGraduationEligibilityReference } from './admissionsEligibilityReference.js'

export const MATCHING_METHODOLOGY_VERSION = '2026-10-18.1'
// Product heuristics, not any institution’s admissions formula.
export const MATCHING_WEIGHTS = Object.freeze({ academics: 25, exam: 40, experience: 15, credentials: 5, budget: 10, city: 3, mode: 2 })
const WEIGHTS = MATCHING_WEIGHTS

function number(value) {
  if (value === null || value === undefined || (typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function text(value) { return String(value || '').trim().toLowerCase() }
function normaliseExam(value) {
  const result = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^CMATEXAM$/, 'CMAT').replace(/^CATEXAM$/, 'CAT')
  return result.startsWith('GMAT') ? 'GMAT' : result
}

function scoresFromProfile(profile) {
  if (Array.isArray(profile?.exam_scores)) return profile.exam_scores
  if (profile?.exam_scores?.exam || profile?.exam_scores?.exam_type) return [{ ...profile.exam_scores, exam: profile.exam_scores.exam || profile.exam_scores.exam_type }]
  return []
}

const clamp = value => Math.max(0, Math.min(1, value))
const percentage = value => { const result = number(value); return result !== null && result >= 0 && result <= 100 ? result : null }
const evidenceUrl = value => { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) } catch { return false } }
function examVersion(record) {
  const value = text(record?.exam_version || record?.examVersion || record?.exam)
  if (/focus|205.?805|current/.test(value)) return 'focus'
  if (/classic|legacy|10th|200.?800/.test(value)) return 'classic'
  return ''
}
function examValue(score, reference) {
  const percentile = /percentile/i.test(reference.scoreType || '')
  if (normaliseExam(reference.exam) === 'GMAT') {
    // Neither generic labels nor arithmetic conversion establish equivalent editions.
    if (!examVersion(score) || !examVersion(reference) || examVersion(score) !== examVersion(reference)) return null
  }
  if (reference.examYear && String(score.year) !== String(reference.examYear)) return null
  const actual = percentile ? percentage(score.percentile) : number(score.total_score ?? score.score)
  if (actual === null || actual < 0) return null
  if (!percentile && normaliseExam(reference.exam) === 'GMAT' && actual < (examVersion(reference) === 'focus' ? 205 : 200)) return null
  const maximum = /percentile/i.test(reference.scoreType || '') ? 100 : number(reference.maxScore) ?? (normaliseExam(reference.exam) === 'GMAT' ? examVersion(reference) === 'focus' ? 805 : 800 : null)
  return maximum !== null && actual > maximum ? null : actual
}
function referenceAlignment(actual, target, reference, atTarget) {
  const maximum = /percentile/i.test(reference.scoreType || '') ? 100 : number(reference.maxScore)
  if (actual < target) return clamp(atTarget * actual / target)
  // Without an explicit/common score ceiling, reward only a bounded margin.
  const upper = maximum !== null && maximum > target ? maximum : target * 1.2
  return clamp(atTarget + (1 - atTarget) * (actual - target) / (upper - target))
}
function qualifiedRows(profile) {
  return (Array.isArray(profile?.professional_qualifications) ? profile.professional_qualifications : []).filter(row => row && typeof row === 'object')
}
function qualificationName(value) {
  const result = text(value).replace(/[^a-z0-9]/g, '')
  if (['ca', 'charteredaccountant', 'charteredaccountancy'].includes(result)) return 'CA'
  if (['cs', 'companysecretary', 'companysecretaryship'].includes(result)) return 'CS'
  if (['cma', 'icwa', 'costandmanagementaccountant', 'costandmanagementaccountancy'].includes(result)) return 'CMA'
  if (['phd', 'doctorate', 'doctorofphilosophy'].includes(result)) return 'PhD'
  return result.toUpperCase()
}
const completedQualification = row => /^(completed|qualified|awarded|passed|member|fellow|associate)$/i.test(String(row?.status || '').trim())

// For application validation, callers must first resolve the current canonical
// programme. Historical or snapshot-only route claims cannot waive a degree.
export function hasCompletedProfessionalEntryRoute(profile, programme) {
  if (programme?.professionalQualificationAlternative !== true || !evidenceUrl(programme?.qualificationEligibilitySourceUrl)
    || !['verified_current_cycle', 'verified_official_current_page'].includes(programme?.qualificationEligibilityVerificationStatus)
    || !Array.isArray(programme?.acceptedProfessionalQualifications)) return false
  const accepted = programme.acceptedProfessionalQualifications.map(qualificationName)
  return qualifiedRows(profile).some(row => row.status === 'completed'
    && ['CA', 'CS', 'CMA'].includes(qualificationName(row.qualification))
    && accepted.includes(qualificationName(row.qualification)))
}

export function normalizeStudyMode(value) {
  const mode = text(value).replace(/[^a-z]/g, '')
  if (/executive|workingprofessional/.test(mode)) return 'executive'
  if (/online|distance/.test(mode)) return 'online_distance'
  if (/fulltime/.test(mode) && !/parttime/.test(mode)) return 'fulltime'
  if (/parttime/.test(mode) && !/fulltime/.test(mode)) return 'parttime'
  return ''
}

export function normalizeProgrammeFamily(value) {
  const family = text(value).replace(/[^a-z]/g, '')
  if (!family || family === 'other') return ''
  if (/executive|emba/.test(family)) return 'executive'
  if (/mba/.test(family) && /pgdm|pgp/.test(family)) return 'management'
  if (/mba|masterofbusinessadministration/.test(family)) return 'mba'
  if (/pgdm|postgraduatediplomainmanagement/.test(family)) return 'pgdm'
  if (/^pgp|management/.test(family)) return 'management'
  return ''
}

function programmePreferences(preferences, college) {
  const requestedMode = normalizeStudyMode(preferences.study_mode)
  const programmeMode = normalizeStudyMode(college?.mode)
  const rawMode = text(college?.mode).replace(/[^a-z]/g, '')
  const modeMatches = requestedMode === programmeMode || requestedMode === 'parttime' && /parttime/.test(rawMode) || requestedMode === 'fulltime' && /fulltime/.test(rawMode)
  const modeStatus = !requestedMode ? 'not_set' : !programmeMode ? 'unknown' : modeMatches ? 'aligned' : 'conflict'
  const requestedFamily = normalizeProgrammeFamily(preferences.programme)
  const programmeFamily = normalizeProgrammeFamily(college?.programmeType || college?.selected_programme?.type || college?.programme)
  const executive = programmeMode === 'executive' || /executive|\bemba\b/i.test(college?.programme || college?.selected_programme?.name || '')
  const familyStatus = !requestedFamily ? 'not_set' : !programmeFamily ? 'unknown'
    : requestedFamily === 'management' || requestedFamily === 'executive' && executive || requestedFamily === programmeFamily ? 'aligned'
      : programmeFamily === 'management' ? 'unknown' : 'conflict'
  const statuses = [modeStatus, familyStatus]
  return {
    status: statuses.includes('conflict') ? 'conflict' : statuses.includes('unknown') ? 'unknown' : statuses.every(value => value === 'not_set') ? 'not_set' : 'aligned',
    mode: { requested: requestedMode, programme: programmeMode, status: modeStatus },
    programmeFamily: { requested: requestedFamily, programme: programmeFamily, executive, status: familyStatus },
  }
}

export function profileCompleteness(profile) {
  return getProfileProgress(profile || {})
}

export function createCollegeSnapshot(college) {
  const snapshot = { ...college }
  delete snapshot.match // A computed, profile-dependent explanation is not catalogue data.
  delete snapshot.programmeUnavailable // A current-view availability flag is not programme evidence.
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
  const benchmarks = college?.matchingBenchmarks || {}
  const add = (key, label, status, detail, value = null, extra = {}) => {
    reasons.push({ key, label, status, detail, weight: WEIGHTS[key] || 0, value, assessed: value !== null, ...extra })
  }
  const graduation = percentage(profile?.academic_graduation?.percentage ?? profile?.academic_background?.graduation_percentage)
  const graduationReference = getGraduationEligibilityReference(college)
  const minimumGraduation = graduationReference?.value ?? null
  const importedGraduation = graduationReference?.source === 'imported_eligibility'
  const graduationReferenceDetail = importedGraduation ? `Imported workbook eligibility states a bachelor’s minimum of ${minimumGraduation}%. ${graduationReference.caveat}` : `Published graduation minimum ${minimumGraduation}%.`
  const graduationEvidence = graduationReference ? { sourceUrl: graduationReference.sourceUrl, referenceSource: graduationReference.source, verificationStatus: graduationReference.verificationStatus, programmeId: graduationReference.programmeId, ...(importedGraduation ? { referenceExcerpt: graduationReference.excerpt } : {}) } : {}
  if (minimumGraduation !== null && graduation !== null) {
    const meets = graduation >= minimumGraduation
    // School and graduation percentages describe the recorded academic profile,
    // not an invented conversion of the college's final selection formula.
    const records = [['Class 10', percentage(profile?.academic_10th?.percentage), 0.25], ['Class 12', percentage(profile?.academic_12th?.percentage), 0.25], ['Graduation', graduation, 0.5]].filter(([, value]) => value !== null)
    const result = records.reduce((sum, [, value, weight]) => sum + value * weight, 0) / records.reduce((sum, [, , weight]) => sum + weight, 0)
    add('academics', 'Academic record', meets ? 'met' : 'review', `${records.map(([label, value]) => `${label} ${value}%`).join(' · ')}. ${graduationReferenceDetail} The fit uses recorded marks; category concessions, final-year routes and degree equivalence need confirmation. No CGPA conversion is assumed.`, result / 100, graduationEvidence)
  } else {
    add('academics', 'Academic record', 'unknown', minimumGraduation === null ? 'A comparable numeric graduation rule has not been established for this programme; academic fit is withheld.' : `Add your graduation percentage to compare with this ${minimumGraduation}% reference. ${graduationReferenceDetail} CGPA is retained without an assumed percentage conversion.`, null, graduationEvidence)
  }

  for (const [key, field, academic, label] of [
    ['school10', 'minClass10Percent', 'academic_10th', 'Class 10 eligibility'],
    ['school12', 'minClass12Percent', 'academic_12th', 'Class 12 eligibility'],
  ]) {
    const minimum = percentage(college?.[field])
    if (minimum === null) continue
    const actual = percentage(profile?.[academic]?.percentage)
    add(key, label, actual === null ? 'unknown' : actual < minimum ? 'review' : 'met', actual === null ? `The published minimum is ${minimum}%. Add your percentage; no CGPA conversion is assumed.` : `Your ${actual}% · published minimum ${minimum}%. This eligibility check is separate from the weighted academic record.`)
  }
  const minimumExperience = number(college?.minWorkExperienceMonths)
  const recordedExperience = number(profile?.total_work_experience_months)
  const experience = recordedExperience !== null && recordedExperience >= 0 ? recordedExperience : null
  if (minimumExperience !== null && minimumExperience >= 0) {
    const cutoff = college.workExperienceCutoffDate ? ` by ${college.workExperienceCutoffDate}` : ''
    add('experienceEligibility', 'Work experience eligibility', experience === null ? 'unknown' : experience < minimumExperience ? 'review' : 'partial', experience === null ? `This programme publishes a ${minimumExperience}-month minimum${cutoff}. Add your work history, then verify qualifying service and dates.` : `${experience} months recorded · published minimum ${minimumExperience} months${cutoff}. Post-degree, full-time service and supporting dates still need verification; a recorded total does not certify qualifying experience.`)
  }
  const experienceBenchmark = benchmarks.experience
  let experienceFit = null
  if (experience !== null && experienceBenchmark && evidenceUrl(experienceBenchmark.sourceUrl)) {
    const average = number(experienceBenchmark.averageMonths)
    const lower = number(experienceBenchmark.preferredMinMonths)
    const upper = number(experienceBenchmark.preferredMaxMonths)
    const bands = Array.isArray(experienceBenchmark.bands) ? experienceBenchmark.bands.filter(band => number(band.minMonths) !== null && number(band.value) !== null && band.value >= 0 && band.value <= 1) : []
    const band = bands.find(item => experience >= item.minMonths && (number(item.maxMonths) === null || experience <= item.maxMonths))
    if (band) {
      experienceFit = { label: 'Experience alignment', status: band.value >= 0.8 ? 'met' : 'partial', detail: `${experience} months recorded · compared with the programme's sourced experience bands${experienceBenchmark.cohort ? ` (${experienceBenchmark.cohort})` : ''}. Qualifying experience and cut-off dates must be checked.`, value: number(band.value) }
    } else if (lower !== null && upper !== null && lower >= 0 && upper >= lower) {
      const value = experience < lower ? (lower ? experience / lower : 1) : experience > upper ? (experience ? upper / experience : 1) : 1
      experienceFit = { label: 'Experience alignment', status: experience >= lower && experience <= upper ? 'met' : 'partial', detail: `${experience} months recorded · sourced programme range ${lower}–${upper} months${experienceBenchmark.cohort ? ` (${experienceBenchmark.cohort})` : ''}. Fit reflects this range; more experience is not automatically better.`, value: clamp(value) }
    } else if (average !== null && average > 0) {
      experienceFit = { label: 'Experience and class profile', status: 'partial', detail: `${experience} months recorded · published class average ${average} months${experienceBenchmark.cohort ? ` (${experienceBenchmark.cohort})` : ''}. Similarity to a class average is a planning heuristic, not an eligibility threshold or admission advantage.`, value: Math.min(experience, average) / Math.max(experience, average) }
    }
  }
  if (experienceFit) {
    add('experience', experienceFit.label, experienceFit.status, experienceFit.detail, experienceFit.value, { sourceUrl: experienceBenchmark.sourceUrl })
  } else if (experience !== null && minimumExperience !== null && minimumExperience > 0) {
    add('experience', 'Experience alignment', experience >= minimumExperience ? 'partial' : 'review', `${experience} months recorded · published minimum ${minimumExperience} months. This fit component is capped when the minimum is reached; extra years do not create unlimited credit. Qualifying service still needs confirmation.`, clamp(experience / minimumExperience))
  } else add('experience', 'Experience alignment', 'unknown', experience === null ? 'Add your total work experience to assess programme-specific experience requirements.' : `${experience} months recorded. No comparable sourced class average, preferred range or minimum is available; no experience bonus is invented.`)

  if (number(college?.minBachelorDurationYears) !== null) {
    add('degreeDuration', 'Bachelor’s degree duration', 'unknown', `This programme requires a ${college.minBachelorDurationYears}-year bachelor’s degree. Degree name and passing year alone do not verify duration; confirm this condition.`)
  }

  const examScores = scoresFromProfile(profile)
  const accepted = Array.isArray(college?.acceptedExams) ? college.acceptedExams : []
  const acceptedNames = accepted.map(exam => typeof exam === 'string' ? exam : exam.exam || exam.name).filter(Boolean)
  const criteria = Array.isArray(college?.examCriteria) ? college.examCriteria.filter(item => number(item.minScore) !== null && number(item.minScore) > 0 && evidenceUrl(item.sourceUrl)) : []
  const averages = Array.isArray(benchmarks.examAverages) ? benchmarks.examAverages.filter(item => number(item.value) !== null && number(item.value) > 0 && evidenceUrl(item.sourceUrl) && acceptedNames.some(exam => normaliseExam(exam) === normaliseExam(item.exam))) : []
  const compared = []
  for (const reference of [...criteria.map(item => ({ ...item, kind: 'minimum', target: number(item.minScore) })), ...averages.map(item => ({ ...item, kind: 'average', target: number(item.value) }))]) {
    for (const score of examScores.filter(item => normaliseExam(item.exam) === normaliseExam(reference.exam))) {
      const actual = examValue(score, reference)
      if (actual !== null) compared.push({ actual, score, reference, value: referenceAlignment(actual, reference.target, reference, reference.kind === 'minimum' ? 0.7 : 0.85) })
    }
  }
  if (compared.length) {
    // Accepted tests are alternative paths. A cohort average never overrides a
    // known minimum for that path or becomes an eligibility hurdle of its own.
    const paths = compared.map(item => {
      const sameExamMinimums = compared.filter(other => other.score === item.score && other.reference.kind === 'minimum' && normaliseExam(other.reference.exam) === normaliseExam(item.reference.exam) && examVersion(other.reference) === examVersion(item.reference))
      return { ...item, belowMinimum: sameExamMinimums.some(other => other.actual < other.reference.target) }
    })
    const best = paths.sort((a, b) => Number(a.belowMinimum) - Number(b.belowMinimum) || b.value - a.value)[0]
    const unit = /percentile/i.test(best.reference.scoreType || '') ? ' percentile' : ' score'
    const description = best.reference.kind === 'average' ? `published class average ${best.reference.target}${unit}${best.reference.cohort ? ` (${best.reference.cohort})` : ''}; a class average is not a cut-off` : `published minimum ${best.reference.target}${unit}`
    add('exam', 'Entrance exam', best.belowMinimum ? 'review' : best.reference.kind === 'average' && best.actual < best.reference.target ? 'partial' : 'met', `${best.reference.exam}${examVersion(best.reference) ? ` (${examVersion(best.reference)})` : ''}: your ${best.actual}${unit} · ${description}. Exam year, route, category, section cut-offs and cycle require confirmation.`, best.value, { sourceUrl: best.reference.sourceUrl, benchmarkType: best.reference.kind, belowPublishedMinimum: best.belowMinimum })
  } else {
    const compatible = examScores.filter(score => acceptedNames.some(exam => normaliseExam(exam) === normaliseExam(score.exam)))
    add('exam', 'Entrance exam', compatible.length ? 'partial' : 'unknown', compatible.length ? `${compatible.map(score => score.exam).join(', ')} is listed among accepted tests. No comparable, sourced numeric benchmark is available for your recorded score/edition/year; naming an accepted test adds no points.` : !examScores.length ? 'Add your entrance tests and scores to check programme requirements.' : acceptedNames.length ? `Listed tests: ${acceptedNames.join(', ')}. Your recorded tests do not establish eligibility; verify programme-specific routes.` : 'Accepted tests and comparable cut-offs need verification.')
  }

  const qualifications = qualifiedRows(profile)
  const alternateQualifications = Array.isArray(college?.acceptedProfessionalQualifications) ? college.acceptedProfessionalQualifications.map(qualificationName) : []
  const alternateRoute = college?.professionalQualificationAlternative === true && evidenceUrl(college?.qualificationEligibilitySourceUrl)
    ? qualifications.filter(row => completedQualification(row) && alternateQualifications.includes(qualificationName(row.qualification || row.title))) : []
  if (alternateRoute.length) add('professionalRoute', 'Professional qualification admission route', 'partial', `${alternateRoute.map(row => row.qualification || row.title).join(', ')} recorded as completed. The linked programme evidence describes an alternative qualification route. Confirm the current cycle, final examination and equivalence conditions with the institution; this is conditional route context, not a verified eligibility or selection bonus.`, null, { sourceUrl: college.qualificationEligibilitySourceUrl })
  const professional = benchmarks.professionalQualifications
  const acceptedQualifications = Array.isArray(professional?.accepted) ? professional.accepted.map(qualificationName) : []
  const qualifying = qualifications.filter(row => completedQualification(row) && acceptedQualifications.includes(qualificationName(row.qualification || row.title)))
  if (qualifying.length && evidenceUrl(professional?.sourceUrl)) {
    add('credentials', 'Professional qualifications', 'met', `${qualifying.map(row => row.qualification || row.title).join(', ')} recorded as completed and explicitly recognised in this programme’s sourced criteria. This is bounded fit credit, not qualification verification.`, 1, { sourceUrl: professional.sourceUrl })
  } else add('credentials', 'Professional qualifications', 'unknown', qualifications.length ? `${qualifications.map(row => row.qualification || row.title).filter(Boolean).join(', ')} recorded. ${professional && evidenceUrl(professional.sourceUrl) ? 'No completed qualification matching the sourced list is established.' : 'No comparable programme-specific qualification bonus is verified.'} Credentials remain part of your application; institution and employer names do not create automatic points.` : 'Add CA, CS, CMA, a doctorate or other qualifications if applicable. No degree or professional-qualification bonus is assumed without programme evidence.')
  if (profile?.defence_service?.status && !/^(none|not_applicable|no)$/i.test(profile.defence_service.status)) add('defence', 'Defence service', 'partial', 'Your defence service is recorded for the application. Programme-specific service definitions, sponsorship, concessions and required certificates must be checked; no unsupported service bonus is added.')

  const feeValue = number(college?.feesInr)
  const fees = feeValue !== null && feeValue >= 0 ? feeValue : null
  const budgetValue = number(preferences.max_fees_inr)
  const maxFees = budgetValue !== null && budgetValue >= 0 ? budgetValue : null
  const budgetStatus = maxFees === null ? 'not_set' : fees === null ? 'unknown_fees' : fees > maxFees ? 'over_budget' : 'within_budget'
  if (fees !== null && maxFees !== null) {
    const meets = fees <= maxFees
    add('budget', 'Fee budget', meets ? 'met' : 'review', `Reported programme fee ₹${fees.toLocaleString('en-IN')} · your cap ₹${maxFees.toLocaleString('en-IN')}. ${meets ? 'Within the stated fee cap' : 'Above your cap; remains selectable for review'}. Check the fee scope, cycle, accommodation and extra charges.`, meets ? 1 : Math.max(0, maxFees / fees))
  } else add('budget', 'Fee budget', 'unknown', maxFees === null ? 'No budget cap set. Your choices are unrestricted and no affordability penalty is applied.' : 'A comparable programme fee is unavailable. Affordability needs confirmation before this can be recommended within your budget.')

  const cities = Array.isArray(preferences.preferred_cities) ? preferences.preferred_cities : []
  if (cities.length && college?.city) {
    const city = text(college.city)
    const regional = ['delhi ncr', 'ncr', 'delhi-ncr']
    const aligns = cities.some(preferred => regional.includes(text(preferred)) || text(preferred) === city || (text(preferred) === 'delhi' && city === 'new delhi') || (text(preferred) === 'gurgaon' && city === 'gurugram'))
    add('city', 'Location preference', aligns ? 'met' : 'review', `${college.city}${college.geographicScope === 'broader_ncr' ? ' · wider NCR' : ''} · compared with your saved cities.`, aligns ? 1 : 0)
  } else add('city', 'Location preference', 'unknown', 'Add preferred cities to assess location alignment.')
  const preference = programmePreferences(preferences, college)
  if (['aligned', 'conflict'].includes(preference.mode.status)) add('mode', 'Study mode', preference.mode.status === 'aligned' ? 'met' : 'review', `Programme: ${college.mode} · preference: ${preferences.study_mode}. A known study-mode conflict keeps this option outside Recommended; you can still select it as an alternative.`, preference.mode.status === 'aligned' ? 1 : 0)
  else add('mode', 'Study mode', 'unknown', 'The programme mode or your study preference is not recorded.')
  if (preference.programmeFamily.status !== 'not_set') add('programmePreference', 'Programme preference', preference.programmeFamily.status === 'aligned' ? 'met' : preference.programmeFamily.status === 'conflict' ? 'review' : 'unknown', `Your preference: ${preferences.programme} · programme: ${college?.programme || college?.programmeType || 'type to confirm'}. Programme-family conflicts are kept outside Recommended; a saved or explicit choice is preserved.`)

  const ctcValue = getLastDrawnCtc(profile || {})
  const ctc = ctcValue !== null && ctcValue > 0 ? ctcValue : null
  const placementValue = number(college?.averageCtcInr)
  const placementComparable = evidenceUrl(college?.placementSourceUrl) && !/unverified|noncomparable|institution_wide|pooled/.test(college?.averageCtcVerificationStatus || '')
  const placement = placementValue !== null && placementValue > 0 && placementComparable ? placementValue : null
  const financialContext = { lastAnnualCtcInr: ctc, feeToAnnualCtc: ctc && fees !== null ? Number((fees / ctc).toFixed(2)) : null, reportedAverageCtcInr: placement, reportedAverageToLastCtc: ctc && placement ? Number((placement / ctc).toFixed(2)) : null, feeScope: college?.feeScope || null, placementScope: college?.placementScope || null, caution: 'CTC is financial planning context, not admission preference. Cohort averages are not individual salary forecasts; fees exclude foregone earnings and may exclude living costs.' }
  if (ctc) add('ctc', 'Your salary and programme cost', 'partial', `Last annual CTC ₹${ctc.toLocaleString('en-IN')}${financialContext.feeToAnnualCtc !== null ? ` · reported fee is ${financialContext.feeToAnnualCtc}× that annual CTC` : ''}${financialContext.reportedAverageToLastCtc !== null ? ` · published cohort average is ${financialContext.reportedAverageToLastCtc}× your prior CTC` : ''}. Salary receives no admissions-fit points; cohort outcomes do not predict your salary and this is not a payback estimate.`)

  const assessed = reasons.filter(reason => reason.assessed && reason.weight > 0)
  const coveredWeight = assessed.reduce((sum, item) => sum + item.weight, 0)
  const informative = assessed.some(item => ['academics', 'exam', 'experience', 'credentials'].includes(item.key))
  const identityUnverified = college?.dataStatus === 'identity_verification_required'
  const programmeUnavailable = college?.programmeUnavailable === true
  const score = !identityUnverified && !programmeUnavailable && informative && coveredWeight > 0 ? Math.round(assessed.reduce((sum, item) => sum + item.weight * item.value, 0) / coveredWeight * 100) : null
  const eligibilityReasons = reasons.filter(item => ['academics', 'school10', 'school12', 'experienceEligibility', 'degreeDuration'].includes(item.key) || item.key === 'exam' && (item.benchmarkType === 'minimum' || item.belowPublishedMinimum))
  const eligibility = eligibilityReasons.some(item => item.status === 'review') ? 'review_required' : eligibilityReasons.length && eligibilityReasons.every(item => item.status === 'met') ? 'meets_known_criteria' : 'unknown'
  const recommendationGroup = programmeUnavailable ? 'needs_review' : identityUnverified || eligibility === 'review_required' || budgetStatus === 'over_budget' || preference.status === 'conflict' || score !== null && score < 65 ? 'other' : score === null || coveredWeight < 25 || budgetStatus === 'unknown_fees' || preference.status === 'unknown' ? 'needs_review' : 'recommended'
  if (eligibility === 'review_required') warnings.push('At least one published academic, exam or experience requirement needs review. Category, programme and cycle-specific exceptions may apply.')
  if (coveredWeight < 100) warnings.push(`Only ${coveredWeight}% of the 100-point fit framework is assessable. Missing factors are excluded, never scored as zero; a high score with limited coverage is not a comprehensive assessment.`)
  if (identityUnverified) warnings.push('This institution record needs identity verification. A fit score is withheld until that review is complete.')
  if (importedGraduation) warnings.push(`The ${minimumGraduation}% bachelor’s reference comes from imported workbook eligibility text, not a new source verification. Check the linked source and admissions cycle before relying on it.`)
  if (programmeUnavailable) warnings.push('Your saved programme is absent from the current catalogue. Its selection is preserved, but the fit score is withheld until the programme and its current requirements are confirmed.')
  if (preference.status === 'conflict') warnings.push('This programme differs from your saved study mode or programme preference. It remains selectable as an alternative, but is not labelled Recommended. Your explicit or saved selection is preserved.')
  if (preference.status === 'unknown') warnings.push('The programme mode or type is not established well enough to confirm your saved preference. Check it before treating this programme as a recommendation.')
  if (budgetStatus === 'over_budget') warnings.push('The reported programme fee exceeds your saved budget. This option remains selectable; review affordability before including it.')
  if (budgetStatus === 'unknown_fees') warnings.push('The programme fee needs confirmation; this option is not labelled within your budget.')
  if (score !== null && score < 65) warnings.push('The assessable fit factors fall below the 65-point planning threshold. This programme remains available under Other colleges; that threshold is a Unidex heuristic, not an admissions cut-off.')
  if (/historical|recheck|requires_cycle|confirmation_required|previous_cycle/.test([college?.feeVerificationStatus, college?.eligibilityVerificationStatus, college?.cutoffVerificationStatus, college?.qualificationEligibilityVerificationStatus].join(' '))) warnings.push('Some published evidence belongs to an earlier cycle or requires a current-cycle check. Open the linked source before applying.')
  if (!college?.deadline?.date || college.deadline.verificationStatus !== 'verified_current_cycle') warnings.push('Confirm the current application deadline directly with the college; an earlier or unverified date is not treated as a current deadline.')
  return {
    score,
    label: programmeUnavailable ? 'Confirm programme availability' : preference.status === 'conflict' ? 'Outside your preferences' : score === null ? 'More information needed' : budgetStatus === 'over_budget' ? 'Above your budget' : eligibility === 'review_required' ? 'Review requirements' : preference.status === 'unknown' ? 'Confirm programme format' : budgetStatus === 'unknown_fees' ? 'Confirm programme fees' : coveredWeight < 25 ? 'Limited evidence' : score >= 85 ? 'Strong profile alignment' : score >= 65 ? 'Potential profile fit' : 'Explore your options',
    reasons, warnings,
    confidence: { label: coveredWeight >= 80 ? 'Higher coverage' : coveredWeight >= 50 ? 'Partial coverage' : 'Limited coverage', percentage: coveredWeight, assessed: assessed.length, total: Object.keys(WEIGHTS).length },
    eligibility, recommendationGroup, preference,
    budget: { status: budgetStatus, feesInr: fees, maxFeesInr: maxFees, remainingInr: fees !== null && maxFees !== null ? maxFees - fees : null },
    financialContext, methodologyVersion: MATCHING_METHODOLOGY_VERSION,
  }
}

export function rankColleges(profile, colleges) {
  const group = { recommended: 0, needs_review: 1, other: 2 }
  return colleges.map(college => ({ ...college, match: matchCollege(profile, college) })).sort((a, b) => group[a.match.recommendationGroup] - group[b.match.recommendationGroup] || (b.match.score ?? -1) - (a.match.score ?? -1) || b.match.confidence.percentage - a.match.confidence.percentage || String(a.name || '').localeCompare(String(b.name || '')))
}
