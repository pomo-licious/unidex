import { describe, expect, it, vi } from 'vitest'
import { runAdmissionsDocumentBatch } from '../src/lib/admissionsBatchReview'
import { saveDocumentSetupProgress } from '../src/lib/admissionsDocumentsFirst'
import { withProfileSetup } from '../src/lib/admissionsOnboarding'

const user = { id: 'synthetic-owner', email: 'student@example.invalid' }
const model = 'cloudflare:@cf/google/gemma-4-26b-a4b-it'
const doc = { id: 'document', document_type: 'academic_10th', extraction_model: 'local:tesseract', extracted_data: { full_name: 'Earlier reading' } }
const canReuse = document => document.extraction_model === model

describe('hosted AI profile building', () => {
  it('re-reads weak local cached results instead of silently treating them as hosted AI results', async () => {
    const extract = vi.fn(async document => ({ ...document, extraction_model: model, extracted_data: { full_name: 'AI reading' } }))
    const result = await runAdmissionsDocumentBatch([doc], { extract, processingApproved: true, canReuse })
    expect({ requests: extract.mock.calls.length, status: result.results[0].status, value: result.readyDocuments[0].extracted_data.full_name }).toEqual({ requests: 1, status: 'extracted', value: 'AI reading' })
  })
  it('reuses already-saved results from the current hosted model', async () => {
    const extract = vi.fn()
    const result = await runAdmissionsDocumentBatch([{ ...doc, extraction_model: model }], { extract, processingApproved: true, canReuse })
    expect({ requests: extract.mock.calls.length, status: result.results[0].status }).toEqual({ requests: 0, status: 'reused' })
  })
  it('stops further inference after a provider free quota error', async () => {
    const extract = vi.fn(async () => { throw Object.assign(new Error('Daily free allowance exhausted'), { stopBatch: true, code: 'OCR_QUOTA_EXHAUSTED' }) })
    const result = await runAdmissionsDocumentBatch([doc, { ...doc, id: 'second' }], { extract, processingApproved: true, canReuse })
    expect({ requests: extract.mock.calls.length, statuses: result.results.map(row => row.status) }).toEqual({ requests: 1, statuses: ['failed', 'not_attempted'] })
  })
  it('opens the populated review directly after a successful profile build', async () => {
    const current = withProfileSetup({ full_name: 'Applicant', email: user.email }, 'documents')
    let saved
    const saveProfile = vi.fn(async (value, options) => { saved = value; return { ...value, revision: options.expectedRevision + 1 } })
    const destination = await saveDocumentSetupProgress({ user, documentsChoice: 'upload', nextStep: 'review', loadProfileRecord: async () => ({ profile: current, revision: 7 }), saveProfile, refreshProfile: async () => saved })
    expect({ destination, step: saved.onboarding.step, revision: saveProfile.mock.calls[0][1].expectedRevision }).toEqual({ destination: '/onboarding', step: 'review', revision: 7 })
  })
  it('keeps the explicit manual-entry path at the first personal section', async () => {
    let saved
    await saveDocumentSetupProgress({ user, documentsChoice: 'manual', loadProfileRecord: async () => ({ profile: withProfileSetup({}, 'documents'), revision: 2 }), saveProfile: async value => { saved = value; return value }, refreshProfile: async () => saved })
    expect(saved.onboarding.step).toBe('personal')
  })
})
