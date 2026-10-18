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
