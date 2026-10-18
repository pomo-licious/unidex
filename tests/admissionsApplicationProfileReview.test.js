import { describe, expect, it, vi } from 'vitest'
import { saveReviewedApplicationProfile } from '../src/lib/admissionsApplicationProfileReview'
import { normalizeAdmissionsProfile } from '../src/lib/admissionsProfile'

const user = { id: '11111111-1111-4111-8111-111111111111', email: 'synthetic@example.invalid' }
const base = () => normalizeAdmissionsProfile({ full_name: 'Synthetic Applicant', email: user.email, academic_10th: { percentage: 84 }, ai_imports: [{ document_id: '22222222-2222-4222-8222-222222222222', file_name: 'synthetic-marksheet.pdf', imported_at: '2026-10-18T08:00:00Z', reviewed: false, fields: [{ path: ['academic_10th', 'percentage'], value: 84 }] }] }, user)
function attempt(overrides = {}) {
  const editorBase = base()
  return { user, editorBase, trackedBase: editorBase, candidate: { ...editorBase, academic_10th: { ...editorBase.academic_10th, percentage: 86 } }, loadRecord: vi.fn(async () => ({ profile: editorBase, revision: 7 })), saveProfile: vi.fn(async profile => structuredClone(profile)), confirmCorrections: vi.fn(async () => true), ...overrides }
}

describe('application profile review before draft or submission', () => {
  it('leaves the profile unsaved when the applicant keeps editing', async () => {
    const options = attempt({ confirmCorrections: vi.fn(async () => false) })
    expect(await saveReviewedApplicationProfile(options)).toEqual({ cancelled: true })
    expect(options.saveProfile).not.toHaveBeenCalled()
  })
  it('rejects a stale editor before opening a correction dialog or writing', async () => {
    const options = attempt({ loadRecord: async () => ({ profile: { ...base(), phone: '+91 90000 00000' }, revision: 8 }) })
    await expect(saveReviewedApplicationProfile(options)).rejects.toThrow(/changed in another window/)
    expect(options.confirmCorrections).not.toHaveBeenCalled()
    expect(options.saveProfile).not.toHaveBeenCalled()
  })
  it('uses the exact frozen reviewed profile for the CAS save and subsequent application payload', async () => {
    const options = attempt()
    options.confirmCorrections = async prepared => {
      expect(Object.isFrozen(prepared.snapshot.profile.academic_10th)).toBe(true)
      options.candidate.academic_10th.percentage = 99
      return true
    }
    const result = await saveReviewedApplicationProfile(options)
    expect(result.profile.academic_10th.percentage).toBe(86)
    expect(options.saveProfile).toHaveBeenCalledWith(result.profile, { expectedRevision: 7 })
  })
  it('propagates CAS failures so callers cannot proceed to application submission', async () => {
    const options = attempt({ saveProfile: vi.fn(async () => { throw new Error('PROFILE_CHANGED') }) })
    await expect(saveReviewedApplicationProfile(options)).rejects.toThrow('PROFILE_CHANGED')
  })
  it('does not repeat the correction dialog when the same saved profile is retried', async () => {
    const first = await saveReviewedApplicationProfile(attempt())
    const options = attempt({ candidate: first.profile, editorBase: first.savedProfile, trackedBase: first.savedProfile, loadRecord: async () => ({ profile: first.savedProfile, revision: 8 }) })
    await saveReviewedApplicationProfile(options)
    expect(options.confirmCorrections).not.toHaveBeenCalled()
    expect(options.saveProfile).toHaveBeenCalledWith(expect.any(Object), { expectedRevision: 8 })
  })
  it('cancels before saving if the account changes during confirmation', async () => {
    let active = true
    const options = attempt({ isActive: () => active, confirmCorrections: async () => { active = false; return true } })
    expect(await saveReviewedApplicationProfile(options)).toEqual({ cancelled: true })
    expect(options.saveProfile).not.toHaveBeenCalled()
  })
  it('does not accept a failed or empty profile save as permission to submit', async () => {
    await expect(saveReviewedApplicationProfile(attempt({ saveProfile: async () => undefined }))).rejects.toThrow(/did not confirm/)
  })
  it('keeps an old draft submission payload stable after an ambiguous response and retry', async () => {
    const editorBase = base()
    editorBase.exam_scores = [{ exam: 'CAT', year: 2025, percentile: 92, section_scores: {} }]
    editorBase.work_experience = [{ company: 'Synthetic Company', designation: 'Analyst', months: 12 }]
    const first = await saveReviewedApplicationProfile(attempt({ editorBase, trackedBase: editorBase, candidate: structuredClone(editorBase), loadRecord: async () => ({ profile: editorBase, revision: 7 }) }))
    expect(first.profile.exam_scores[0]._unidex_row_id).toBeTruthy()
    expect(first.profile.work_experience[0]._unidex_row_id).toBeTruthy()
    const retry = await saveReviewedApplicationProfile(attempt({ editorBase: first.savedProfile, trackedBase: first.savedProfile, candidate: first.savedProfile, loadRecord: async () => ({ profile: first.savedProfile, revision: 8 }) }))
    expect(JSON.stringify(retry.profile)).toBe(JSON.stringify(first.profile))
  })
  it('rejects an ambiguous changed exam identity in an older draft before writing', async () => {
    const editorBase = base()
    editorBase.exam_scores = [{ exam: 'CAT', year: 2025, percentile: 92 }]
    editorBase.ai_imports[0].fields = [{ path: ['exam_scores', 0, 'percentile'], value: 92 }]
    const candidate = structuredClone(editorBase)
    candidate.exam_scores = [{ exam: 'GMAT', year: 2026, percentile: 95 }]
    const options = attempt({ editorBase, trackedBase: editorBase, candidate, loadRecord: async () => ({ profile: editorBase, revision: 7 }) })
    await expect(saveReviewedApplicationProfile(options)).rejects.toThrow(/identity|unclear|safely|changed/)
    expect(options.saveProfile).not.toHaveBeenCalled()
  })
  it('can review an edited legacy exam when its exam and year identify the same row', async () => {
    const editorBase = base()
    editorBase.exam_scores = [{ exam: 'CAT', year: 2025, percentile: 92 }]
    editorBase.ai_imports[0].fields = [{ path: ['exam_scores', 0, 'percentile'], value: 92 }]
    const candidate = structuredClone(editorBase)
    candidate.exam_scores[0].percentile = 95
    const options = attempt({ editorBase, trackedBase: editorBase, candidate, loadRecord: async () => ({ profile: editorBase, revision: 7 }) })
    const result = await saveReviewedApplicationProfile(options)
    expect(result.profile.exam_scores[0]).toMatchObject({ percentile: 95, _unidex_row_id: expect.any(String) })
    expect(options.confirmCorrections).toHaveBeenCalledOnce()
  })
})
