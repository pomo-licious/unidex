import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { documentSetupContinuationIssue, documentSetupErrorMessage, isGuidedDocumentSetup, saveDocumentSetupProgress } from '../src/lib/admissionsDocumentsFirst'

const workspace = vi.hoisted(() => ({ current: null }))
vi.mock('../src/context/AdmissionsContext', () => ({ useAdmissions: () => workspace.current }))
vi.mock('../src/components/Layout', () => ({ default: ({ children }) => <main data-workspace-layout="true">{children}</main> }))
import DocumentUpload from '../src/pages/DocumentUpload'

const user = { id: 'setup-document-account', email: 'synthetic@example.invalid' }
function render(path = '/documents?setup=1', overrides = {}) {
  workspace.current = { user, profile: { onboarding: { version: 1, step: 'documents' } }, profileLoaded: true, profileUserId: user.id, profileError: '', setProfile: vi.fn(), saveProfile: vi.fn(), ...overrides }
  return renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><DocumentUpload/></MemoryRouter>)
}
afterEach(() => { workspace.current = null })

describe('guided document navigation', () => {
  it('preserves guided setup from the URL after a refresh loses navigation state', () => {
    expect(isGuidedDocumentSetup('?setup=1', undefined)).toBe(true)
  })
  it('supports existing upload-first navigation from onboarding', () => {
    expect(isGuidedDocumentSetup('', '/onboarding')).toBe(true)
  })
  it('keeps ordinary uploads outside guided setup', () => {
    expect(isGuidedDocumentSetup('?setup=0', '/application-builder')).toBe(false)
  })
  it.each([
    [{ busy: 'batch' }, 'Finish the current upload'],
    [{ loading: true }, 'Wait for your document library'],
    [{ file: { name: 'not-uploaded.pdf' } }, 'Upload your selected file'],
    [{ reviewDoc: { id: 'unapplied-review' } }, 'Save your document review'],
    [{ batchOpen: true }, 'Finish or close the extraction approval'],
    [{ batchSummary: {} }, 'Read and close the import summary'],
    [{ photoToAssign: {} }, 'Save or cancel your profile photo'],
  ])('explains why a pending document action cannot be silently left: %j', (state, message) => {
    expect(documentSetupContinuationIssue(state)).toContain(message)
  })
  it('shows the specific saved-profile correction needed and a way back to setup', () => {
    expect(documentSetupErrorMessage({ code: 'INVALID_PROFILE', details: { phone: 'Enter a valid phone number.' } })).toContain('Enter a valid phone number. Choose Back to setup to correct them')
  })
  it('allows continuing after all pending actions are resolved', () => {
    expect(documentSetupContinuationIssue()).toBe('')
  })
})

describe('saving guided document progress', () => {
  const refreshProfile = async () => ({ onboarding: { version: 1, step: 'personal' } })
  it('preserves freshly extracted data and writes against its current revision', async () => {
    const loadProfileRecord = vi.fn().mockResolvedValue({ revision: 19, profile: { full_name: 'Fresh OCR name', academic_10th: { percentage: 93 }, ai_imports: [], onboarding: { version: 1, step: 'documents' } } })
    const saveProfile = vi.fn().mockResolvedValue({})
    const destination = await saveDocumentSetupProgress({ user, documentsChoice: 'upload', loadProfileRecord, saveProfile, refreshProfile })
    expect({ destination, owner: loadProfileRecord.mock.calls[0][0], profile: saveProfile.mock.calls[0][0], options: saveProfile.mock.calls[0][1] }).toMatchObject({ destination: '/onboarding', owner: user.id, profile: { full_name: 'Fresh OCR name', academic_10th: { percentage: 93 }, onboarding: { step: 'personal', documents_choice: 'upload' } }, options: { expectedRevision: 19 } })
  })
  it('records an explicit manual path without requiring documents', async () => {
    const saveProfile = vi.fn().mockResolvedValue({})
    await saveDocumentSetupProgress({ user, documentsChoice: 'manual', loadProfileRecord: async () => ({ revision: 0, profile: {} }), saveProfile, refreshProfile })
    expect(saveProfile.mock.calls[0][0].onboarding).toMatchObject({ step: 'personal', documents_choice: 'manual' })
  })
  it('propagates a failed or competing save instead of authorizing navigation', async () => {
    const conflict = Object.assign(new Error('Your profile changed in another tab.'), { code: 'PROFILE_CHANGED' })
    await expect(saveDocumentSetupProgress({ user, documentsChoice: 'upload', loadProfileRecord: async () => ({ revision: 7, profile: {} }), saveProfile: async () => { throw conflict } })).rejects.toBe(conflict)
  })
  it('does not rewind a completed profile if another tab finishes setup first', async () => {
    const saveProfile = vi.fn()
    const completed = { onboarding: { version: 1, step: 'complete', completed_at: '2026-10-18T08:00:00.000Z' } }
    const destination = await saveDocumentSetupProgress({ user, documentsChoice: 'upload', loadProfileRecord: async () => ({ revision: 21, profile: completed }), saveProfile, refreshProfile: async () => completed })
    expect({ destination, saves: saveProfile.mock.calls.length }).toEqual({ destination: '/profile', saves: 0 })
  })
  it('resumes a later saved section instead of rewinding it from a stale documents tab', async () => {
    const saveProfile = vi.fn()
    const latest = { full_name: 'Newer saved name', onboarding: { version: 1, step: 'review', documents_choice: 'manual' } }
    let contextProfile = { onboarding: { version: 1, step: 'documents' } }
    const destination = await saveDocumentSetupProgress({ user, documentsChoice: 'upload', loadProfileRecord: async () => ({ revision: 20, profile: latest }), saveProfile, refreshProfile: async () => { contextProfile = latest; return contextProfile } })
    expect({ destination, saves: saveProfile.mock.calls.length, contextStep: contextProfile.onboarding.step, name: contextProfile.full_name }).toEqual({ destination: '/onboarding', saves: 0, contextStep: 'review', name: 'Newer saved name' })
  })
  it.each([undefined, false, null])('does not authorize navigation when save confirmation is missing: %s', async result => {
    await expect(saveDocumentSetupProgress({ user, documentsChoice: 'manual', loadProfileRecord: async () => ({ revision: 0, profile: {} }), saveProfile: async () => result })).rejects.toThrow('not confirmed as saved')
  })
  it('keeps the page open if synchronizing the saved profile fails', async () => {
    await expect(saveDocumentSetupProgress({ user, documentsChoice: 'upload', loadProfileRecord: async () => ({ revision: 20, profile: { onboarding: { version: 1, step: 'review' } } }), saveProfile: vi.fn(), refreshProfile: async () => { throw new Error('Profile refresh failed') } })).rejects.toThrow('Profile refresh failed')
  })
  it('does not write a setup step when the fresh profile could not be read', async () => {
    const saveProfile = vi.fn()
    await saveDocumentSetupProgress({ user, documentsChoice: 'manual', loadProfileRecord: async () => { throw new Error('Connection failed') }, saveProfile }).catch(() => {})
    expect(saveProfile).not.toHaveBeenCalled()
  })
})

describe('guided document page', () => {
  it('replaces workspace navigation with visible steps and an optional manual route', () => {
    expect(render()).toMatch(/Profile setup progress[\s\S]*Add what you have[\s\S]*Class 10 mark sheet[\s\S]*Build my profile with AI[\s\S]*Enter details manually/)
  })
  it('offers a guarded return to setup without requiring a metadata save', () => {
    expect(render()).toMatch(/<button[^>]*disabled=""[^>]*>Back to setup<\/button>/)
  })
  it('does not render the normal workspace shell during setup', () => {
    expect(render()).not.toContain('data-workspace-layout')
  })
  it('keeps the ordinary document library in its workspace shell', () => {
    expect(render('/documents')).toContain('data-workspace-layout="true"')
  })
  it('offers a profile retry instead of advancing after a failed canonical load', () => {
    expect(render('/documents?setup=1', { profileLoaded: false, profileError: 'Could not load your saved profile.' })).toMatch(/Could not load your saved profile\.[\s\S]*Retry profile/)
  })
})
