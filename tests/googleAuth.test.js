import { describe, expect, it, vi } from 'vitest'
import { googleRedirectUrl, readGoogleCallback, resolveGoogleCallback, startGoogleSignIn } from '../src/lib/googleAuth'

const origin = 'https://www.unidex.co.in'
const options = { origin, projectUrl: 'https://synthetic.supabase.co', publicKey: 'synthetic-public-key' }
const enabled = async () => new Response(JSON.stringify({ external: { google: true } }), { status: 200 })
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }
function callbackClient(result) {
  let listener
  let finishLookup
  const pending = result || new Promise(resolve => { finishLookup = resolve })
  const unsubscribe = vi.fn()
  return {
    client: { auth: { onAuthStateChange: callback => { listener = callback; return { data: { subscription: { unsubscribe } } } }, getSession: () => pending } },
    event: (event, session) => listener(event, session),
    finish: value => finishLookup(value),
    unsubscribe,
  }
}

describe('Google OAuth browser flow', () => {
  it('builds a callback on the current origin with an allowed onboarding destination', () => {
    expect(googleRedirectUrl(origin, '/onboarding')).toBe('https://www.unidex.co.in/login?oauth=google&next=%2Fonboarding')
  })

  it('does not accept an external post-login destination', () => {
    expect(googleRedirectUrl(origin, '//external.invalid')).toBe('https://www.unidex.co.in/login?oauth=google&next=%2Fprofile')
  })

  it('displays a declined callback without exposing its raw error description', () => {
    expect(readGoogleCallback({ search: '?oauth=google&next=%2Fonboarding', hash: '#error=access_denied&error_description=synthetic-private-detail' })).toEqual({ isCallback: true, destination: '/onboarding', error: 'Google sign-in was cancelled. Try again or continue with email.' })
  })

  it('rejects a forged callback destination even when a valid session follows', () => {
    expect(readGoogleCallback({ search: '?oauth=google&next=https%3A%2F%2Fexternal.invalid' }).destination).toBe('/profile')
  })

  it('keeps a disabled provider on the app instead of starting a broken redirect', async () => {
    const signInWithOAuth = vi.fn()
    const error = await startGoogleSignIn({ auth: { signInWithOAuth } }, { ...options, fetchImpl: async () => new Response(JSON.stringify({ external: { google: false } })) }).catch(error => error)
    expect({ message: error.message, oauthCalls: signInWithOAuth.mock.calls.length }).toEqual({ message: 'Google sign-in is temporarily unavailable. Continue with email.', oauthCalls: 0 })
  })

  it('starts the configured provider with the safe public callback', async () => {
    const signInWithOAuth = vi.fn(async () => ({ data: { url: 'https://synthetic.supabase.co/auth/v1/authorize' } }))
    await startGoogleSignIn({ auth: { signInWithOAuth } }, { ...options, next: '/onboarding', fetchImpl: enabled })
    expect(signInWithOAuth.mock.calls).toEqual([[{ provider: 'google', options: { redirectTo: 'https://www.unidex.co.in/login?oauth=google&next=%2Fonboarding' } }]])
  })

  it('leaves network failures recoverable without beginning OAuth', async () => {
    const signInWithOAuth = vi.fn()
    const error = await startGoogleSignIn({ auth: { signInWithOAuth } }, { ...options, fetchImpl: async () => { throw new Error('synthetic network error') } }).catch(error => error)
    expect({ message: error.message, oauthCalls: signInWithOAuth.mock.calls.length }).toEqual({ message: 'Google sign-in is temporarily unavailable. Continue with email.', oauthCalls: 0 })
  })

  it('keeps raw provider configuration errors out of the sign-in form', async () => {
    const client = { auth: { signInWithOAuth: async () => ({ error: new Error('synthetic-private-provider-configuration') }) } }
    await expect(startGoogleSignIn(client, { ...options, fetchImpl: enabled })).rejects.toThrow('Google sign-in is temporarily unavailable. Continue with email.')
  })

  it('completes an implicit callback from the SDK-restored session', async () => {
    const fixture = callbackClient(Promise.resolve({ data: { session: { user: { id: 'synthetic-user' } } } }))
    const sessions = []
    const cleanup = resolveGoogleCallback(fixture.client, session => sessions.push(session.user.id), () => {})
    await flush()
    cleanup()
    expect(sessions).toEqual(['synthetic-user'])
  })

  it('reports a callback with no session instead of leaving a permanent loader', async () => {
    const fixture = callbackClient(Promise.resolve({ data: { session: null } }))
    const errors = []
    const cleanup = resolveGoogleCallback(fixture.client, () => {}, message => errors.push(message))
    await flush()
    cleanup()
    expect(errors).toEqual(['Google sign-in could not be completed. Try again or continue with email.'])
  })

  it('keeps a newer sign-in event ahead of an older empty session lookup', async () => {
    const fixture = callbackClient()
    const outcomes = []
    const cleanup = resolveGoogleCallback(fixture.client, session => outcomes.push(session.user.id), error => outcomes.push(error))
    await Promise.resolve()
    fixture.event('SIGNED_IN', { user: { id: 'new-session' } })
    fixture.finish({ data: { session: null } })
    await flush()
    cleanup()
    expect(outcomes).toEqual(['new-session'])
  })

  it('does not restore an older session after a newer sign-out event', async () => {
    const fixture = callbackClient()
    const sessions = []
    const cleanup = resolveGoogleCallback(fixture.client, session => sessions.push(session.user.id), () => {})
    await Promise.resolve()
    fixture.event('SIGNED_OUT', null)
    fixture.finish({ data: { session: { user: { id: 'old-session' } } } })
    await flush()
    cleanup()
    expect(sessions).toEqual([])
  })

  it('ignores delayed callback results after the page unmounts', async () => {
    const fixture = callbackClient()
    const sessions = []
    const cleanup = resolveGoogleCallback(fixture.client, session => sessions.push(session.user.id), () => {})
    cleanup()
    fixture.finish({ data: { session: { user: { id: 'late-session' } } } })
    await flush()
    expect({ sessions, unsubscribed: fixture.unsubscribe.mock.calls.length }).toEqual({ sessions: [], unsubscribed: 1 })
  })
})
