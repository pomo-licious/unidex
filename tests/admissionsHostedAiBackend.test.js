import { readFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

// Execute the shipped handler against synthetic Auth, Storage and provider doubles.
// These tests use no credentials, environment files, network or private documents.
const source = stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/admissions-ai-extract/index.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, ''))
const OWNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '33333333-3333-4333-8333-333333333333'
const DOCUMENT = '22222222-2222-4222-8222-222222222222'
const ACCOUNT = 'a'.repeat(32)
const MODEL = '@cf/google/gemma-4-26b-a4b-it'
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1])
const page = (number = 1) => ({ page_number: number, mime_type: 'image/png', data_base64: Buffer.from(PNG).toString('base64') })
const rawExtraction = {
  full_name: 'SYNTHETIC TEST APPLICANT',
  academic_10th: { percentage: null, cgpa: 0 },
  academic_graduation: { degree: 'B.Com', cgpa: 3.7, cgpa_scale: 4 },
  exam_scores: [
    { exam: 'gmat', total_score: 675, percentile: null, section_scores: [{ name: 'Quantitative score', score: 85 }] },
    { exam: 'CAT', total_score: null, percentile: 98.4, section_scores: [{ name: 'VARC percentile', score: 97.2 }] },
    { exam: 'SAT', total_score: 1600, percentile: null, section_scores: [] },
  ],
  work_experience: [{ company: 'Synthetic Company', designation: 'Analyst', start_date: '2023-06', current: true }],
}

function harness(options = {}) {
  const mime = options.mime || 'application/pdf'
  const bytes = options.invalidMagic ? new TextEncoder().encode('invalid fixture') : mime === 'image/png' ? PNG : new TextEncoder().encode('%PDF-1.7\nsynthetic fixture')
  const document = { id: DOCUMENT, user_id: options.otherOwner ? OTHER : OWNER, document_type: options.documentType || 'resume', file_name: 'synthetic.pdf', mime_type: mime, size_bytes: bytes.length, storage_bucket: 'unidex-admissions-private', storage_path: `${options.otherOwner ? OTHER : OWNER}/${DOCUMENT}/fixture`, ...options.document }
  const events = { auth: 0, reads: [], downloads: 0, leases: 0, writes: [], provider: [] }
  const db = {
    auth: { getUser: async () => { events.auth++; return { data: { user: options.invalidAuth ? null : { id: OWNER } }, error: options.invalidAuth ? new Error('Synthetic private auth detail') : null } } },
    from(table) {
      let patch = null
      const filters = {}
      const query = {
        select: () => query,
        eq(key, value) { filters[key] = value; return query },
        single: () => query,
        update(value) { patch = value; return query },
        then(resolve) {
          if (patch) events.writes.push({ table, patch, filters: { ...filters } })
          else events.reads.push({ table, filters: { ...filters } })
          const visible = table === 'student_admissions_documents' && filters.user_id === document.user_id && filters.id === document.id
          const failed = options.saveFailure && patch?.extracted_data
          return Promise.resolve({ data: visible && !failed ? { ...document, ...patch } : null, error: failed ? new Error('Synthetic save detail') : null }).then(resolve)
        },
      }
      return query
    },
    rpc: async () => { events.leases++; return { data: options.leaseReason ? { claimed: false, reason: options.leaseReason } : { claimed: true, request_id: 'synthetic-lease' } } },
    storage: { from: () => ({ download: async () => { events.downloads++; return { data: options.noDownload ? null : new Blob([bytes]) } } }) },
  }
  const scope = {
    Deno: {
      env: { get: name => ({ SUPABASE_URL: 'https://synthetic.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-value', CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_AI_TOKEN: 'synthetic-provider-value', CLOUDFLARE_AI_ENABLED: 'true', CLOUDFLARE_AI_FREE_PLAN_CONFIRMED: 'true', ...options.env })[name] },
      serve: handler => { scope.handler = handler },
    },
    createClient: () => db,
    Response, TextDecoder, AbortSignal, btoa, atob,
    fetch: async (url, request) => {
      events.provider.push({ url, headers: request.headers, body: JSON.parse(request.body) })
      if (options.providerThrows) throw new Error('Synthetic private provider URL/token detail')
      if (options.providerStatus) return new Response(JSON.stringify({ errors: [{ message: 'Synthetic secret provider detail' }] }), { status: options.providerStatus })
      const payload = options.providerPayload ?? { choices: [{ finish_reason: options.finishReason || 'stop', message: options.refusal ? { refusal: 'Synthetic refusal' } : { content: options.outputText ?? JSON.stringify(options.rawExtraction ?? rawExtraction) } }] }
      return new Response(JSON.stringify(payload), { status: 200 })
    },
  }
  vm.runInNewContext(source, scope)
  return {
    events,
    run: async ({ consent = true, body = {}, method = 'POST', authorization = true, headers = {}, rawBody } = {}) => {
      const response = await scope.handler(new Request('https://synthetic.invalid', {
        method,
        headers: { ...(authorization ? { authorization: 'Bearer synthetic-session' } : {}), ...headers },
        ...(method === 'POST' ? { body: rawBody ?? JSON.stringify({ document_id: DOCUMENT, cloudflare_document_processing: consent, total_pages: 1, pages: [page()], ...body }) } : {}),
      }))
      return { status: response.status, body: response.status === 204 ? null : await response.json(), headers: response.headers }
    },
  }
}

describe('Free-plan gated hosted admissions AI extraction', () => {
  it('rejects anonymous status checks without reading account records', async () => {
    const test = harness()
    const result = await test.run({ method: 'GET', authorization: false })
    expect({ status: result.status, code: result.body.code, auth: test.events.auth, reads: test.events.reads.length }).toEqual({ status: 401, code: 'AUTH_REQUIRED', auth: 0, reads: 0 })
  })

  it('rejects expired authentication without processing or returning configuration', async () => {
    const test = harness({ invalidAuth: true })
    const result = await test.run({ body: { action: 'status' } })
    expect({ status: result.status, configured: result.body.configured, reads: test.events.reads.length, provider: test.events.provider.length }).toEqual({ status: 401, configured: undefined, reads: 0, provider: 0 })
  })

  it('provides authenticated GET status without exposing credentials or consuming quota', async () => {
    const test = harness()
    const result = await test.run({ method: 'GET' })
    expect({ body: result.body, privateReads: test.events.reads.length, leases: test.events.leases, provider: test.events.provider.length, cache: result.headers.get('cache-control') }).toEqual({ body: { ok: true, provider: 'cloudflare', model: MODEL, configured: true, enabled: true, free_plan_confirmed: true, available: true, max_pages: 5, max_page_bytes: 3145728, max_payload_bytes: 8388608 }, privateReads: 0, leases: 0, provider: 0, cache: 'no-store' })
  })

  it('supports POST status through the frontend functions client while disabled', async () => {
    const test = harness({ env: { CLOUDFLARE_AI_ENABLED: undefined, CLOUDFLARE_AI_TOKEN: undefined, CLOUDFLARE_AI_FREE_PLAN_CONFIRMED: undefined } })
    const result = await test.run({ body: { action: 'status' } })
    expect({ status: result.status, configured: result.body.configured, enabled: result.body.enabled, confirmed: result.body.free_plan_confirmed, available: result.body.available, reads: test.events.reads.length }).toEqual({ status: 200, configured: false, enabled: false, confirmed: false, available: false, reads: 0 })
  })

  it('requires the explicit enabled gate before reading private documents', async () => {
    const test = harness({ env: { CLOUDFLARE_AI_ENABLED: 'false' } })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, stopped: result.body.stop_batch, reads: test.events.reads.length, requests: test.events.provider.length }).toEqual({ status: 503, code: 'OCR_DISABLED', stopped: true, reads: 0, requests: 0 })
  })

  it('requires owner confirmation of the Free plan before private processing', async () => {
    const test = harness({ env: { CLOUDFLARE_AI_FREE_PLAN_CONFIRMED: undefined } })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, stopped: result.body.stop_batch, downloads: test.events.downloads, requests: test.events.provider.length }).toEqual({ status: 503, code: 'OCR_FREE_PLAN_NOT_CONFIRMED', stopped: true, downloads: 0, requests: 0 })
  })

  it('fails closed when provider credentials are missing', async () => {
    const test = harness({ env: { CLOUDFLARE_AI_TOKEN: undefined } })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, stopped: result.body.stop_batch, reads: test.events.reads.length }).toEqual({ status: 503, code: 'OCR_NOT_CONFIGURED', stopped: true, reads: 0 })
  })

  it('does not allow a malformed account identifier into the provider URL', async () => {
    const test = harness({ env: { CLOUDFLARE_ACCOUNT_ID: '../unexpected' } })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, requests: test.events.provider.length }).toEqual({ status: 503, code: 'OCR_NOT_CONFIGURED', requests: 0 })
  })

  it('requires provider-specific consent before reading an owned document', async () => {
    const test = harness()
    const result = await test.run({ consent: false })
    expect({ status: result.status, code: result.body.code, reads: test.events.reads.length, leases: test.events.leases }).toEqual({ status: 403, code: 'DOCUMENT_PROCESSING_CONSENT_REQUIRED', reads: 0, leases: 0 })
  })

  it('cannot read another account’s document even with a valid document identifier', async () => {
    const test = harness({ otherOwner: true })
    const result = await test.run()
    expect({ status: result.status, filters: test.events.reads[0].filters, leases: test.events.leases, requests: test.events.provider.length }).toEqual({ status: 404, filters: { id: DOCUMENT, user_id: OWNER }, leases: 0, requests: 0 })
  })

  it('requires the current private bucket and owner path', async () => {
    const test = harness({ document: { storage_bucket: 'legacy-public-bucket' } })
    const result = await test.run()
    expect({ status: result.status, leases: test.events.leases, downloads: test.events.downloads }).toEqual({ status: 403, leases: 0, downloads: 0 })
  })

  it('rejects path traversal instead of trusting a supplied storage link', async () => {
    const test = harness({ document: { storage_path: `${OWNER}/../other` } })
    const result = await test.run()
    expect({ status: result.status, downloads: test.events.downloads, requests: test.events.provider.length }).toEqual({ status: 403, downloads: 0, requests: 0 })
  })

  it('rejects encoded paths, URL delimiters and control characters before service-role storage access', async () => {
    const invalid = [`${OWNER}/%2e%2e/foreign/file.pdf`, `${OWNER}/${DOCUMENT}/a%2fb.pdf`, `${OWNER}/${DOCUMENT}/file.pdf?download=foreign`, `${OWNER}/${DOCUMENT}/file.pdf#foreign`, `${OWNER}/${DOCUMENT}/file\n.pdf`, `${OWNER}/${DOCUMENT}/file\\foreign.pdf`, `${OWNER}/${OTHER}/fixture.pdf`, `${OWNER}/${DOCUMENT}/..`]
    const outputs = await Promise.all(invalid.map(async storage_path => {
      const test = harness({ document: { storage_path } })
      const result = await test.run()
      return { status: result.status, leases: test.events.leases, downloads: test.events.downloads, provider: test.events.provider.length }
    }))
    expect(outputs).toEqual(invalid.map(() => ({ status: 403, leases: 0, downloads: 0, provider: 0 })))
  })

  it('keeps profile photographs out of hosted AI', async () => {
    const test = harness({ documentType: 'photo', mime: 'image/png' })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, leases: test.events.leases, requests: test.events.provider.length }).toEqual({ status: 400, code: 'PHOTO_EXTRACTION_DISABLED', leases: 0, requests: 0 })
  })

  it('rejects oversized original metadata before downloading or using a lease', async () => {
    const test = harness({ document: { size_bytes: 10 * 1024 * 1024 + 1 } })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, leases: test.events.leases, downloads: test.events.downloads }).toEqual({ status: 400, code: 'OCR_INVALID_FILE', leases: 0, downloads: 0 })
  })

  it('rejects an invalid document identifier before any document read', async () => {
    const test = harness()
    const result = await test.run({ body: { document_id: 'not-a-document' } })
    expect({ status: result.status, code: result.body.code, reads: test.events.reads.length }).toEqual({ status: 400, code: 'OCR_INVALID_DOCUMENT', reads: 0 })
  })

  it('rejects documents longer than five pages rather than extracting a partial document', async () => {
    const test = harness()
    const result = await test.run({ body: { total_pages: 6, pages: Array.from({ length: 6 }, (_, i) => page(i + 1)) } })
    expect({ status: result.status, code: result.body.code, reads: test.events.reads.length, requests: test.events.provider.length }).toEqual({ status: 400, code: 'OCR_PAGE_LIMIT', reads: 0, requests: 0 })
  })

  it('rejects a missing document page before requesting hosted AI', async () => {
    const test = harness()
    const result = await test.run({ body: { total_pages: 2, pages: [page()] } })
    expect({ status: result.status, code: result.body.code, requests: test.events.provider.length }).toEqual({ status: 400, code: 'OCR_INVALID_PAGES', requests: 0 })
  })

  it('rejects duplicated page indices', async () => {
    const test = harness()
    const result = await test.run({ body: { total_pages: 2, pages: [page(), page()] } })
    expect({ status: result.status, code: result.body.code, leases: test.events.leases }).toEqual({ status: 400, code: 'OCR_INVALID_PAGES', leases: 0 })
  })

  it('rejects out-of-range page indices', async () => {
    const test = harness()
    const result = await test.run({ body: { pages: [page(2)] } })
    expect({ status: result.status, code: result.body.code, requests: test.events.provider.length }).toEqual({ status: 400, code: 'OCR_INVALID_PAGES', requests: 0 })
  })

  it('rejects noninteger page counts', async () => {
    const test = harness()
    const result = await test.run({ body: { total_pages: '1' } })
    expect({ status: result.status, code: result.body.code }).toEqual({ status: 400, code: 'OCR_PAGE_LIMIT' })
  })

  it('rejects unsupported prepared image types', async () => {
    const test = harness()
    const result = await test.run({ body: { pages: [{ ...page(), mime_type: 'image/webp' }] } })
    expect({ status: result.status, code: result.body.code, requests: test.events.provider.length }).toEqual({ status: 400, code: 'OCR_INVALID_PAGES', requests: 0 })
  })

  it('rejects invalid or noncanonical base64 instead of forwarding it', async () => {
    const outputs = await Promise.all(['', 'not base64', 'iVBORw0KGgoB===', ` ${page().data_base64}`, 'AB=='].map(async data => {
      const test = harness()
      const result = await test.run({ body: { pages: [{ ...page(), data_base64: data }] } })
      return { status: result.status, code: result.body.code, requests: test.events.provider.length }
    }))
    expect(outputs).toEqual(Array.from({ length: 5 }, () => ({ status: 400, code: 'OCR_INVALID_PAGES', requests: 0 })))
  })

  it('rejects page bytes that do not match their declared image format', async () => {
    const test = harness()
    const result = await test.run({ body: { pages: [{ ...page(), mime_type: 'image/jpeg' }] } })
    expect({ status: result.status, code: result.body.code, requests: test.events.provider.length }).toEqual({ status: 400, code: 'OCR_INVALID_PAGES', requests: 0 })
  })

  it('rejects a prepared page larger than three megabytes', async () => {
    const test = harness()
    const result = await test.run({ body: { pages: [{ ...page(), data_base64: Buffer.alloc(3 * 1024 * 1024 + 1, 1).toString('base64') }] } })
    expect({ status: result.status, code: result.body.code, requests: test.events.provider.length }).toEqual({ status: 400, code: 'OCR_INVALID_PAGES', requests: 0 })
  })

  it('enforces the eight megabyte request cap independently of Content-Length', async () => {
    const test = harness()
    const result = await test.run({ rawBody: JSON.stringify({ padding: 'x'.repeat(8 * 1024 * 1024) }) })
    expect({ status: result.status, code: result.body.code, reads: test.events.reads.length, requests: test.events.provider.length }).toEqual({ status: 413, code: 'OCR_PAYLOAD_TOO_LARGE', reads: 0, requests: 0 })
  })

  it('rejects an announced oversized request without parsing its pages', async () => {
    const test = harness()
    const result = await test.run({ headers: { 'content-length': '8388609' } })
    expect({ status: result.status, code: result.body.code, reads: test.events.reads.length }).toEqual({ status: 413, code: 'OCR_PAYLOAD_TOO_LARGE', reads: 0 })
  })

  it('rejects malformed JSON with a safe request error', async () => {
    const test = harness()
    const result = await test.run({ rawBody: '{private malformed fixture' })
    expect({ status: result.status, code: result.body.code, reads: test.events.reads.length }).toEqual({ status: 400, code: 'OCR_INVALID_REQUEST', reads: 0 })
  })

  it('requires image originals to have a single prepared page', async () => {
    const test = harness({ mime: 'image/png' })
    const result = await test.run({ body: { total_pages: 2, pages: [page(), page(2)] } })
    expect({ status: result.status, code: result.body.code, leases: test.events.leases }).toEqual({ status: 400, code: 'OCR_INVALID_PAGES', leases: 0 })
  })

  it('honors the shared extraction request limit without calling the provider', async () => {
    const test = harness({ leaseReason: 'rate_limit' })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, stopped: result.body.stop_batch, downloads: test.events.downloads, requests: test.events.provider.length }).toEqual({ status: 429, code: 'OCR_RATE_LIMITED', stopped: true, downloads: 0, requests: 0 })
  })

  it('does not duplicate an already-running document extraction', async () => {
    const test = harness({ leaseReason: 'in_progress' })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, requests: test.events.provider.length }).toEqual({ status: 409, code: 'OCR_IN_PROGRESS', requests: 0 })
  })

  it('checks the actual private original signature before sending submitted pages', async () => {
    const test = harness({ invalidMagic: true })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, requests: test.events.provider.length, released: test.events.writes.at(-1).table }).toEqual({ status: 422, code: 'OCR_INVALID_FILE', requests: 0, released: 'admissions_ocr_requests' })
  })

  it('does not process submitted pages when the private original is unavailable', async () => {
    const test = harness({ noDownload: true })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, requests: test.events.provider.length }).toEqual({ status: 422, code: 'OCR_INVALID_FILE', requests: 0 })
  })

  it('uses only the allowlisted stateless Cloudflare vision endpoint and JSON mode', async () => {
    const test = harness()
    await test.run({ body: { model: 'paid-fallback', signed_url: 'https://untrusted.invalid' } })
    const request = test.events.provider[0]
    expect({ url: request.url, model: request.body.model, store: request.body.store, stream: request.body.stream, max: request.body.max_completion_tokens, format: request.body.response_format, systemSchema: request.body.messages[0].content.includes('additionalProperties'), image: request.body.messages[1].content[2], gateway: request.body.gateway, tools: request.body.tools }).toEqual({ url: `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/v1/chat/completions`, model: MODEL, store: false, stream: false, max: 8192, format: { type: 'json_object' }, systemSchema: true, image: { type: 'image_url', image_url: { url: `data:image/png;base64,${page().data_base64}` } }, gateway: undefined, tools: undefined })
  })

  it('sends every supplied page once in page order', async () => {
    const test = harness()
    await test.run({ body: { total_pages: 2, pages: [page(2), page()] } })
    expect(test.events.provider[0].body.messages[1].content.filter(part => part.type === 'text').map(part => part.text).slice(1)).toEqual(['Document page 1 of 2.', 'Document page 2 of 2.'])
  })

  it('saves bounded source suggestions without changing the student profile', async () => {
    const test = harness()
    const result = await test.run()
    expect({ status: result.status, model: result.body.document.extraction_model, state: result.body.document.status, review: result.body.requires_review, provider: result.body.provider, tables: test.events.writes.map(event => event.table), ownerFilters: test.events.writes[0].filters }).toEqual({ status: 200, model: `cloudflare:${MODEL}`, state: 'needs_review', review: true, provider: 'cloudflare', tables: ['student_admissions_documents', 'admissions_ocr_requests'], ownerFilters: { id: DOCUMENT, user_id: OWNER } })
  })

  it('preserves score scales, zeros and month-precision employment dates', async () => {
    const { body } = await harness().run()
    const data = body.extracted
    expect({ zero: data.academic_10th.cgpa, missing: data.academic_10th.percentage, cgpa: data.academic_graduation.cgpa, scale: data.academic_graduation.cgpa_scale, gmat: data.exam_scores[0].total_score, catScore: data.exam_scores[1].total_score, catPercentile: data.exam_scores[1].percentile, section: data.exam_scores[1].section_scores['VARC percentile'], sat: data.exam_scores[2].total_score, workDate: data.work_experience[0].start_date }).toEqual({ zero: 0, missing: undefined, cgpa: 3.7, scale: 4, gmat: 675, catScore: null, catPercentile: 98.4, section: 97.2, sat: 1600, workDate: '2023-06' })
  })

  it('strips unexpected fields and government identifiers from provider output', async () => {
    const { body } = await harness({ rawExtraction: { full_name: 'Synthetic Applicant', phone: '123456789012', pan_number: 'ABCDE1234F', unknown: 'ignored', academic_10th: { percentage: 95, government_id: 'ABCDE1234F' } } }).run()
    expect(body.extracted).toEqual({ full_name: 'Synthetic Applicant', academic_10th: { percentage: 95 }, exam_scores: [], work_experience: [] })
  })

  it('preserves an explicitly international Indian phone number outside identity records', async () => {
    const { body } = await harness({ rawExtraction: { full_name: 'Synthetic Applicant', phone: '+91 9876543210' } }).run()
    expect(body.extracted.phone).toBe('+91 9876543210')
  })

  it('filters identifiers, poison keys and unsupported text in array and object section labels', async () => {
    const labels = ['A1234567', 'ABCDE1234F', '123456789012', 'constructor', '__proto__', 'prototype', 'not/a/path', 'bad\nlabel', 'z'.repeat(81)]
    const rows = [
      { exam: 'CAT', section_scores: [{ name: 'VARC percentile', score: 98 }, ...labels.map(name => ({ name, score: 1 }))] },
      { exam: 'GMAT', section_scores: Object.fromEntries([['Quantitative score', 85], ...labels.map(name => [name, 1])]) },
    ]
    const { body } = await harness({ rawExtraction: { exam_scores: rows } }).run()
    expect(body.extracted.exam_scores.map(row => row.section_scores)).toEqual([{ 'VARC percentile': 98 }, { 'Quantitative score': 85 }])
  })

  it('restricts every optional identity category to printed common facts', async () => {
    const outputs = await Promise.all(['pan_card', 'aadhaar_card', 'passport', 'government_id'].map(async documentType => {
      const { body } = await harness({ documentType, rawExtraction: { full_name: 'Synthetic Applicant', date_of_birth: '2000-04-18', nationality: 'Indian', current_city: '123456789012', phone: '9876543210', academic_10th: { percentage: 98 } } }).run()
      return body.extracted
    }))
    expect(outputs).toEqual(Array.from({ length: 4 }, () => ({ full_name: 'Synthetic Applicant', date_of_birth: '2000-04-18', nationality: 'Indian' })))
  })

  it('rejects refusals without saving extracted facts and releases the lease', async () => {
    const test = harness({ refusal: true })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, state: test.events.writes[0].patch.status, extracted: result.body.extracted, released: test.events.writes.at(-1).table }).toEqual({ status: 422, code: 'OCR_REFUSED', state: 'error', extracted: undefined, released: 'admissions_ocr_requests' })
  })

  it('rejects token-truncated output even when it contains valid partial JSON', async () => {
    const test = harness({ finishReason: 'length', rawExtraction: { full_name: 'Partial synthetic output' } })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, extractedWrites: test.events.writes.filter(event => event.patch.extracted_data).length }).toEqual({ status: 422, code: 'OCR_INCOMPLETE', extractedWrites: 0 })
  })

  it('rejects empty or malformed AI output without leaking its content', async () => {
    const outputs = await Promise.all(['', 'Synthetic private text rather than JSON', '[]'].map(async outputText => {
      const test = harness({ outputText })
      const result = await test.run()
      return { status: result.status, code: result.body.code, messageContainsRaw: result.body.error.includes('Synthetic private'), extractedWrites: test.events.writes.filter(event => event.patch.extracted_data).length }
    }))
    expect(outputs).toEqual(Array.from({ length: 3 }, () => ({ status: 422, code: 'OCR_INVALID_RESULT', messageContainsRaw: false, extractedWrites: 0 })))
  })

  it('does not report an empty object as successful extraction', async () => {
    const test = harness({ rawExtraction: {} })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, extractedWrites: test.events.writes.filter(event => event.patch.extracted_data).length }).toEqual({ status: 422, code: 'OCR_NO_FIELDS', extractedWrites: 0 })
  })

  it('stops after free quota exhaustion without retrying or using a paid fallback', async () => {
    const outputs = await Promise.all([402, 429].map(async providerStatus => {
      const test = harness({ providerStatus })
      const result = await test.run()
      return { status: result.status, code: result.body.code, stopped: result.body.stop_batch, requests: test.events.provider.length, exposed: JSON.stringify(result.body).includes('Synthetic secret') }
    }))
    expect(outputs).toEqual(Array.from({ length: 2 }, () => ({ status: 429, code: 'OCR_QUOTA_EXHAUSTED', stopped: true, requests: 1, exposed: false })))
  })

  it('sanitizes provider configuration errors and stops the batch', async () => {
    const test = harness({ providerStatus: 401 })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, stopped: result.body.stop_batch, exposed: JSON.stringify(result.body).includes('Synthetic secret'), requests: test.events.provider.length }).toEqual({ status: 503, code: 'OCR_PROVIDER_CONFIGURATION', stopped: true, exposed: false, requests: 1 })
  })

  it('sanitizes provider network failures and stops the batch', async () => {
    const test = harness({ providerThrows: true })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, stopped: result.body.stop_batch, exposed: JSON.stringify(result.body).includes('Synthetic private'), requests: test.events.provider.length }).toEqual({ status: 503, code: 'OCR_SERVICE_UNAVAILABLE', stopped: true, exposed: false, requests: 1 })
  })

  it('rejects unsuccessful provider envelopes even with HTTP success', async () => {
    const test = harness({ providerPayload: { success: false, errors: [{ message: 'Synthetic private failure' }] } })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, stopped: result.body.stop_batch, exposed: JSON.stringify(result.body).includes('Synthetic private') }).toEqual({ status: 503, code: 'OCR_SERVICE_UNAVAILABLE', stopped: true, exposed: false })
  })

  it('requires confirmed suggestion persistence before reporting success', async () => {
    const test = harness({ saveFailure: true })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, stopped: result.body.stop_batch, ok: result.body.ok, released: test.events.writes.at(-1).table }).toEqual({ status: 503, code: 'OCR_SAVE_NOT_CONFIRMED', stopped: true, ok: undefined, released: 'admissions_ocr_requests' })
  })

  it('answers CORS preflight without authentication or private access', async () => {
    const test = harness()
    const result = await test.run({ method: 'OPTIONS', authorization: false })
    expect({ status: result.status, auth: test.events.auth, methods: result.headers.get('access-control-allow-methods') }).toEqual({ status: 204, auth: 0, methods: 'GET, POST, OPTIONS' })
  })
})
