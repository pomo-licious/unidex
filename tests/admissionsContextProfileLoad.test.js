import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { setImmediate } from 'node:timers'
import { describe, expect, it } from 'vitest'
import { createEmptyProfile, normalizeAdmissionsProfile } from '../src/lib/admissionsProfile'
import { createWriteQueue } from '../src/lib/admissionsDraft'

const source = readFileSync(new URL('../src/context/AdmissionsContext.jsx', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?from ['"][^'"]+['"]\r?\n/gm, '')
  .replace(/^export /gm, '')
  .replace('return <AdmissionsContext.Provider value={value}>{children}</AdmissionsContext.Provider>', 'return value')

const deferred = () => {
  let resolve, reject
  const promise = new Promise((accept, fail) => { resolve = accept; reject = fail })
  return { promise, resolve, reject }
}
const flush = () => new Promise(resolve => setImmediate(resolve))
const owner = { id: 'synthetic-owner', email: 'owner@example.invalid' }

// Execute the provider's real async operations with deterministic hook storage.
// This makes account changes and out-of-order network responses testable without
// a browser or real member data.
function providerHarness({ loads = [], save = async value => value } = {}) {
  const hooks = [], pendingEffects = [], calls = []
  let cursor = 0, user = owner
  const scope = {
    createContext: () => ({}),
    useContext: () => null,
    useState(initial) {
      const index = cursor++
      if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial
      return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value }]
    },
    useRef(initial) {
      const index = cursor++
      if (!(index in hooks)) hooks[index] = { current: initial }
      return hooks[index]
    },
    useCallback(callback) { cursor++; return callback },
    useEffect(effect, dependencies) {
      const index = cursor++, previous = hooks[index]
      if (!previous || dependencies.some((dependency, position) => dependency !== previous.dependencies[position])) {
        previous?.cleanup?.()
        const current = { dependencies, cleanup: null }
        hooks[index] = current
        pendingEffects.push(() => { current.cleanup = effect() })
      }
    },
    createEmptyProfile, normalizeAdmissionsProfile, createWriteQueue,
    loadAdmissionsProfile: id => { calls.push(id); return loads.shift() || Promise.resolve(null) },
    saveAdmissionsProfile: save,
    listAdmissionsDocuments: async () => [], listCollegePlans: async () => [], getAdmissionsDraft: async () => null,
  }
  vm.runInNewContext(`${source};globalThis.renderProvider=AdmissionsProvider`, scope)
  const test = {
    calls,
    render(nextUser = user) {
      user = nextUser; cursor = 0
      test.value = scope.renderProvider({ user, children: null })
      while (pendingEffects.length) pendingEffects.shift()()
      return test.value
    },
  }
  test.render()
  return test
}

describe('Authoritative profile load for guided setup', () => {
  it('does not expose an unconfirmed empty profile as a loaded account', () => {
    const pending = deferred(), test = providerHarness({ loads: [pending.promise] })
    expect({ loaded: test.value.profileLoaded, owner: test.value.profileUserId, error: test.value.profileError }).toEqual({ loaded: false, owner: null, error: '' })
  })

  it('treats a successful missing profile as a confirmed new account', async () => {
    const test = providerHarness()
    await flush(); test.render()
    expect({ loaded: test.value.profileLoaded, account: test.value.profileUserId, requestedAccount: test.calls[0] }).toEqual({ loaded: true, account: owner.id, requestedAccount: owner.id })
  })

  it('keeps a failed load distinct from an empty new profile', async () => {
    const pending = deferred(), test = providerHarness({ loads: [pending.promise] })
    pending.reject(new Error('Profile unavailable'))
    await flush(); test.render()
    expect({ loaded: test.value.profileLoaded, error: test.value.profileError, loading: test.value.loading }).toEqual({ loaded: false, error: 'Profile unavailable', loading: false })
  })

  it('clears the profile failure only after a successful account-scoped retry', async () => {
    const initial = deferred(), retried = deferred(), test = providerHarness({ loads: [initial.promise, retried.promise] })
    initial.reject(new Error('Try again'))
    await flush(); test.render()
    const retry = test.value.retryProfile()
    retried.resolve({ full_name: 'Recovered Applicant' })
    await retry; test.render()
    expect({ loaded: test.value.profileLoaded, account: test.value.profileUserId, error: test.value.profileError, name: test.value.profile.full_name }).toEqual({ loaded: true, account: owner.id, error: '', name: 'Recovered Applicant' })
  })

  it('retains retry failures as retryable without claiming setup data is loaded', async () => {
    const initial = deferred(), retried = deferred(), test = providerHarness({ loads: [initial.promise, retried.promise] })
    initial.reject(new Error('Initial failure'))
    await flush(); test.render()
    const retry = test.value.retryProfile().catch(error => error.message)
    retried.reject(new Error('Still unavailable'))
    await retry; test.render()
    expect({ loaded: test.value.profileLoaded, error: test.value.profileError }).toEqual({ loaded: false, error: 'Still unavailable' })
  })

  it('does not replace a successful retry with the older initial response', async () => {
    const initial = deferred(), retried = deferred(), test = providerHarness({ loads: [initial.promise, retried.promise] })
    const retry = test.value.retryProfile()
    retried.resolve({ full_name: 'Newer Applicant' })
    await retry
    initial.resolve({ full_name: 'Older Applicant' })
    await flush(); test.render()
    expect(test.value.profile.full_name).toBe('Newer Applicant')
  })

  it('does not replace a confirmed save with a still-pending profile read', async () => {
    const initial = deferred(), test = providerHarness({ loads: [initial.promise] })
    await test.value.saveProfile({ full_name: 'Saved Applicant' })
    initial.resolve({ full_name: 'Older Applicant' })
    await flush(); test.render()
    expect({ name: test.value.profile.full_name, loaded: test.value.profileLoaded }).toEqual({ name: 'Saved Applicant', loaded: true })
  })

  it('ignores a late response after the account has changed', async () => {
    const first = deferred(), second = deferred(), test = providerHarness({ loads: [first.promise, second.promise] })
    test.render({ id: 'second-owner', email: 'second@example.invalid' })
    first.resolve({ full_name: 'First Account Private Name' })
    second.resolve({ full_name: 'Second Account Applicant' })
    await flush(); test.render()
    expect({ name: test.value.profile.full_name, account: test.value.profileUserId }).toEqual({ name: 'Second Account Applicant', account: 'second-owner' })
  })
})
