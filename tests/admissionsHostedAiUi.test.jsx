import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AiServiceNotice, BatchApproval, BatchCompletion } from '../src/pages/DocumentUpload'

const model = '@cf/google/gemma-4-26b-a4b-it'
const status = { configured: true, enabled: true, free_plan_confirmed: true, provider: 'cloudflare', model }
const document = { id: 'synthetic-document', file_name: 'Synthetic Class 10.pdf', document_type: 'academic_10th', mime_type: 'application/pdf' }
const approvalProps = { aiStatus: status, aiAvailable: true, documents: [document], reextract: false, onReextract: vi.fn(), autofillApproved: true, onAutofillApproval: vi.fn(), photoChoice: '', onPhotoChoice: vi.fn(), progress: null, busy: false, error: '', onStart: vi.fn(), onClose: vi.fn(), onCancel: vi.fn() }
const approval = overrides => renderToStaticMarkup(<BatchApproval {...approvalProps} {...overrides}/>)
const button = (html, text) => (html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || []).find(markup => markup.includes(text))

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
  it('reuses results only from the current exact Cloudflare model', () => {
    expect(approval({ documents: [{ ...document, extraction_model: `cloudflare:${model}`, extracted_data: {} }] })).toContain('Saved Cloudflare AI')
  })
  it('can reuse current saved results while new provider processing is unavailable', () => {
    expect(button(approval({ aiAvailable: false, documents: [{ ...document, extraction_model: `cloudflare:${model}`, extracted_data: {} }] }), 'Build my profile with AI')).not.toContain('disabled=')
  })
  it('keeps private photo assignment available without an AI connection', () => {
    expect(button(approval({ aiStatus: null, aiAvailable: false, documents: [{ ...document, document_type: 'photo', mime_type: 'image/png' }] }), 'Use selected photo')).not.toContain('disabled=')
  })
})

describe('filled profile handoff', () => {
  const summary = { results: [{ document, status: 'extracted' }], profileSaved: true, plan: { appliedCount: 3, textFieldCount: 3, matchedCount: 0, photoApplied: false, conflicts: [] } }
  it('hands a saved automatic fill directly to profile review', () => {
    expect(renderToStaticMarkup(<BatchCompletion summary={summary} busy={false} onClose={vi.fn()} onRetrySave={vi.fn()} onContinue={vi.fn()}/>)).toContain('Review my filled profile')
  })
  it('keeps manual entry explicit if saving the filled profile failed', () => {
    expect(renderToStaticMarkup(<BatchCompletion summary={{ ...summary, profileSaved: false, saveError: 'Your profile changed in another tab.' }} busy={false} onClose={vi.fn()} onRetrySave={vi.fn()} onContinue={vi.fn()}/>)).toMatch(/profile autofill was not confirmed[\s\S]*Continue &amp; enter details manually/)
  })
})
