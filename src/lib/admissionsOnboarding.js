export const SETUP_STEPS = Object.freeze(['welcome', 'documents', 'personal', 'academics', 'exams', 'work', 'preferences', 'review', 'complete'])

const isRecord = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const hasText = value => typeof value === 'string' && Boolean(value.trim())
const isTimestamp = value => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19)
const isChoice = value => value === null || value === 'upload' || value === 'manual'
const validNumber = (value, min, max) => (typeof value === 'number' || hasText(value))
  && Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max

// Absence is handled by getProfileSetupStep. Present but invalid metadata must
// never grant an existing profile an automatic completion bypass.
export function normalizeProfileOnboarding(value) {
  const metadata = isRecord(value) && value.version === 1 ? value : {}
  const requestedStep = SETUP_STEPS.includes(metadata.step) ? metadata.step : 'welcome'
  const completedAt = requestedStep === 'complete' && isTimestamp(metadata.completed_at) ? metadata.completed_at : null
  return {
    version: 1,
    step: requestedStep === 'complete' && !completedAt ? 'review' : requestedStep,
    documents_choice: isChoice(metadata.documents_choice) ? metadata.documents_choice : null,
    completed_at: completedAt,
  }
}

function isEstablishedProfile(profile) {
  const graduation = isRecord(profile.academic_graduation) ? profile.academic_graduation : {}
  const hasPercentage = validNumber(graduation.percentage, 0, 100)
  const hasScale = graduation.cgpa_scale !== undefined && graduation.cgpa_scale !== null
    && !(typeof graduation.cgpa_scale === 'string' && !graduation.cgpa_scale.trim())
  const hasCgpa = validNumber(graduation.cgpa, 0, 20)
    && (!hasScale || validNumber(graduation.cgpa_scale, 1, 100) && Number(graduation.cgpa) <= Number(graduation.cgpa_scale))
  return hasText(profile.full_name) && hasText(profile.email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)
    && hasText(profile.phone) && /^\+?[\d\s()-]{7,22}$/.test(profile.phone)
    && hasText(profile.current_city) && hasText(graduation.degree) && (hasPercentage || hasCgpa)
}

export function getProfileSetupStep(profile) {
  if (!isRecord(profile)) return 'welcome'
  if (Object.hasOwn(profile, 'onboarding')) return normalizeProfileOnboarding(profile.onboarding).step
  return isEstablishedProfile(profile) ? 'complete' : 'welcome'
}

export function needsProfileSetup(profile) {
  return getProfileSetupStep(profile) !== 'complete'
}

export function withProfileSetup(profile, step, { documentsChoice, completedAt } = {}) {
  if (!SETUP_STEPS.includes(step)) throw new Error('Choose a valid profile setup step.')
  if (documentsChoice !== undefined && !isChoice(documentsChoice)) throw new Error('Choose whether to upload documents or enter details manually.')
  if (completedAt !== undefined && completedAt !== null && !isTimestamp(completedAt)) throw new Error('The profile setup completion time is invalid.')
  const previous = normalizeProfileOnboarding(isRecord(profile) ? profile.onboarding : null)
  const completion = completedAt === undefined ? previous.completed_at : completedAt
  if (step === 'complete' && !isTimestamp(completion)) throw new Error('Confirm profile setup before opening your overview.')
  return {
    ...(isRecord(profile) ? profile : {}),
    onboarding: {
      version: 1,
      step,
      documents_choice: documentsChoice === undefined ? previous.documents_choice : documentsChoice,
      completed_at: step === 'complete' ? completion : null,
    },
  }
}
