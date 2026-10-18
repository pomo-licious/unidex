import { describe, expect, it } from 'vitest'
import {
  isAiImportPath, normalizeAdmissionsProfile, normalizeAiImports,
  validateAdmissionsProfile,
} from '../src/lib/admissionsProfile.js'

const documentId = '85fbc30a-a884-4384-b53a-99323943574b'
const importedAt = '2026-10-18T10:30:00.000Z'
const importEntry = patch => ({
  document_id: documentId,
  file_name: 'Employment record.pdf',
  fields: [{ path: ['total_work_experience_months'], value: 0 }],
  imported_at: importedAt,
  reviewed: false,
  ...patch,
})

describe('Admissions profile document metadata', () => {
  it('retains the original zero, false and month precision in valid import evidence', () => {
    const entry = importEntry({ fields: [
      { path: ['total_work_experience_months'], value: 0 },
      { path: ['work_experience', 0, 'current'], value: false },
      { path: ['work_experience', 0, 'start_date'], value: '2024-01' },
    ] })
    const profile = normalizeAdmissionsProfile({ profile_photo_document_id: documentId, ai_imports: [entry] })
    expect({ photo: profile.profile_photo_document_id, imports: profile.ai_imports })
      .toEqual({ photo: documentId, imports: [entry] })
  })

  it('rejects prototype paths, invalid row positions and unsupported profile fields', () => {
    const paths = [
      ['__proto__'],
      ['exam_scores', 0, 'section_scores', 'constructor'],
      ['work_experience', -1, 'company'],
      ['exam_scores', 0.5, 'percentile'],
      ['preferences', 'programme'],
      ['academic_10th', 'degree'],
    ]
    expect(paths.map(isAiImportPath)).toEqual(paths.map(() => false))
  })

  it('keeps supported evidence when an import also contains an unsafe field', () => {
    const validField = { path: ['academic_graduation', 'cgpa_scale'], value: 4 }
    const fields = [
      { path: ['exam_scores', -1, 'percentile'], value: 99 },
      { path: ['exam_scores', 0, 'section_scores', '__proto__'], value: 99 },
      validField,
    ]
    expect(normalizeAiImports([importEntry({ fields })])[0].fields).toEqual([validField])
  })

  it('discards an external URL supplied in place of an uploaded photograph ID', () => {
    expect(normalizeAdmissionsProfile({ profile_photo_document_id: 'https://example.com/photo.jpg' }).profile_photo_document_id)
      .toBeNull()
  })

  it('reports an invalid photograph ID before saving rather than accepting its normalized absence', () => {
    expect(validateAdmissionsProfile({ profile_photo_document_id: 'not-a-document-uuid' }).errors)
      .toHaveProperty('profile_photo_document_id')
  })

  it('rejects a save containing more than one hundred import records', () => {
    const aiImports = Array.from({ length: 101 }, () => importEntry())
    expect(validateAdmissionsProfile({ ai_imports: aiImports }).errors).toHaveProperty('ai_imports')
  })

  it('rejects a save containing more than two hundred fields in one import', () => {
    const fields = Array.from({ length: 201 }, () => ({ path: ['full_name'], value: 'Synthetic Applicant' }))
    expect(validateAdmissionsProfile({ ai_imports: [importEntry({ fields })] }).errors).toHaveProperty('ai_imports')
  })

  it('preserves the explicit reviewed flag when an import is marked as checked', () => {
    const initial = normalizeAiImports([importEntry()])
    const checked = normalizeAiImports(initial.map(entry => ({ ...entry, reviewed: true })))
    expect([initial[0].reviewed, checked[0].reviewed]).toEqual([false, true])
  })

  it('drops malformed and impossible import timestamps while retaining valid history', () => {
    const valid = importEntry()
    expect(normalizeAiImports([
      importEntry({ imported_at: 'not-a-timestamp' }),
      importEntry({ imported_at: '2026-02-30T10:30:00.000Z' }),
      valid,
    ])).toEqual([valid])
  })

  it('drops imports whose evidence contains only nested objects or unbounded text', () => {
    const fields = [
      { path: ['full_name'], value: { text: 'Synthetic Applicant' } },
      { path: ['current_city'], value: 'a'.repeat(1001) },
    ]
    expect(normalizeAiImports([importEntry({ fields })])).toEqual([])
  })
})
