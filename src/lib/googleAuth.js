const DESTINATIONS = new Set(['/profile', '/onboarding'])
const UNAVAILABLE_MESSAGE = 'Google sign-in is temporarily unavailable. Continue with email.'
const CALLBACK_ERROR_MESSAGE = 'Google sign-in could not be completed. Try again or continue with email.'

export function googleRedirectUrl(origin, next = '/profile') {
  const base = new URL(origin)
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))) throw new Error(UNAVAILABLE_MESSAGE)
  const url = new URL('/login', base.origin)
  url.searchParams.set('oauth', 'google')
  url.searchParams.set('next', DESTINATIONS.has(next) ? next : '/profile')
  return url.href
}

export function readGoogleCallback(location) {
  const query = new URLSearchParams(location.search || '')
  const fragment = new URLSearchParams((location.hash || '').replace(/^#/, ''))
  const isCallback = (!location.pathname || location.pathname === '/login') && query.get('oauth') === 'google'
  const destination = DESTINATIONS.has(query.get('next')) ? query.get('next') : '/profile'
  const failed = [query, fragment].some(params => params.has('error') || params.has('error_code'))
  const denied = [query, fragment].some(params => params.get('error') === 'access_denied' || params.get('error_code') === 'access_denied')
  return {
    isCallback,
    destination,
    error: isCallback && failed ? denied ? 'Google sign-in was cancelled. Try again or continue with email.' : CALLBACK_ERROR_MESSAGE : '',
  }
}

export async function startGoogleSignIn(client, {
  origin = window.location.origin,
  next = '/profile',
  projectUrl = import.meta.env.VITE_SUPABASE_URL,
  publicKey = import.meta.env.VITE_SUPABASE_ANON_KEY,
  fetchImpl = globalThis.fetch,
} = {}) {
  const redirectTo = googleRedirectUrl(origin, next)
  if (!projectUrl || !publicKey) throw new Error(UNAVAILABLE_MESSAGE)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  let response
  try {
    // Public provider availability only. No account session or private data is sent.
    response = await fetchImpl(new URL('/auth/v1/settings', projectUrl), { headers: { apikey: publicKey }, cache: 'no-store', signal: controller.signal })
  } catch {
    throw new Error(UNAVAILABLE_MESSAGE)
  } finally { clearTimeout(timeout) }
  if (!response.ok) throw new Error(UNAVAILABLE_MESSAGE)
  let settings
  try { settings = await response.json() } catch { throw new Error(UNAVAILABLE_MESSAGE) }
  if (settings?.external?.google !== true) throw new Error(UNAVAILABLE_MESSAGE)
  try {
    const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error || !data?.url) throw new Error(UNAVAILABLE_MESSAGE)
    return data
  } catch { throw new Error(UNAVAILABLE_MESSAGE) }
}

export function resolveGoogleCallback(client, onSession, onError) {
  let active = true
  let authVersion = 0
  let completed = false
  const finish = (session, error) => {
    if (!active || completed) return
    if (error) onError(CALLBACK_ERROR_MESSAGE)
    else if (session?.user) { completed = true; onSession(session) }
    else onError(CALLBACK_ERROR_MESSAGE)
  }
  const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
    if (!['SIGNED_IN', 'SIGNED_OUT', 'INITIAL_SESSION'].includes(event)) return
    authVersion++
    finish(session)
  })
  const lookupVersion = authVersion
  Promise.resolve().then(() => client.auth.getSession()).then(({ data, error }) => {
    if (authVersion === lookupVersion) finish(data?.session, error)
  }).catch(() => { if (authVersion === lookupVersion) finish(null, new Error('Session lookup failed')) })
  return () => { active = false; subscription?.unsubscribe() }
}
