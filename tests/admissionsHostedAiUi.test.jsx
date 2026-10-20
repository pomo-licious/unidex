import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AiServiceNotice, BatchApproval, BatchCompletion, DocumentTargetHelp } from '../src/pages/DocumentUpload'
import DocumentCoveragePanel from '../src/components/DocumentCoveragePanel'

const model = '@cf/google/gemma-4-26b-a4b-it'
const status = { configured: true, enabled: true, free_plan_confirmed: true, provider: 'cloudflare', model }
const document = { id: 'synthetic-document', file_name: 'Synthetic Class 10.pdf', document_type: 'academic_10th', mime_type: 'application/pdf' }
const approvalProps = { aiStatus: status, aiAvailable: true, documents: [document], reextract: false, onReextract: vi.fn(), autofillApproved: true, onAutofillApproval: vi.fn(), photoChoice: '', onPhotoChoice: vi.fn(), progress: null, busy: false, error: '', onStart: vi.fn(), onClose: vi.fn(), onCancel: vi.fn() }
const approval = overrides => renderToStaticMarkup(<BatchApproval {...approvalProps} {...overrides}/>)
const button = (html, text) => (html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || []).find(markup => markup.includes(text))

describe('selected category guidance', () => {
  it('explains which school and result fields a Class 10 upload fills', () => {
    expect(renderToStaticMarkup(<DocumentTargetHelp type="academic_10th"/>)).toMatch(/school, board, passing year and printed marks/)
  })
  it('changes guidance for an entrance scorecard', () => {
    expect(renderToStaticMarkup(<DocumentTargetHelp type="exam_score"/>)).toContain('exam, year, edition, total score, percentile and printed section results')
  })
  it('does not describe a name-only mark-sheet extraction as a completed target read', () => {
    const documents = [{ ...document, status: 'needs_review', extraction_model: `cloudflare:${model}`, extracted_data: { schema_version: 4, document_type: 'academic_10th', full_name: 'Test Applicant' } }]
    const html = renderToStaticMarkup(<DocumentCoveragePanel documents={documents} onReview={vi.fn()} onBuildAll={vi.fn()} onExtractPending={vi.fn()}/>)
    expect(html).toMatch(/0 of 1 documents read[\s\S]*no valid details for their selected document type[\s\S]*Target details missing[\s\S]*Check this document[\s\S]*Read 1 pending document with AI/)
  })
})

describe('hosted AI availability', () => {
  it('shows connection checks before the service status is known', () => {
    expect(renderToStaticMarkup(<AiServiceNotice loading/>)).toContain('Checking the AI connection')
  })
  it('describes configuration without claiming that inference has succeeded', () => {
    expect(renderToStaticMarkup(<AiServiceNotice status={status}/>)).toContain('AI profile building is configured')
  })
  it('does not call the service ready unless its free plan is explicitly confirmed', () => {
    expect(renderToStaticMarkup(<AiServiceNotice status={{ ...status, free_plan_confirmed: false }}/>)).toContain('AI setup is awaiting connection')
  })
  it('shows an honest pending connection and a manual option while credentials are absent', () => {
    expect(renderToStaticMarkup(<AiServiceNotice status={{ ...status, configured: false }} onRetry={vi.fn()}/>)).toMatch(/AI setup is awaiting connection[\s\S]*manual entry[\s\S]*No paid provider[\s\S]*Check AI connection again/)
  })
  it('surfaces quota failures instead of claiming that profile building worked', () => {
    expect(renderToStaticMarkup(<AiServiceNotice error="The free daily allowance is exhausted. Please try later."/>)).toContain('The free daily allowance is exhausted')
  })
})

describe('AI processing and automatic profile fill approval', () => {
  it('asks once for Cloudflare document processing and agreed empty-field autofill', () => {
    expect(approval()).toMatch(/I allow Cloudflare Workers AI to read these selected non-photo documents, autofill agreed empty profile fields[\s\S]*cross-check the filled profile afterwards/)
  })
  it('blocks building until that explicit approval is given', () => {
    expect(button(approval({ autofillApproved: false }), 'Build my profile with AI')).toContain('disabled=""')
  })
  it('does not send documents while the free service is unavailable', () => {
    expect(button(approval({ aiAvailable: false }), 'Build my profile with AI')).toContain('disabled=""')
  })
  it('reads older local OCR results again with hosted AI', () => {
    expect(approval({ documents: [{ ...document, extraction_model: 'local:tesseract', extracted_data: { full_name: 'Old OCR name' } }] })).toContain('1 file will be sent securely to Cloudflare Workers AI')
  })
  it('does not reuse results from a different hosted AI model', () => {
    expect(approval({ documents: [{ ...document, extraction_model: 'cloudflare:older-model', extracted_data: {} }] })).toContain('Read with Cloudflare AI')
  })
  it('reuses nonempty results only from the current exact Cloudflare model and schema', () => {
    expect(approval({ documents: [{ ...document, status: 'needs_review', extraction_model: `cloudflare:${model}`, extracted_data: { schema_version: 4, document_type: 'academic_10th', full_name: 'Test Applicant' } }] })).toContain('Saved Cloudflare AI')
  })
  it('can reuse current saved results while new provider processing is unavailable', () => {
    expect(button(approval({ aiAvailable: false, documents: [{ ...document, status: 'needs_review', extraction_model: `cloudflare:${model}`, extracted_data: { schema_version: 4, document_type: 'academic_10th', full_name: 'Test Applicant' } }] }), 'Build my profile with AI')).not.toContain('disabled=')
  })
  it('keeps private photo assignment available without an AI connection', () => {
    expect(button(approval({ aiStatus: null, aiAvailable: false, documents: [{ ...document, document_type: 'photo', mime_type: 'image/png' }] }), 'Use selected photo')).not.toContain('disabled=')
  })
})

describe('filled profile handoff', () => {
  const summary = { results: [{ document, status: 'extracted' }], profileSaved: true, plan: { appliedCount: 3, textFieldCount: 3, matchedCount: 0, photoApplied: false, conflicts: [] } }
  const partialSummary = { ...summary, readyDocuments: [document], results: [...summary.results, { document: { ...document, id: 'unfinished', file_name: 'Unfinished.pdf' }, status: 'failed', error: 'The free service was unavailable.' }] }
  it('hands a saved automatic fill directly to profile review', () => {
    expect(renderToStaticMarkup(<BatchCompletion summary={summary} busy={false} onClose={vi.fn()} onRetrySave={vi.fn()} onContinue={vi.fn()}/>)).toContain('Review my filled profile')
  })
  it('keeps manual entry explicit if saving the filled profile failed', () => {
    expect(renderToStaticMarkup(<BatchCompletion summary={{ ...summary, profileSaved: false, saveError: 'Your profile changed in another tab.' }} busy={false} onClose={vi.fn()} onRetrySave={vi.fn()} onContinue={vi.fn()}/>)).toMatch(/profile autofill was not confirmed[\s\S]*Continue &amp; enter details manually/)
  })
  it('preserves unsaved available results before retrying unfinished documents', () => {
    const html = renderToStaticMarkup(<BatchCompletion summary={{ ...partialSummary, profileSaved: false, saveError: 'Your profile changed in another tab.' }} busy={false} onClose={vi.fn()} onRetrySave={vi.fn()} onRetryFiles={vi.fn()} onContinue={vi.fn()}/>)
    expect(button(html, 'Retry unfinished documents')).toContain('disabled=""')
  })
  it('allows unfinished documents to be retried once available results are saved', () => {
    const html = renderToStaticMarkup(<BatchCompletion summary={partialSummary} busy={false} onClose={vi.fn()} onRetrySave={vi.fn()} onRetryFiles={vi.fn()} onContinue={vi.fn()}/>)
    expect(button(html, 'Retry unfinished documents')).not.toContain('disabled=')
  })
  it('allows a completely failed batch to retry when there are no unsaved available results', () => {
    const failedSummary = { ...partialSummary, profileSaved: false, readyDocuments: [], results: partialSummary.results.filter(result => result.status === 'failed'), plan: null }
    const html = renderToStaticMarkup(<BatchCompletion summary={failedSummary} busy={false} onClose={vi.fn()} onRetrySave={vi.fn()} onRetryFiles={vi.fn()} onContinue={vi.fn()}/>)
    expect(button(html, 'Retry unfinished documents')).not.toContain('disabled=')
  })
  it('exposes individual document review when extracted values need reconciliation', () => {
    const html = renderToStaticMarkup(<BatchCompletion summary={{ ...summary, plan: { ...summary.plan, needsReviewDocumentIds: [document.id] } }} busy={false} onClose={vi.fn()} onRetrySave={vi.fn()} onReviewDocument={vi.fn()} onContinue={vi.fn()}/>)
    expect(button(html, 'Resolve document disagreements')).toBeDefined()
  })
})
