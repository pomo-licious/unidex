import { describe, expect, it, vi } from 'vitest'
import { getAiImportedFields } from '../src/lib/admissionsAiReview'
import { appendAdmissionsAiImports, getSafeAdmissionsDocumentSuggestions, planAdmissionsBatchAutofill, runAdmissionsDocumentBatch } from '../src/lib/admissionsBatchReview'
const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333']
const doc = (index, data, type = 'other') => ({ id: ids[index], file_name: `Document ${index + 1}.pdf`, document_type: type, extracted_data: data })
const photo = index => ({ id: ids[index], file_name: `Photo ${index + 1}.png`, document_type: 'photo', mime_type: 'image/png' })

describe('safe batch autofill', () => {
  it('autofills independent school marks from several documents', () => {
    const result = planAdmissionsBatchAutofill({}, [doc(0, { academic_10th: { percentage: 85 } }), doc(1, { academic_12th: { percentage: 90 } })])
    expect(result.profile).toMatchObject({ academic_10th: { percentage: 85 }, academic_12th: { percentage: 90 } })
  })
  it('detects cross-document names before any first value can win', () => {
    const result = planAdmissionsBatchAutofill({}, [doc(0, { full_name: 'Student A' }), doc(1, { full_name: 'Student B' })])
    expect(result.profile.full_name).toBeUndefined()
  })
  it('records both document sources for a conflict', () => {
    const result = planAdmissionsBatchAutofill({}, [doc(0, { full_name: 'Student A' }), doc(1, { full_name: 'Student B' })])
    expect(result.conflicts[0].values.map(item => item.document_id)).toEqual(ids.slice(0, 2))
  })
  it('accepts equivalent whitespace/case while preserving source provenance', () => {
    const result = planAdmissionsBatchAutofill({}, [doc(0, { full_name: 'Student Name' }), doc(1, { full_name: ' STUDENT  NAME ' })])
    expect(result.profile.ai_imports.length).toBe(2)
  })
  it('preserves a saved zero salary when a document suggests another amount', () => {
    expect(planAdmissionsBatchAutofill({ last_drawn_ctc: 0 }, [doc(0, { last_drawn_ctc: 1000000 })]).profile.last_drawn_ctc).toBe(0)
  })
  it('does not overwrite or relabel an already entered matching value as AI-filled', () => {
    expect(planAdmissionsBatchAutofill({ current_city: 'Delhi' }, [doc(0, { current_city: 'Delhi' })]).profile.ai_imports).toBeUndefined()
  })
  it('leaves conflicting marks empty while filling independent agreed fields', () => {
    const result = planAdmissionsBatchAutofill({}, [doc(0, { academic_10th: { percentage: 85, board: 'CBSE' } }), doc(1, { academic_10th: { percentage: 90, board: 'CBSE' } })])
    expect(result.profile.academic_10th).toEqual({ board: 'CBSE' })
  })
  it('combines complementary fields of an unambiguous exam identity once', () => {
    const result = planAdmissionsBatchAutofill({}, [doc(0, { exam_scores: [{ exam: 'CAT', year: 2026, percentile: 92 }] }), doc(1, { exam_scores: [{ exam: 'CAT', year: 2026, total_score: 80 }] })])
    expect(result.profile.exam_scores).toEqual([{ exam: 'CAT', year: 2026, total_score: 80, percentile: 92 }])
  })
  it('does not import contradictory exam records from separate documents', () => {
    const result = planAdmissionsBatchAutofill({}, [doc(0, { exam_scores: [{ exam: 'CAT', year: 2026, percentile: 92 }] }), doc(1, { exam_scores: [{ exam: 'CAT', year: 2026, percentile: 95 }] })])
    expect(result.profile.exam_scores).toBeUndefined()
  })
  it('does not silently merge or duplicate a result with missing year', () => {
    const result = planAdmissionsBatchAutofill({}, [doc(0, { exam_scores: [{ exam: 'CAT', percentile: 92 }] }), doc(1, { exam_scores: [{ exam: 'CAT', year: 2026, percentile: 95 }] })])
    expect(result.profile.exam_scores).toBeUndefined()
  })
  it('records the resolved existing array index in provenance', () => {
    const profile = { exam_scores: [{ exam: 'GMAT', year: 2026 }, { exam: 'CAT', year: 2026 }] }
    const result = planAdmissionsBatchAutofill(profile, [doc(0, { exam_scores: [{ exam: 'CAT', year: 2026, percentile: 92 }] })])
    expect(result.profile.ai_imports[0].fields).toEqual([{ path: ['exam_scores', 1, 'percentile'], value: 92 }])
  })
  it('withholds conflicting CGPA scales and values as a pair', () => {
    const result = planAdmissionsBatchAutofill({}, [doc(0, { academic_graduation: { cgpa: 8, cgpa_scale: 10, percentage: 85 } }), doc(1, { academic_graduation: { cgpa: 8, cgpa_scale: 20 } })])
    expect(result.profile.academic_graduation).toEqual({ percentage: 85 })
  })
  it('imports only allowed printed common facts from ID documents', () => {
    const result = planAdmissionsBatchAutofill({}, [doc(0, { full_name: 'Student', pan_number: 'ABCDE1234F', aadhaar_number: '123456789012', phone: '9999999999' }, 'aadhaar_card')])
    expect(result.profile.ai_imports[0].fields).toEqual([{ path: ['full_name'], value: 'Student' }])
  })
  it('assigns a sole selected private photo without treating it as OCR text', () => {
    expect(planAdmissionsBatchAutofill({}, [photo(0)]).profile.profile_photo_document_id).toBe(ids[0])
  })
  it('requires a choice when several photos are selected', () => {
    expect(() => planAdmissionsBatchAutofill({}, [photo(0), photo(1)])).toThrow('Choose a primary profile photo')
  })
  it('preserves an existing photo instead of replacing it during empty-field autofill', () => {
    expect(planAdmissionsBatchAutofill({ profile_photo_document_id: ids[2] }, [photo(0)]).profile.profile_photo_document_id).toBe(ids[2])
  })
  it('leaves human review pending on every new import baseline', () => {
    expect(planAdmissionsBatchAutofill({}, [doc(0, { total_work_experience_months: 0 })]).profile.ai_imports[0].reviewed).toBe(false)
  })
})

describe('sequential extraction without implicit consent or retries', () => {
  it('never calls extraction from selection alone', async () => {
    const extract = vi.fn()
    await runAdmissionsDocumentBatch([doc(0, null)], { extract })
    expect(extract).not.toHaveBeenCalled()
  })
  it('reuses stored extraction without another provider request', async () => {
    const extract = vi.fn()
    await runAdmissionsDocumentBatch([doc(0, { full_name: 'Student' })], { extract, processingApproved: true })
    expect(extract).not.toHaveBeenCalled()
  })
  it('never sends profile photos for text extraction', async () => {
    const extract = vi.fn()
    await runAdmissionsDocumentBatch([photo(0)], { extract, processingApproved: true, reextract: true })
    expect(extract).not.toHaveBeenCalled()
  })
  it('performs provider calls in sequence rather than concurrently', async () => {
    const order = []
    const extract = vi.fn(async document => { order.push(`start:${document.id}`); await Promise.resolve(); order.push(`end:${document.id}`); return { ...document, extracted_data: {} } })
    await runAdmissionsDocumentBatch([doc(0, null), doc(1, null)], { extract, processingApproved: true })
    expect(order).toEqual([`start:${ids[0]}`, `end:${ids[0]}`, `start:${ids[1]}`, `end:${ids[1]}`])
  })
  it('stops further requests after quota exhaustion without retrying', async () => {
    const extract = vi.fn(async () => { throw Object.assign(new Error('No credit'), { code: 'OCR_QUOTA_EXHAUSTED' }) })
    await runAdmissionsDocumentBatch([doc(0, null), doc(1, null)], { extract, processingApproved: true })
    expect(extract).toHaveBeenCalledTimes(1)
  })
  it('reports unattempted remaining files separately from a failed request', async () => {
    const result = await runAdmissionsDocumentBatch([doc(0, null), doc(1, null)], { extract: async () => { throw Object.assign(new Error('Disabled'), { code: 'OCR_DISABLED' }) }, processingApproved: true })
    expect(result.results.map(item => item.status)).toEqual(['failed', 'not_attempted'])
  })
  it('keeps reusable data and local photos available after provider stop', async () => {
    const result = await runAdmissionsDocumentBatch([doc(0, null), doc(1, { current_city: 'Delhi' }), photo(2)], { extract: async () => { throw Object.assign(new Error('Rate limited'), { status: 429 }) }, processingApproved: true })
    expect(result.results.map(item => item.status)).toEqual(['failed', 'reused', 'photo'])
  })
  it('reports a file failure but continues independent files for a non-global error', async () => {
    const result = await runAdmissionsDocumentBatch([doc(0, null), doc(1, null)], { extract: async document => { if (document.id === ids[0]) throw new Error('Unreadable page'); return { ...document, extracted_data: { current_city: 'Delhi' } } }, processingApproved: true })
    expect(result.results.map(item => item.status)).toEqual(['failed', 'extracted'])
  })
})


describe('immutable source baselines and photo attribution', () => {
  it('does not refresh an older field baseline when importing a different field from that document', () => {
    const profile = { ai_imports: [
      { document_id: ids[0], file_name: 'A.pdf', imported_at: '2026-10-16T08:00:00Z', reviewed: false, fields: [{ path: ['full_name'], value: 'Old A' }] },
      { document_id: ids[1], file_name: 'B.pdf', imported_at: '2026-10-17T08:00:00Z', reviewed: false, fields: [{ path: ['full_name'], value: 'New B' }] },
    ] }
    const fields = [{ path: ['academic_10th', 'board'], value: 'CBSE' }]
    profile.ai_imports = appendAdmissionsAiImports(profile, fields, new Map([[JSON.stringify(fields[0].path), [{ document_id: ids[0], file_name: 'A.pdf', value: 'CBSE' }]]]), '2026-10-18T08:00:00Z')
    expect(getAiImportedFields(profile).find(field => field.path[0] === 'full_name').aiValue).toBe('New B')
  })
  it('preserves the original AI value when a human has edited the imported value', () => {
    const fields = [{ path: ['full_name'], value: 'Reviewed name' }]
    const imports = appendAdmissionsAiImports({}, fields, new Map([[JSON.stringify(fields[0].path), [{ document_id: ids[0], file_name: 'A.pdf', value: 'Wrong original' }]]]), '2026-10-18T08:00:00Z', { reviewed: true })
    expect(imports[0]).toMatchObject({ reviewed: true, fields: [{ path: ['full_name'], value: 'Wrong original' }] })
  })
  it('does not label a direct selected photograph as an AI fact', () => {
    expect(planAdmissionsBatchAutofill({}, [photo(0)]).profile.ai_imports).toBeUndefined()
  })
  it('filters unsafe cached identity fields in the shared single-document suggestion path', () => {
    expect(getSafeAdmissionsDocumentSuggestions(doc(0, { full_name: 'Student 123456789012', phone: '9999999999', date_of_birth: '1998-01-01', current_city: 'Delhi' }, 'aadhaar_card'))).toEqual({ date_of_birth: '1998-01-01', current_city: 'Delhi' })
  })
  it('excludes an invalid contact value without blocking independent valid marks', () => {
    const result = planAdmissionsBatchAutofill({}, [doc(0, { email: 'not-an-email', academic_10th: { percentage: 85 } })])
    expect(result.profile).toMatchObject({ academic_10th: { percentage: 85 } })
  })
  it('continues to import a percentage while an invalid CGPA pair needs review', () => {
    const result = planAdmissionsBatchAutofill({}, [doc(0, { academic_graduation: { percentage: 85, cgpa: 8.5, cgpa_scale: 4 } })])
    expect(result.profile.academic_graduation).toEqual({ percentage: 85 })
  })
})
