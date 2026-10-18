import { describe, expect, it } from 'vitest'
import { createEmptyProfile, normalizeAdmissionsProfile } from '../src/lib/admissionsProfile'
import { SETUP_STEPS, getProfileSetupStep, needsProfileSetup, normalizeProfileOnboarding, withProfileSetup } from '../src/lib/admissionsOnboarding'

const completedAt = '2026-10-18T12:30:00.000Z'
const established = patch => ({
  full_name: 'Synthetic Applicant', email: 'applicant@example.invalid', phone: '+91 98765 43210', current_city: 'Delhi',
  academic_graduation: { degree: 'B.Com', percentage: 72 }, ...patch,
})

describe('Guided profile setup state', () => {
  it('starts a new account at welcome even when authentication supplied a name and email', () => {
    expect(getProfileSetupStep(createEmptyProfile({ email: 'applicant@example.invalid', user_metadata: { full_name: 'Synthetic Applicant' } }))).toBe('welcome')
  })

  it('defines each resumable setup step in order', () => {
    expect(SETUP_STEPS).toEqual(['welcome', 'documents', 'personal', 'academics', 'exams', 'work', 'preferences', 'review', 'complete'])
  })

  it('preserves a real existing profile without requiring exams, salary, government ID or work', () => {
    expect(getProfileSetupStep(normalizeAdmissionsProfile(established()))).toBe('complete')
  })

  it('accepts a legacy original CGPA in place of a converted percentage', () => {
    expect(needsProfileSetup(established({ academic_graduation: { degree: 'B.Com', cgpa: 3.7, cgpa_scale: 4 } }))).toBe(false)
  })

  it.each([
    { phone: '' }, { current_city: ' ' }, { full_name: {} }, { email: 'invalid' },
    { academic_graduation: { degree: 'B.Com', percentage: ' ' } },
    { academic_graduation: { degree: 'B.Com', percentage: false } },
    { academic_graduation: { degree: 'B.Com', percentage: 105 } },
    { academic_graduation: { degree: 'B.Com', cgpa: 8, cgpa_scale: 4 } },
  ])('keeps an incomplete or malformed old profile in setup: %j', patch => {
    expect(needsProfileSetup(established(patch))).toBe(true)
  })

  it.each([null, undefined, [], 'complete', {}, { version: 2, step: 'complete', completed_at: completedAt }])('does not use the legacy bypass for present malformed metadata: %j', onboarding => {
    expect(getProfileSetupStep(normalizeAdmissionsProfile(established({ onboarding })))).toBe('welcome')
  })

  it('does not mark a complete-looking draft as finished before the final confirmation', () => {
    expect(getProfileSetupStep(withProfileSetup(established(), 'review'))).toBe('review')
  })

  it('requires confirmation time before a complete step can open the overview', () => {
    expect(getProfileSetupStep({ onboarding: { version: 1, step: 'complete' } })).toBe('review')
  })

  it.each(['not-a-date', '2026-02-30T12:30:00.000Z', '2026-10-18', '2026-10-18T12:30:00+00:00'])('rejects a malformed completion timestamp: %s', value => {
    expect(normalizeProfileOnboarding({ version: 1, step: 'complete', completed_at: value }).step).toBe('review')
  })

  it('resumes a valid saved documents or information step', () => {
    expect(getProfileSetupStep({ onboarding: { version: 1, step: 'academics', documents_choice: 'upload' } })).toBe('academics')
  })

  it('stores only bounded known metadata fields', () => {
    expect(normalizeAdmissionsProfile({ onboarding: { version: 1, step: 'personal', documents_choice: 'manual', completed_at: completedAt, extra: 'x'.repeat(10000) } }).onboarding)
      .toEqual({ version: 1, step: 'personal', documents_choice: 'manual', completed_at: null })
  })

  it('finishes only on an explicit valid saved completion', () => {
    expect(withProfileSetup(established(), 'complete', { documentsChoice: 'manual', completedAt }).onboarding)
      .toEqual({ version: 1, step: 'complete', documents_choice: 'manual', completed_at: completedAt })
  })

  it('preserves the document choice and profile facts when moving to the next step', () => {
    const initial = withProfileSetup(established(), 'documents', { documentsChoice: 'upload' })
    const next = withProfileSetup(initial, 'personal')
    expect({ choice: next.onboarding.documents_choice, name: next.full_name, previousStep: initial.onboarding.step }).toEqual({ choice: 'upload', name: 'Synthetic Applicant', previousStep: 'documents' })
  })

  it('clears completion if a deliberate setup restart moves back to an earlier step', () => {
    const complete = withProfileSetup(established(), 'complete', { completedAt })
    expect(withProfileSetup(complete, 'documents').onboarding.completed_at).toBeNull()
  })

  it('refuses to manufacture completion without a caller-supplied confirmation time', () => {
    expect(() => withProfileSetup({}, 'complete')).toThrow('Confirm profile setup')
  })

  it('rejects an unknown step instead of silently changing the saved route', () => {
    expect(() => withProfileSetup({}, 'external-page')).toThrow('valid profile setup step')
  })

  it('rejects an unsupported documents choice before persisting it', () => {
    expect(() => withProfileSetup({}, 'documents', { documentsChoice: 'force-upload' })).toThrow('upload documents or enter details manually')
  })
})
