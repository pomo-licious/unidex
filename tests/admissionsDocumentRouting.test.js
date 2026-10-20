import { describe, expect, it } from 'vitest'
import { ADMISSIONS_EXTRACTION_SCHEMA_VERSION, canReuseAdmissionsAiExtraction, getSafeAdmissionsDocumentSuggestions, planAdmissionsBatchAutofill, runAdmissionsDocumentBatch } from '../src/lib/admissionsBatchReview'
import { getAdmissionsDocumentCoverage } from '../src/lib/admissionsDocumentCoverage'
import { sanitizeLocalAdmissionsExtraction } from '../src/lib/admissionsLocalExtraction'

const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222']
const makeDocument = (index, type, data) => ({ id: ids[index], file_name: `${type}.pdf`, document_type: type, status: 'needs_review', extraction_model: 'cloudflare:@cf/google/gemma-4-26b-a4b-it', extracted_data: { schema_version: ADMISSIONS_EXTRACTION_SCHEMA_VERSION, document_type: type, ...data } })

describe('selected upload category destinations', () => {
  it('keeps Class 10 results out of Class 12, graduation and employment destinations', () => {
    const document = makeDocument(0, 'academic_10th', { full_name: 'Student', email: 'school@example.test', academic_10th: { school: 'School Ten', percentage: 88 }, academic_12th: { percentage: 99 }, academic_graduation: { percentage: 99 }, last_drawn_ctc: 1000000 })
    expect(getSafeAdmissionsDocumentSuggestions(document)).toEqual({ full_name: 'Student', academic_10th: { school: 'School Ten', percentage: 88 } })
  })
  it('never relabels a Class 12 object as Class 10 because of the selected type', () => {
    const result = planAdmissionsBatchAutofill({}, [makeDocument(0, 'academic_10th', { academic_12th: { percentage: 92 } })])
    expect({ ten: result.profile.academic_10th, twelve: result.profile.academic_12th, count: result.appliedCount }).toEqual({ ten: undefined, twelve: undefined, count: 0 })
  })
  it('maps two typed mark sheets into their correct sections and original source records', () => {
    const result = planAdmissionsBatchAutofill({}, [makeDocument(0, 'academic_10th', { academic_10th: { school: 'School Ten', percentage: 88 }, academic_12th: { percentage: 11 } }), makeDocument(1, 'academic_12th', { academic_12th: { school: 'School Twelve', percentage: 94 }, academic_10th: { percentage: 22 } })], { importedAt: '2026-10-20T00:00:00.000Z' })
    expect({ ten: result.profile.academic_10th, twelve: result.profile.academic_12th, sources: result.profile.ai_imports.map(source => ({ id: source.document_id, paths: source.fields.map(field => field.path) })) }).toEqual({ ten: { school: 'School Ten', percentage: 88 }, twelve: { school: 'School Twelve', percentage: 94 }, sources: [{ id: ids[0], paths: [['academic_10th', 'school'], ['academic_10th', 'percentage']] }, { id: ids[1], paths: [['academic_12th', 'school'], ['academic_12th', 'percentage']] }] })
  })
  it('keeps an existing mark while importing other correctly scoped fields', () => {
    const profile = { academic_10th: { percentage: 80 } }
    const result = planAdmissionsBatchAutofill(profile, [makeDocument(0, 'academic_10th', { academic_10th: { school: 'School Ten', percentage: 88 }, academic_12th: { percentage: 99 } })])
    expect({ profile: result.profile.academic_10th, twelve: result.profile.academic_12th, conflict: result.conflicts.some(item => item.path.join('.') === 'academic_10th.percentage'), original: profile }).toEqual({ profile: { percentage: 80, school: 'School Ten' }, twelve: undefined, conflict: true, original: { academic_10th: { percentage: 80 } } })
  })
  it('keeps professional results separate from undergraduate marks', () => {
    expect(getSafeAdmissionsDocumentSuggestions(makeDocument(0, 'professional_qualification', { professional_qualifications: [{ qualification: 'CA', institution: 'ICAI', percentage: 61 }], academic_graduation: { percentage: 61 } }))).toEqual({ professional_qualifications: [{ qualification: 'CA', institution: 'ICAI', percentage: 61 }] })
  })
  it('keeps entrance percentiles in exam results rather than school marks', () => {
    expect(getSafeAdmissionsDocumentSuggestions(makeDocument(0, 'exam_score', { exam_scores: [{ exam: 'CAT', percentile: 98 }], academic_10th: { percentage: 98 } }))).toEqual({ exam_scores: [{ exam: 'CAT', percentile: 98 }] })
  })
  it('accepts employment and annual CTC facts without importing unrelated education', () => {
    expect(getSafeAdmissionsDocumentSuggestions(makeDocument(0, 'work_experience', { work_experience: [{ company: 'Employer' }], last_drawn_ctc: 1200000, total_work_experience_months: 36, academic_10th: { percentage: 99 } }))).toEqual({ work_experience: [{ company: 'Employer' }], last_drawn_ctc: 1200000, total_work_experience_months: 36 })
  })
  it('retains a resume containing multiple education levels and qualification records', () => {
    const facts = { full_name: 'Student', academic_10th: { percentage: 80 }, academic_12th: { percentage: 85 }, academic_graduation: { percentage: 75 }, professional_qualifications: [{ qualification: 'CA', institution: 'ICAI' }], work_experience: [{ company: 'Employer' }] }
    expect(getSafeAdmissionsDocumentSuggestions(makeDocument(0, 'resume', facts))).toEqual(facts)
  })
  it('retains a combined other document without forcing a school destination', () => {
    const facts = { academic_10th: { percentage: 80 }, academic_12th: { percentage: 85 } }
    expect(getSafeAdmissionsDocumentSuggestions(makeDocument(0, 'other', facts))).toEqual(facts)
  })
  it('preserves identity privacy filtering alongside category routing', () => {
    expect(getSafeAdmissionsDocumentSuggestions(makeDocument(0, 'aadhaar_card', { full_name: 'Student', date_of_birth: '2000-01-01', aadhaar_number: '123456789012', phone: '9876543210', academic_10th: { percentage: 99 } }))).toEqual({ full_name: 'Student', date_of_birth: '2000-01-01' })
  })
  it('never turns a profile photo into text suggestions', () => {
    expect(getSafeAdmissionsDocumentSuggestions(makeDocument(0, 'photo', { full_name: 'Student', academic_10th: { percentage: 99 } }))).toEqual({})
  })
  it('applies the same typed destinations at the legacy persistence boundary', () => {
    expect(sanitizeLocalAdmissionsExtraction({ academic_10th: { percentage: 88 }, academic_12th: { percentage: 99 }, last_drawn_ctc: 1200000 }, 'academic_10th')).toEqual({ academic_10th: { percentage: 88 } })
  })
})

describe('category-aware extraction reuse and coverage', () => {
  it('rereads schema-three results that predate selected-category routing', () => {
    expect(canReuseAdmissionsAiExtraction(makeDocument(0, 'academic_10th', { schema_version: 3, academic_10th: { percentage: 88 } }))).toBe(false)
  })
  it('does not reuse a saved extraction recorded for a different selected category', () => {
    expect(canReuseAdmissionsAiExtraction(makeDocument(0, 'academic_10th', { document_type: 'academic_12th', academic_10th: { percentage: 88 } }))).toBe(false)
  })
  it('does not reuse an extraction lacking its category fingerprint', () => {
    const document = makeDocument(0, 'academic_10th', { academic_10th: { percentage: 88 } })
    delete document.extracted_data.document_type
    expect(canReuseAdmissionsAiExtraction(document)).toBe(false)
  })
  it('shows name-only mark-sheet extraction as partial while preserving its reviewable result', () => {
    const document = makeDocument(0, 'academic_10th', { full_name: 'Student', academic_12th: { percentage: 99 } })
    const coverage = getAdmissionsDocumentCoverage([document])
    expect({ reusable: canReuseAdmissionsAiExtraction(document), read: coverage.readCount, partial: coverage.partialCount, pending: coverage.pendingDocuments.map(item => item.id), state: coverage.entries[0].state, review: coverage.entries[0].needsStudentReview }).toEqual({ reusable: true, read: 0, partial: 1, pending: [ids[0]], state: 'partial', review: true })
  })
  it('does not count an invalid academic result as having read the target details', () => {
    expect(getAdmissionsDocumentCoverage([makeDocument(0, 'academic_10th', { full_name: 'Student', academic_10th: { percentage: 150 } })]).entries[0].state).toBe('partial')
  })
  it('does not require a nonexistent narrow primary section for resumes', () => {
    expect(getAdmissionsDocumentCoverage([makeDocument(0, 'resume', { full_name: 'Student' })]).entries[0].state).toBe('read')
  })
  it('can explicitly reread a partial result even though its known personal facts remain reusable', async () => {
    const document = makeDocument(0, 'academic_10th', { full_name: 'Student' })
    let reads = 0
    await runAdmissionsDocumentBatch([document], { processingApproved: true, reextract: true, canReuse: canReuseAdmissionsAiExtraction, extract: async value => { reads++; return value } })
    expect(reads).toBe(1)
  })
})
