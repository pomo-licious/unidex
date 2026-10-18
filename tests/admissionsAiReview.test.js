import { describe, expect, it } from 'vitest'
import { findAiProfileCorrections, freezeProfileSaveSnapshot, getAiImportedFields, isReviewableAiPath, prepareProfileSaveReview, profileFingerprint, withProfileReviewRowIds } from '../src/lib/admissionsAiReview'

const source = (fields, extra = {}) => ({ document_id: 'own-document', file_name: 'Class-10-marksheet.pdf', imported_at: '2026-10-18T08:00:00Z', reviewed: false, fields, ...extra })
const profile = (extra = {}) => ({ full_name: 'Anjaneh Chopra', email: 'applicant@example.com', academic_10th: { percentage: 84 }, exam_scores: [], work_experience: [], ai_imports: [source([{ path: ['academic_10th', 'percentage'], value: 84 }])], ...extra })

describe('AI profile correction review', () => {
  it('asks for review when a newly changed AI-sourced mark differs from its baseline', () => {
    const saved = profile()
    expect(findAiProfileCorrections({ ...saved, academic_10th: { percentage: 86 } }, saved)).toHaveLength(1)
  })
  it('retains original AI and user values together with the source filename', () => {
    const saved = profile()
    expect(findAiProfileCorrections({ ...saved, academic_10th: { percentage: 86 } }, saved)[0]).toMatchObject({ aiValue: 84, value: 86, fileName: 'Class-10-marksheet.pdf' })
  })
  it('does not repeat a warning for a correction that is already saved unchanged', () => {
    const saved = profile({ academic_10th: { percentage: 86 } })
    expect(findAiProfileCorrections(structuredClone(saved), saved)).toEqual([])
  })
  it('does not warn for a formatting-only numeric change', () => {
    const saved = profile()
    expect(findAiProfileCorrections({ ...saved, academic_10th: { percentage: '84.00' } }, saved)).toEqual([])
  })
  it('does not warn when the user intentionally returns to the AI baseline', () => {
    const saved = profile({ academic_10th: { percentage: 86 } })
    expect(findAiProfileCorrections({ ...saved, academic_10th: { percentage: 84 } }, saved)).toEqual([])
  })
  it('does not treat a manually entered unsourced field as AI-sourced', () => {
    const saved = profile()
    expect(findAiProfileCorrections({ ...saved, phone: '+91 90000 00000' }, saved)).toEqual([])
  })
  it('warns when an imported value is removed', () => {
    const saved = profile()
    expect(findAiProfileCorrections({ ...saved, academic_10th: { percentage: null } }, saved)[0].value).toBeNull()
  })
  it('uses the latest import baseline when the same field has multiple sources', () => {
    const saved = profile({ ai_imports: [source([{ path: ['academic_10th', 'percentage'], value: 84 }]), source([{ path: ['academic_10th', 'percentage'], value: 85 }], { file_name: 'Reissued-marksheet.pdf', imported_at: '2026-10-18T09:00:00Z' })] })
    expect(getAiImportedFields(saved)[0]).toMatchObject({ aiValue: 85, fileName: 'Reissued-marksheet.pdf' })
  })
  it('compares a nested exam percentile using its final canonical array index', () => {
    const saved = profile({ exam_scores: [{ exam: 'GMAT', percentile: 92 }], ai_imports: [source([{ path: ['exam_scores', 0, 'percentile'], value: 92 }])] })
    expect(findAiProfileCorrections({ ...saved, exam_scores: [{ exam: 'GMAT', percentile: 95 }] }, saved)[0].label).toBe('Exam 1 · Percentile')
  })
  it('does not mistake a role moving after another role is removed for a correction', () => {
    const saved = profile({ work_experience: [{ id: 'first', company: 'First company' }, { id: 'second', company: 'Second company' }], ai_imports: [source([{ path: ['work_experience', 1, 'company'], value: 'Second company' }])] })
    expect(findAiProfileCorrections({ ...saved, work_experience: [{ id: 'second', company: 'Second company' }] }, saved)).toEqual([])
  })
  it('warns when the role containing an imported value is removed', () => {
    const saved = profile({ work_experience: [{ id: 'role', company: 'Original company' }], ai_imports: [source([{ path: ['work_experience', 0, 'company'], value: 'Original company' }])] })
    expect(findAiProfileCorrections({ ...saved, work_experience: [] }, saved)[0].value).toBeUndefined()
  })
  it('does not expose national ID numbers as reviewable profile fields', () => {
    expect(isReviewableAiPath(['aadhaar_number'])).toBe(false)
  })
  it('rejects prototype traversal paths from imported metadata', () => {
    expect(isReviewableAiPath(['academic_10th', '__proto__'])).toBe(false)
  })
  it('ignores provenance metadata masquerading as an editable profile field', () => {
    const saved = profile({ ai_imports: [source([{ path: ['ai_imports', 0, 'file_name'], value: 'sensitive.pdf' }])] })
    expect(getAiImportedFields(saved)).toEqual([])
  })
  it('does not turn a photo reference into an AI correction field', () => {
    expect(isReviewableAiPath(['profile_photo_document_id'])).toBe(false)
  })
})

describe('profile save snapshot and concurrency', () => {
  it('preserves the exact pending draft when the editable input object changes later', () => {
    const candidate = profile(), snapshot = freezeProfileSaveSnapshot(candidate, 'account-A', 7)
    candidate.academic_10th.percentage = 90
    expect(snapshot.profile.academic_10th.percentage).toBe(84)
  })
  it('prevents mutation of nested pending profile fields', () => {
    const snapshot = freezeProfileSaveSnapshot(profile(), 'account-A', 7)
    expect(() => { snapshot.profile.academic_10th.percentage = 90 }).toThrow(TypeError)
  })
  it('retains the owner and checked revision with the frozen save attempt', () => {
    expect(freezeProfileSaveSnapshot(profile(), 'account-A', 7)).toMatchObject({ userId: 'account-A', expectedRevision: 7 })
  })
  it('rejects a remote profile change before a correction confirmation opens', () => {
    const base = profile(), remote = { ...base, full_name: 'Updated in another window' }
    expect(() => prepareProfileSaveReview(base, base, { profile: remote, revision: 8 }, 'account-A')).toThrow(/changed in another window/)
  })
  it('keeps the checked CAS revision for a correction confirmed later', () => {
    const base = profile(), candidate = { ...base, academic_10th: { percentage: 86 } }
    expect(prepareProfileSaveReview(candidate, base, { profile: base, revision: 9 }, 'account-A').snapshot.expectedRevision).toBe(9)
  })
  it('rejects an unknown revision instead of silently performing an unconditional write', () => {
    const base = profile()
    expect(() => prepareProfileSaveReview(base, base, { profile: base }, 'account-A')).toThrow(/version could not be checked/)
  })
  it('ignores JSON object key order while comparing an editor base with the server', () => {
    expect(profileFingerprint({ full_name: 'Applicant', academic_10th: { year: 2018, percentage: 84 } })).toBe(profileFingerprint({ academic_10th: { percentage: 84, year: 2018 }, full_name: 'Applicant' }))
  })
})


describe('persistent AI provenance when profile rows move', () => {
  it('keeps role B provenance after removing role A, then warns on a later role B correction', () => {
    const base = profile({ work_experience: [{ id: 'A', company: 'Company A' }, { id: 'B', company: 'Company B' }], ai_imports: [source([{ path: ['work_experience', 1, 'company'], value: 'Company B' }])] })
    const tracked = withProfileReviewRowIds(base), candidate = { ...tracked, work_experience: [tracked.work_experience[1]] }
    const saved = prepareProfileSaveReview(candidate, base, { profile: base, revision: 3 }, 'owner', tracked).snapshot.profile
    expect(findAiProfileCorrections({ ...saved, work_experience: [{ ...saved.work_experience[0], company: 'Corrected B' }] }, saved)[0]).toMatchObject({ aiValue: 'Company B', value: 'Corrected B', fileName: 'Class-10-marksheet.pdf' })
  })
  it('rebases an exam source after deleting an earlier exam that had no original row ID', () => {
    const base = profile({ exam_scores: [{ exam: 'CAT', percentile: 80 }, { exam: 'GMAT', percentile: 92 }], ai_imports: [source([{ path: ['exam_scores', 1, 'percentile'], value: 92 }])] })
    const tracked = withProfileReviewRowIds(base), candidate = { ...tracked, exam_scores: [tracked.exam_scores[1]] }
    const saved = prepareProfileSaveReview(candidate, base, { profile: base, revision: 3 }, 'owner', tracked).snapshot.profile
    expect(findAiProfileCorrections({ ...saved, exam_scores: [{ ...saved.exam_scores[0], percentile: 96 }] }, saved)[0].value).toBe(96)
  })
  it('keeps a moved source attached to the same exam during a reorder', () => {
    const base = profile({ exam_scores: [{ exam: 'CAT', percentile: 80 }, { exam: 'GMAT', percentile: 92 }], ai_imports: [source([{ path: ['exam_scores', 1, 'percentile'], value: 92 }])] })
    const tracked = withProfileReviewRowIds(base), candidate = { ...tracked, exam_scores: [tracked.exam_scores[1], tracked.exam_scores[0]] }
    expect(prepareProfileSaveReview(candidate, base, { profile: base, revision: 3 }, 'owner', tracked).snapshot.profile.ai_imports[0].fields[0].path).toEqual(['exam_scores', 0, 'percentile'])
  })
  it('keeps imported provenance after inserting a different result ahead of the source exam', () => {
    const base = profile({ exam_scores: [{ exam: 'GMAT', percentile: 92 }], ai_imports: [source([{ path: ['exam_scores', 0, 'percentile'], value: 92 }])] })
    const tracked = withProfileReviewRowIds(base), candidate = { ...tracked, exam_scores: [{ exam: 'CAT', percentile: 80 }, ...tracked.exam_scores] }
    expect(prepareProfileSaveReview(candidate, base, { profile: base, revision: 3 }, 'owner', tracked).snapshot.profile.ai_imports[0].fields[0].path).toEqual(['exam_scores', 1, 'percentile'])
  })
  it('removes a deleted row’s provenance instead of attaching it to the next row', () => {
    const base = profile({ work_experience: [{ id: 'A', company: 'Company A' }, { id: 'B', company: 'Company B' }], ai_imports: [source([{ path: ['work_experience', 0, 'company'], value: 'Company A' }])] })
    const tracked = withProfileReviewRowIds(base), candidate = { ...tracked, work_experience: [tracked.work_experience[1]] }
    expect(prepareProfileSaveReview(candidate, base, { profile: base, revision: 3 }, 'owner', tracked).snapshot.profile.ai_imports).toEqual([])
  })
  it('still requests confirmation before deleting a row containing an AI-filled field', () => {
    const base = profile({ exam_scores: [{ exam: 'CAT', percentile: 80 }], ai_imports: [source([{ path: ['exam_scores', 0, 'percentile'], value: 80 }])] })
    const tracked = withProfileReviewRowIds(base)
    expect(prepareProfileSaveReview({ ...tracked, exam_scores: [] }, base, { profile: base, revision: 3 }, 'owner', tracked).changes).toHaveLength(1)
  })
  it('rejects duplicate row identities instead of warning against the wrong result', () => {
    const base = profile({ exam_scores: [{ exam: 'CAT', percentile: 80 }], ai_imports: [source([{ path: ['exam_scores', 0, 'percentile'], value: 80 }])] })
    const tracked = withProfileReviewRowIds(base)
    expect(() => prepareProfileSaveReview({ ...tracked, exam_scores: [tracked.exam_scores[0], tracked.exam_scores[0]] }, base, { profile: base, revision: 3 }, 'owner', tracked)).toThrow(/tracking identity/)
  })
  it('warns on edits to custom section names accepted by the canonical import contract', () => {
    const base = profile({ exam_scores: [{ exam: 'CAT', section_scores: { 'VARC percentile': 87 } }], ai_imports: [source([{ path: ['exam_scores', 0, 'section_scores', 'VARC percentile'], value: 87 }])] })
    expect(findAiProfileCorrections({ ...base, exam_scores: [{ exam: 'CAT', section_scores: { 'VARC percentile': 89 } }] }, base)[0]).toMatchObject({ aiValue: 87, value: 89 })
  })
})


describe('legacy draft identity safety', () => {
  it('rejects equal-length remove-plus-add with a different exam identity', () => {
    const saved = profile({ exam_scores: [{ exam: 'CAT', year: 2025, percentile: 80 }], ai_imports: [source([{ path: ['exam_scores', 0, 'percentile'], value: 80 }])] })
    expect(() => findAiProfileCorrections({ ...saved, exam_scores: [{ exam: 'GMAT', year: 2026, percentile: 95 }] }, saved)).toThrow(/identity.*unclear/)
  })
  it('allows a clear correction to a unique legacy exam with unchanged exam and year', () => {
    const saved = profile({ exam_scores: [{ exam: 'CAT', year: 2025, percentile: 80 }], ai_imports: [source([{ path: ['exam_scores', 0, 'percentile'], value: 80 }])] })
    expect(findAiProfileCorrections({ ...saved, exam_scores: [{ exam: 'CAT', year: 2025, percentile: 82 }] }, saved)[0].value).toBe(82)
  })
  it('treats removal of the only legacy imported row as a deletion requiring confirmation', () => {
    const saved = profile({ exam_scores: [{ exam: 'CAT', year: 2025, percentile: 80 }], ai_imports: [source([{ path: ['exam_scores', 0, 'percentile'], value: 80 }])] })
    expect(findAiProfileCorrections({ ...saved, exam_scores: [] }, saved)[0].value).toBeUndefined()
  })
  it('does not guess between two same-exam same-year legacy results after an edit', () => {
    const saved = profile({ exam_scores: [{ exam: 'GMAT', year: 2025, total_score: 650 }, { exam: 'GMAT', year: 2025, total_score: 700 }], ai_imports: [source([{ path: ['exam_scores', 0, 'total_score'], value: 650 }])] })
    expect(() => findAiProfileCorrections({ ...saved, exam_scores: [{ exam: 'GMAT', year: 2025, total_score: 660 }, saved.exam_scores[1]] }, saved)).toThrow(/identity.*unclear/)
  })
  it('persists row IDs in the exact prepared snapshot before the server receives it', () => {
    const saved = profile({ exam_scores: [{ exam: 'CAT', year: 2025, percentile: 80 }] })
    expect(prepareProfileSaveReview(saved, saved, { profile: saved, revision: 4 }, 'owner').snapshot.profile.exam_scores[0]._unidex_row_id).toMatch(/^[0-9a-f-]{36}$/)
  })
  it('allows a candidate email prefill while checking the unchanged raw blank canonical base', () => {
    const saved = profile({ full_name: '', email: '' }), candidate = { ...saved, full_name: 'Account name', email: 'account@example.com' }
    expect(prepareProfileSaveReview(candidate, saved, { profile: saved, revision: 4 }, 'owner').snapshot.profile.email).toBe('account@example.com')
  })
})

describe('professional and service provenance', () => {
  it('keeps professional marks attached to their row when an earlier qualification is removed', () => {
    const base = profile({ professional_qualifications: [{ qualification: 'CA', institution: 'ICAI' }, { qualification: 'CFA', institution: 'CFA Institute', percentage: 70 }], ai_imports: [source([{ path: ['professional_qualifications', 1, 'percentage'], value: 70 }])] })
    const tracked = withProfileReviewRowIds(base), candidate = { ...tracked, professional_qualifications: [tracked.professional_qualifications[1]] }
    const saved = prepareProfileSaveReview(candidate, base, { profile: base, revision: 3 }, 'owner', tracked).snapshot.profile
    expect(findAiProfileCorrections({ ...saved, professional_qualifications: [{ ...saved.professional_qualifications[0], percentage: 75 }] }, saved)[0]).toMatchObject({ aiValue: 70, value: 75, label: 'Qualification 1 · Percentage' })
  })
  it('warns before saving a correction to a document-sourced service rank', () => {
    const saved = profile({ defence_service: { status: 'veteran', rank: 'Major' }, ai_imports: [source([{ path: ['defence_service', 'rank'], value: 'Major' }])] })
    expect(findAiProfileCorrections({ ...saved, defence_service: { ...saved.defence_service, rank: 'Colonel' } }, saved)[0]).toMatchObject({ label: 'Defence service · Rank', aiValue: 'Major', value: 'Colonel' })
  })
  it('does not mistake a professional row reorder for a changed extracted result', () => {
    const saved = profile({ professional_qualifications: [{ _row_id: 'row-A', qualification: 'CA' }, { _row_id: 'row-B', qualification: 'CFA', percentage: 70 }], ai_imports: [source([{ path: ['professional_qualifications', 1, 'percentage'], value: 70 }])] })
    expect(findAiProfileCorrections({ ...saved, professional_qualifications: [saved.professional_qualifications[1], saved.professional_qualifications[0]] }, saved)).toEqual([])
  })
  it('does not expose service identifiers as reviewable profile paths', () => {
    expect(isReviewableAiPath(['defence_service', 'service_number'])).toBe(false)
  })
})
