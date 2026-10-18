import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createEmptyProfile, validateAdmissionsProfile } from '../src/lib/admissionsProfile'
import { getProfileSectionForPath } from '../src/lib/admissionsProfileSections'
import { withProfileSetup } from '../src/lib/admissionsOnboarding'
import AdmissionsProfileForm from '../src/components/AdmissionsProfileForm'
import SetupShell from '../src/components/SetupShell'

const workspace = vi.hoisted(() => ({ current: null }))
vi.mock('../src/context/AdmissionsContext', () => ({ useAdmissions: () => workspace.current }))
import Onboarding from '../src/pages/Onboarding'

const user = { id: 'guided-account', email: 'student@example.com', user_metadata: { full_name: 'Applicant Example' } }
const profile = createEmptyProfile(user)
const form = props => renderToStaticMarkup(<AdmissionsProfileForm initialProfile={profile} onSave={() => {}} {...props}/>)
function onboarding(step, overrides = {}, path = '/onboarding') {
  workspace.current = { user, profile: withProfileSetup(profile, step, step === 'complete' ? { completedAt: '2026-10-18T08:00:00.000Z' } : {}), loading: false, saving: false, saveProfile: vi.fn(), profileLoaded: true, profileUserId: user.id, profileError: '', retryProfile: vi.fn(), documents: [], documentsLoaded: true, documentsUserId: user.id, ...overrides }
  return renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><Onboarding/></MemoryRouter>)
}
afterEach(() => { workspace.current = null })

describe('guided profile sections', () => {
  it('routes a saved invalid phone number to the editable personal step', () => {
    const { errors } = validateAdmissionsProfile({ ...profile, phone: 'invalid phone' })
    expect(getProfileSectionForPath(Object.keys(errors)[0])).toBe('personal')
  })
  it('routes a saved out-of-range academic mark to the editable education step', () => {
    const { errors } = validateAdmissionsProfile({ ...profile, academic_10th: { percentage: 150 } })
    expect(getProfileSectionForPath(Object.keys(errors)[0])).toBe('academics')
  })
  it('renders only the requested section even when a save handler is present', () => {
    expect(form({ section: 'exams', guided: true })).not.toContain('aria-label="Personal information"')
  })
  it('shows exam inputs for the externally selected exam step', () => {
    expect(form({ section: 'exams', guided: true })).toContain('aria-label="Entrance exam scores"')
  })
  it('removes the internal section navigator in guided mode', () => {
    expect(form({ section: 'personal', guided: true })).not.toContain('aria-label="Profile sections"')
  })
  it('makes continuing a submit action so progress cannot advance without a save', () => {
    expect(form({ section: 'personal', guided: true, submitLabel: 'Save & continue' })).toMatch(/type="submit" value="continue"[^>]*>.*?Save &amp; continue/s)
  })
  it('makes going back a save action in guided mode', () => {
    expect(form({ section: 'academics', guided: true, onBack: true })).toMatch(/type="submit" value="back"[^>]*>.*?Save &amp; back/s)
  })
  it('keeps the existing section navigator for ordinary profile editing', () => {
    expect(form({})).toContain('aria-label="Profile sections"')
  })
})

describe('documents-first guided experience', () => {
  it('starts with a dedicated welcome instead of exposing all profile fields', () => {
    expect(onboarding('welcome')).not.toContain('name="email"')
  })
  it('explains the sequence on the welcome page', () => {
    expect(onboarding('welcome')).toContain('1. Bring your documents')
  })
  it('lets applicants choose manual entry when documents are unavailable', () => {
    expect(onboarding('documents')).toContain('I’ll enter details myself')
  })
  it('makes government IDs explicitly optional during setup', () => {
    expect(onboarding('documents')).toContain('PAN, Aadhaar, passport and other ID proofs are optional.')
  })
  it('does not stack the old documents-first popup over the guided personal step', () => {
    expect(onboarding('personal')).not.toContain('role="dialog"')
  })
  it('shows optional information with section-specific add actions', () => {
    expect(onboarding('review')).toContain('Add missing information')
  })
  it('shows the filled review without making applicants re-enter a form', () => {
    expect(onboarding('review')).not.toContain('<form')
  })
  it('returns explicit section edits directly to review after saving', () => {
    expect(onboarding('academics', {}, '/onboarding?review=1')).toContain('Save &amp; return to review')
  })
  it('keeps sequential saves for applicants who chose manual entry', () => {
    expect(onboarding('academics')).toContain('Save &amp; continue')
  })
  it('does not present a five-section checklist while correcting an AI-filled section', () => {
    expect(onboarding('academics', {}, '/onboarding?review=1')).toContain('REVIEW · EDIT SELECTED DETAILS')
  })
  it('requires a review affirmation before enabling the finish action', () => {
    expect(onboarding('review')).toMatch(/<button[^>]*disabled=""[^>]*>.*?Finish setup/s)
  })
  it('shows the overview CTA only after confirmed completion metadata', () => {
    expect(onboarding('complete')).toContain('href="/profile"')
  })
  it('treats failed profile loads as a retry state instead of a new profile', () => {
    expect(onboarding('welcome', { profileLoaded: false, profileError: 'Connection interrupted' })).toContain('Try loading again')
  })
  it('keeps account settings accessible while setup is incomplete', () => {
    expect(renderToStaticMarkup(<MemoryRouter><SetupShell step="documents" title="Upload"/></MemoryRouter>)).toContain('href="/account"')
  })
})
