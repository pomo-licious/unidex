import { describe, expect, it } from 'vitest'
import { getAdmissionsDocumentCoverage } from '../src/lib/admissionsDocumentCoverage'

const model = 'cloudflare:@cf/google/gemma-4-26b-a4b-it'
const document = (id, patch = {}) => ({ id, file_name: `${id}.pdf`, document_type: 'academic_10th', status: 'needs_review', extraction_model: model, extracted_data: { schema_version: 3, academic_10th: { percentage: 87.5 } }, ...patch })

describe('document processing coverage', () => {
  it('distinguishes a current AI read from student approval', () => {
    expect(getAdmissionsDocumentCoverage([document('marks')])).toMatchObject({ textCount: 1, readCount: 1, pendingReviewCount: 1 })
  })
  it('keeps older same-model extractions pending for the expanded schema', () => {
    expect(getAdmissionsDocumentCoverage([document('old', { extracted_data: { academic_10th: { percentage: 87.5 } } })]).entries[0].state).toBe('outdated')
  })
  it('reports an unread upload and failed extraction separately', () => {
    expect(getAdmissionsDocumentCoverage([document('unread', { extracted_data: null, status: 'uploaded' }), document('failed', { status: 'error' })]).entries.map(entry => entry.state)).toEqual(['unread', 'failed'])
  })
  it('does not call metadata-only output a successful AI read', () => {
    expect(getAdmissionsDocumentCoverage([document('empty', { extracted_data: { schema_version: 3 } })]).entries[0].state).toBe('empty')
  })
  it('does not send private profile photographs into text extraction', () => {
    expect(getAdmissionsDocumentCoverage([document('photo', { document_type: 'photo' })])).toMatchObject({ textCount: 0, pendingDocuments: [] })
  })
  it('preserves pending human review when a saved document has an unreviewed import', () => {
    expect(getAdmissionsDocumentCoverage([document('marks', { status: 'reviewed' })], { ai_imports: [{ document_id: 'marks', reviewed: false }] }).pendingReviewCount).toBe(1)
  })
  it('recognizes a checked current result without asking for AI again', () => {
    expect(getAdmissionsDocumentCoverage([document('marks', { status: 'reviewed' })])).toMatchObject({ pendingReviewCount: 0, pendingDocuments: [] })
  })
  it('does not treat ID numbers as useful extracted fields', () => {
    expect(getAdmissionsDocumentCoverage([document('id', { document_type: 'aadhaar_card', extracted_data: { schema_version: 3, aadhaar_number: '123456789012' } })]).readCount).toBe(0)
  })
})
