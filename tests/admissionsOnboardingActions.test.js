import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { URLSearchParams } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { profileFingerprint } from '../src/lib/admissionsAiReview'
import { SETUP_STEPS, getProfileSetupStep, withProfileSetup } from '../src/lib/admissionsOnboarding'
import { normalizeAdmissionsProfile, validateAdmissionsProfile } from '../src/lib/admissionsProfile'
import { getProfileSectionForPath } from '../src/lib/admissionsProfileSections'

const componentSource = readFileSync(new URL('../src/pages/Onboarding.jsx', import.meta.url), 'utf8')
const bodyStart = componentSource.indexOf('export default function Onboarding() {') + 'export default function Onboarding() {'.length
const bodyEnd = componentSource.indexOf('\n  if (loading', bodyStart)
if (bodyStart < 37 || bodyEnd < bodyStart) throw new Error('The onboarding action harness must be updated for the component structure.')
const actionSource = `function Onboarding() {${componentSource.slice(bodyStart, bodyEnd)}\nreturn { saveStep, retry, step, busy, actionError, reviewed, setReviewed, setViewStep, editingReview, setReviewOrigin, editReviewSection }; }`
const owner = { id: 'synthetic-owner', email: 'owner@example.invalid' }
const baseProfile = step => normalizeAdmissionsProfile(withProfileSetup({ full_name: 'Synthetic Applicant', email: owner.email }, step), owner)
const deferred = () => {
  let resolve
  const promise = new Promise(accept => { resolve = accept })
  return { promise, resolve }
}

// Exercise the component's real async handlers; JSX and visual assertions are
// covered separately. The controlled hooks make pending requests and unmounts
// deterministic without starting a browser or accessing a member account.
function actionsHarness({ step = 'welcome', profile = baseProfile(step), revision = 7, latest = profile, load, save, retry, query = '' } = {}) {
  const hooks = [], effects = []
  let cursor = 0, searchParams = new URLSearchParams(query)
  const setSearchParams = vi.fn(next => { searchParams = new URLSearchParams(typeof next === 'function' ? next(searchParams) : next) })
  const workspace = {
    user: owner, profile, loading: false, saving: false, error: '', profileLoaded: true, profileUserId: owner.id,
    documents: [], documentsLoaded: true, documentsUserId: owner.id,
    saveProfile: vi.fn(async (...args) => {
      const saved = save ? await save(...args) : args[0]
      if (saved) workspace.profile = saved
      return saved
    }),
    retryProfile: vi.fn(async () => {
      if (retry) return retry(workspace)
      workspace.profile = latest
      return latest
    }),
  }
  const loadRecord = vi.fn(load || (async () => ({ profile: latest, revision })))
  const scope = {
    document: {}, URLSearchParams, details: ['personal', 'academics', 'exams', 'work', 'preferences'],
    useNavigate: () => vi.fn(), useAdmissions: () => workspace,
    useSearchParams: () => [searchParams, setSearchParams],
    useState(initial) {
      const index = cursor++
      if (!(index in hooks)) hooks[index] = initial
      return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value }]
    },
    useRef(initial) {
      const index = cursor++
      if (!(index in hooks)) hooks[index] = { current: initial }
      return hooks[index]
    },
    useEffect(effect) {
      const index = cursor++
      if (!(index in hooks)) { hooks[index] = true; effects.push(effect) }
    },
    loadAdmissionsProfileRecord: loadRecord,
    profileFingerprint, SETUP_STEPS, getProfileSetupStep, withProfileSetup, normalizeAdmissionsProfile, validateAdmissionsProfile, getProfileSectionForPath,
  }
  vm.runInNewContext(`${actionSource};globalThis.renderActions=Onboarding`, scope)
  const cleanups = []
  const test = {
    workspace, loadRecord, setSearchParams,
    query: () => searchParams.toString(),
    render() {
      cursor = 0
      test.actions = scope.renderActions()
      while (effects.length) cleanups.push(effects.shift()())
      return test.actions
    },
    unmount() { cleanups.splice(0).forEach(cleanup => cleanup?.()) },
  }
  test.render()
  return test
}

describe('Guided onboarding save actions', () => {
  it('refreshes a stale displayed profile without saving or advancing over newer details', async () => {
    const newer = baseProfile('exams'), afterSave = vi.fn()
    const test = actionsHarness({ step: 'review', latest: newer })
    test.actions.setReviewed(true); test.actions.setViewStep('preferences'); test.render()
    await test.actions.saveStep('complete', { complete: true, afterSave }); test.render()
    expect({ saves: test.workspace.saveProfile.mock.calls.length, retries: test.workspace.retryProfile.mock.calls.length, step: test.actions.step, reviewed: test.actions.reviewed, continued: afterSave.mock.calls.length, error: test.actions.actionError })
      .toEqual({ saves: 0, retries: 1, step: 'exams', reviewed: false, continued: 0, error: 'Your profile was updated in another window. We’ve loaded your latest saved step. Review it before continuing.' })
  })

  it('advances only after a confirmed save against the freshly loaded revision', async () => {
    const afterSave = vi.fn(), test = actionsHarness({ revision: 19 })
    await test.actions.saveStep('documents', { documentsChoice: 'upload', afterSave }); test.render()
    const [saved, options] = test.workspace.saveProfile.mock.calls[0]
    expect({ account: test.loadRecord.mock.calls[0][0], revision: options.expectedRevision, step: saved.onboarding.step, choice: saved.onboarding.documents_choice, displayed: test.actions.step, continued: afterSave.mock.calls.length, busy: test.actions.busy })
      .toEqual({ account: owner.id, revision: 19, step: 'documents', choice: 'upload', displayed: 'documents', continued: 1, busy: false })
  })

  it('requires the final review affirmation before persisting completion', async () => {
    const test = actionsHarness({ step: 'review' })
    await test.actions.saveStep('complete', { complete: true }); test.render()
    expect({ saves: test.workspace.saveProfile.mock.calls.length, step: test.actions.step, busy: test.actions.busy, error: test.actions.actionError })
      .toEqual({ saves: 0, step: 'review', busy: false, error: 'Please confirm that you have checked your details before finishing setup.' })
  })

  it('opens personal details to repair an invalid legacy phone instead of trapping the welcome action', async () => {
    const profile = normalizeAdmissionsProfile({ full_name: 'Synthetic Applicant', email: owner.email, phone: 'invalid-phone' }, owner)
    const afterSave = vi.fn(), test = actionsHarness({ profile })
    await test.actions.saveStep('documents', { afterSave }); test.render()
    expect({ saves: test.workspace.saveProfile.mock.calls.length, step: test.actions.step, busy: test.actions.busy, continued: afterSave.mock.calls.length, error: test.actions.actionError })
      .toEqual({ saves: 0, step: 'personal', busy: false, continued: 0, error: 'Please check this saved detail before continuing: Enter a valid phone number, including country code where needed.' })
  })

  it('persists an explicit completion timestamp after review is affirmed', async () => {
    const test = actionsHarness({ step: 'review' })
    test.actions.setReviewed(true); test.render()
    await test.actions.saveStep('complete', { complete: true }); test.render()
    const [saved] = test.workspace.saveProfile.mock.calls[0]
    expect({ step: test.actions.step, completionIsValid: Number.isFinite(Date.parse(saved.onboarding.completed_at)), reviewed: test.actions.reviewed })
      .toEqual({ step: 'complete', completionIsValid: true, reviewed: false })
  })

  it('clears the review-edit query only after returning to the saved review and preserves unrelated parameters', async () => {
    const test = actionsHarness({ step: 'personal', query: 'review=1&from=documents' })
    const editingBefore = test.actions.editingReview
    await test.actions.saveStep('review'); test.render()
    expect({ editingBefore, editingAfter: test.actions.editingReview, step: test.actions.step, query: test.query(), options: test.setSearchParams.mock.calls[0][1] })
      .toEqual({ editingBefore: true, editingAfter: false, step: 'review', query: 'from=documents', options: { replace: true } })
  })

  it('preserves the review-edit query while a section save fails', async () => {
    const test = actionsHarness({ step: 'personal', query: 'review=1', save: async () => { throw new Error('Save unavailable') } })
    await test.actions.saveStep('review'); test.render()
    expect({ editing: test.actions.editingReview, step: test.actions.step, query: test.query(), error: test.actions.actionError })
      .toEqual({ editing: true, step: 'personal', query: 'review=1', error: 'Save unavailable' })
  })

  it('keeps the current step and exposes a save failure without invoking navigation', async () => {
    const afterSave = vi.fn(), test = actionsHarness({ save: async () => { throw new Error('Save unavailable') } })
    await test.actions.saveStep('documents', { afterSave }); test.render()
    expect({ step: test.actions.step, error: test.actions.actionError, busy: test.actions.busy, continued: afterSave.mock.calls.length })
      .toEqual({ step: 'welcome', error: 'Save unavailable', busy: false, continued: 0 })
  })

  it('rejects an unconfirmed save response and releases the action lock for retry', async () => {
    let first = true
    const afterSave = vi.fn(), test = actionsHarness({ save: async value => { if (first) { first = false; return null } return value } })
    await test.actions.saveStep('documents', { afterSave }); test.render()
    const firstError = test.actions.actionError
    await test.actions.saveStep('documents', { afterSave }); test.render()
    expect({ firstError, saves: test.workspace.saveProfile.mock.calls.length, step: test.actions.step, error: test.actions.actionError, continued: afterSave.mock.calls.length })
      .toEqual({ firstError: 'Your progress was not confirmed. Please try again.', saves: 2, step: 'documents', error: '', continued: 1 })
  })

  it('locks duplicate actions while a profile read is pending', async () => {
    const pending = deferred(), profile = baseProfile('welcome'), afterSave = vi.fn()
    const test = actionsHarness({ profile, load: () => pending.promise })
    const first = test.actions.saveStep('documents', { afterSave })
    const second = test.actions.saveStep('documents', { afterSave })
    pending.resolve({ profile, revision: 8 })
    await Promise.all([first, second]); test.render()
    expect({ reads: test.loadRecord.mock.calls.length, saves: test.workspace.saveProfile.mock.calls.length, continued: afterSave.mock.calls.length, busy: test.actions.busy })
      .toEqual({ reads: 1, saves: 1, continued: 1, busy: false })
  })

  it('does not save or navigate after unmounting while the latest account profile is loading', async () => {
    const pending = deferred(), profile = baseProfile('welcome'), afterSave = vi.fn()
    const test = actionsHarness({ profile, load: () => pending.promise })
    const saving = test.actions.saveStep('documents', { afterSave })
    test.unmount(); pending.resolve({ profile, revision: 8 })
    await saving
    expect({ saves: test.workspace.saveProfile.mock.calls.length, continued: afterSave.mock.calls.length }).toEqual({ saves: 0, continued: 0 })
  })

  it('does not invoke post-save navigation after its account view unmounts', async () => {
    const pending = deferred(), reachedSave = deferred(), afterSave = vi.fn()
    const test = actionsHarness({ save: async () => { reachedSave.resolve(); return pending.promise } })
    const saving = test.actions.saveStep('documents', { afterSave })
    await reachedSave.promise
    test.unmount(); pending.resolve(baseProfile('documents'))
    await saving
    expect(afterSave).not.toHaveBeenCalled()
  })

  it('surfaces retry failures and releases the lock for another attempt', async () => {
    let first = true
    const test = actionsHarness({ retry: async () => { if (first) { first = false; throw new Error('Reload unavailable') } } })
    await test.actions.retry(); test.render()
    const firstError = test.actions.actionError
    await test.actions.retry(); test.render()
    expect({ firstError, retries: test.workspace.retryProfile.mock.calls.length, error: test.actions.actionError, busy: test.actions.busy })
      .toEqual({ firstError: 'Reload unavailable', retries: 2, error: '', busy: false })
  })
})
