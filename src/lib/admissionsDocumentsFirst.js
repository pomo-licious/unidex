import { normalizeAdmissionsProfile } from './admissionsProfile'
import { getProfileSetupStep, needsProfileSetup, SETUP_STEPS, withProfileSetup } from './admissionsOnboarding'

const answeredAccounts = new Set()
const sessionKey = userId => `unidex:documents-first:v1:${userId}`

function browserSession() {
  try { return globalThis.sessionStorage } catch { return null }
}

export function hasAnsweredDocumentsFirst(userId, storage = browserSession()) {
  if (!userId) return false
  if (answeredAccounts.has(userId)) return true
  try { return storage?.getItem(sessionKey(userId)) === 'answered' } catch { return false }
}

export function answerDocumentsFirst(userId, storage = browserSession()) {
  if (!userId) return
  // The in-memory fallback also prevents repeat prompts when storage is blocked.
  answeredAccounts.add(userId)
  try { storage?.setItem(sessionKey(userId), 'answered') } catch { /* Keep the choice for this running session. */ }
}

export function shouldOfferDocumentsFirst({ userId, documents, documentsLoaded, documentsUserId, dismissed = false, enabled = true }) {
  return Boolean(enabled && userId && documentsLoaded && documentsUserId === userId && Array.isArray(documents) && documents.length === 0 && !dismissed)
}

export function documentReturnPath(value) {
  return ['/profile', '/onboarding', '/application-builder'].includes(value) ? value : '/profile'
}

export function formReturnPath(pathname) {
  if (pathname === '/onboarding') return '/onboarding'
  if (pathname === '/application-builder' || pathname?.startsWith('/apply/')) return '/application-builder'
  return '/profile'
}

export function isGuidedDocumentSetup(search, returnTo) {
  return new URLSearchParams(search || '').get('setup') === '1' || returnTo === '/onboarding'
}

export function documentSetupContinuationIssue({ busy, loading, file, reviewDoc, batchOpen, batchSummary, photoToAssign } = {}) {
  if (busy) return 'Finish the current upload, extraction or save before continuing.'
  if (loading) return 'Wait for your document library to load before continuing.'
  if (file) return 'Upload your selected file, or clear it before continuing.'
  if (batchOpen) return 'Finish or close the extraction approval before continuing.'
  if (batchSummary) return 'Read and close the import summary before continuing.'
  if (photoToAssign) return 'Save or cancel your profile photo choice before continuing.'
  if (reviewDoc) return 'Save your document review, or close it to leave its changes unapplied, before continuing.'
  return ''
}

export function documentSetupErrorMessage(error) {
  if (error?.code !== 'INVALID_PROFILE') return error?.message || 'Your setup progress could not be saved. Please retry.'
  const details = error.details && typeof error.details === 'object' ? Object.values(error.details).filter(value => typeof value === 'string').slice(0, 3).join(' ') : ''
  return `Some saved profile details need attention.${details ? ` ${details}` : ''} Choose Back to setup to correct them, then continue.`
}

export async function saveDocumentSetupProgress({ user, documentsChoice, loadProfileRecord, saveProfile, refreshProfile, nextStep = 'personal' }) {
  if (!user?.id) throw new Error('Please sign in again before continuing profile setup.')
  if (!['personal', 'review'].includes(nextStep)) throw new Error('Choose profile review or manual profile setup.')
  const record = await loadProfileRecord(user.id)
  const latest = normalizeAdmissionsProfile(record.profile, user)
  if (needsProfileSetup(latest) && SETUP_STEPS.indexOf(getProfileSetupStep(latest)) <= SETUP_STEPS.indexOf(nextStep)) {
    const next = withProfileSetup(latest, nextStep, { documentsChoice })
    const saved = await saveProfile(next, { expectedRevision: record.revision })
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Your setup progress was not confirmed as saved. Please retry before continuing.')
  }
  // Account-scoped context must reflect a newer step before its destination mounts.
  const refreshed = await refreshProfile()
  if (!refreshed || typeof refreshed !== 'object' || Array.isArray(refreshed)) throw new Error('Your saved profile could not be refreshed. Please retry before continuing.')
  return needsProfileSetup(normalizeAdmissionsProfile(refreshed, user)) ? '/onboarding' : '/profile'
}
