import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { DOCUMENT_MIME_TYPES, IMAGE_MIME_TYPES, isDocumentType } from '../src/lib/admissionsDocumentTypes'
import { normalizeAiImports, validateAdmissionsProfile } from '../src/lib/admissionsProfile'
import { sanitizeLocalAdmissionsExtraction } from '../src/lib/admissionsLocalExtraction'

const source = readFileSync(new URL('../src/lib/admissionsApi.js', import.meta.url), 'utf8').replace(/^import .*\r?\n/gm, '').replace(/^export /gm, '')
const OWNER = '11111111-1111-4111-8111-111111111111'
const ID = '22222222-2222-4222-8222-222222222222'
const stored = { id: ID, user_id: OWNER, document_type: 'academic_10th', mime_type: 'application/pdf', size_bytes: 14, storage_bucket: 'unidex-admissions-private', storage_path: `${OWNER}/${ID}/marks.pdf` }
const status = { ok: true, provider: 'cloudflare', configured: true, enabled: true, free_plan_confirmed: true, model: '@cf/google/gemma-4-26b-a4b-it' }
function harness(options = {}) {
  const calls = [], events = { prepared: 0, downloads: 0 }
  let authIndex = 0
  const document = { ...stored, ...options.document }
  const query = { select: () => query, eq: () => query, single: () => query, then: resolve => Promise.resolve({ data: document }).then(resolve) }
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: options.authUsers?.[Math.min(authIndex++, options.authUsers.length - 1)] || OWNER } } }) },
    from: () => query,
    storage: { from: () => ({ download: async () => { events.downloads++; return { data: new Blob(['%PDF-synthetic'], { type: 'application/pdf' }) } } }) },
    functions: { invoke: async (name, args) => {
      calls.push({ name, ...args })
      if (options.failure) return { error: { context: new Response(JSON.stringify(options.failure), { status: 503 }) } }
      return { data: args.body.action === 'status' ? options.status || status : { ok: true, document: { ...document, extraction_model: `cloudflare:${status.model}`, extracted_data: { academic_10th: { percentage: 87 } }, ...options.responseDocument } } }
    } },
  }
  const scope = { supabase, DOCUMENT_MIME_TYPES, IMAGE_MIME_TYPES, isDocumentType, normalizeAiImports, validateAdmissionsProfile, sanitizeLocalAdmissionsExtraction, Uint8Array, DOMException, TextEncoder, prepareAdmissionsAiPages: async () => { events.prepared++; return { total_pages: 1, pages: [{ page_number: 1, mime_type: 'image/jpeg', data_base64: 'synthetic-page' }] } } }
  vm.runInNewContext(`${source};globalThis.api={getAdmissionsAiStatus,extractHostedAdmissionsDocument}`, scope)
  return { api: scope.api, calls, events }
}

describe('hosted AI client boundary', () => {
  it('checks status without downloading a document or sending provider credentials', async () => {
    const test = harness()
    await test.api.getAdmissionsAiStatus(OWNER)
    expect({ calls: test.calls.map(({ name, body }) => ({ name, body })), downloads: test.events.downloads }).toEqual({ calls: [{ name: 'admissions-ai-extract', body: { action: 'status' } }], downloads: 0 })
  })
  it('does not infer readiness from an invalid status response', async () => {
    const test = harness({ status: { ok: true, provider: 'cloudflare' } })
    await expect(test.api.getAdmissionsAiStatus(OWNER)).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' })
  })
  it('requires document transmission consent before reading private bytes', async () => {
    const test = harness()
    await test.api.extractHostedAdmissionsDocument(stored, OWNER).catch(() => {})
    expect({ calls: test.calls.length, downloads: test.events.downloads }).toEqual({ calls: 0, downloads: 0 })
  })
  it('sends only prepared pages and the owned document identifier to the protected endpoint', async () => {
    const test = harness()
    await test.api.extractHostedAdmissionsDocument(stored, OWNER, true)
    expect(test.calls[0].body).toEqual({ document_id: ID, cloudflare_document_processing: true, total_pages: 1, pages: [{ page_number: 1, mime_type: 'image/jpeg', data_base64: 'synthetic-page' }] })
  })
  it('returns server-confirmed suggestions without writing to the profile', async () => {
    const test = harness()
    expect((await test.api.extractHostedAdmissionsDocument(stored, OWNER, true)).extracted_data).toEqual({ academic_10th: { percentage: 87 } })
  })
  it('rejects a response belonging to another document', async () => {
    const test = harness({ responseDocument: { id: '33333333-3333-4333-8333-333333333333' } })
    await expect(test.api.extractHostedAdmissionsDocument(stored, OWNER, true)).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' })
  })
  it('blocks transmission if the account changes while pages are prepared', async () => {
    const test = harness({ authUsers: [OWNER, OWNER, 'another-account'] })
    await test.api.extractHostedAdmissionsDocument(stored, OWNER, true).catch(() => {})
    expect(test.calls).toHaveLength(0)
  })
  it('keeps photos out of the hosted AI service', async () => {
    const test = harness({ document: { document_type: 'photo' } })
    await expect(test.api.extractHostedAdmissionsDocument(stored, OWNER, true)).rejects.toMatchObject({ code: 'PHOTO_EXTRACTION_DISABLED' })
  })
  it('preserves hard quota stop semantics without retrying or choosing a paid provider', async () => {
    const test = harness({ failure: { error: 'Free daily allowance exhausted.', code: 'OCR_QUOTA_EXHAUSTED', stop_batch: true } })
    const error = await test.api.extractHostedAdmissionsDocument(stored, OWNER, true).catch(value => value)
    expect({ code: error.code, stop: error.stopBatch, attempts: test.calls.length }).toEqual({ code: 'OCR_QUOTA_EXHAUSTED', stop: true, attempts: 1 })
  })
})
