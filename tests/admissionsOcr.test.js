import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

// Run the actual Edge Function handler with isolated Auth/Storage/provider doubles.
// No environment files, API keys, network, database or real student records are used.
const source = stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/admissions-ocr/index.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, ''))
const OWNER = '11111111-1111-4111-8111-111111111111'
const OTHER = '33333333-3333-4333-8333-333333333333'
const DOCUMENT = '22222222-2222-4222-8222-222222222222'
const rawExtraction = {
  full_name: 'SYNTHETIC TEST APPLICANT',
  academic_10th: { percentage: ' \t', cgpa: 0 },
  academic_graduation: { degree: 'B.Com', cgpa: 3.7, cgpa_scale: 4 },
  exam_scores: [
    { exam: 'gmat', total_score: 675, percentile: null, section_scores: [{ name: 'Quantitative score', score: 85 }] },
    { exam: 'CAT', total_score: null, percentile: 98.4, section_scores: [{ name: 'VARC percentile', score: 97.2 }] },
    { exam: 'SAT', total_score: 1600, percentile: null, section_scores: [] },
  ],
  work_experience: [{ company: 'Synthetic Company', designation: 'Analyst', start_date: '2023-06', current: true }],
}

function harness(options = {}) {
  const image = options.mime === 'image/png'
  const bytes = options.invalidMagic ? new TextEncoder().encode('invalid fixture') : image ? new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) : new TextEncoder().encode('%PDF-1.7\nsynthetic fixture')
  const document = { id: DOCUMENT, user_id: options.otherOwner ? OTHER : OWNER, document_type: options.documentType || 'resume', file_name: image ? 'synthetic.png' : 'synthetic.pdf', mime_type: image ? 'image/png' : 'application/pdf', size_bytes: bytes.length, storage_bucket: 'unidex-admissions-private', storage_path: `${options.otherOwner ? OTHER : OWNER}/${DOCUMENT}/fixture` }
  const events = { reads: 0, downloads: 0, leases: 0, writes: [], provider: [] }
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: OWNER } } }) },
    from(table) {
      let patch = null
      const filters = {}
      const query = {
        select: () => query,
        eq(key, value) { filters[key] = value; return query },
        single: () => query,
        update(value) { patch = value; return query },
        then(resolve) {
          if (patch) events.writes.push({ table, patch })
          else events.reads++
          const visible = table === 'student_admissions_documents' && (!filters.user_id || filters.user_id === document.user_id)
          return Promise.resolve({ data: visible ? { ...document, ...patch } : null, error: null }).then(resolve)
        },
      }
      return query
    },
    rpc: async () => { events.leases++; return { data: options.rateLimited ? { claimed: false, reason: 'rate_limit' } : { claimed: true, request_id: 'synthetic-lease' } } },
    storage: { from: () => ({ download: async () => { events.downloads++; return { data: new Blob([bytes]) } } }) },
  }
  const scope = {
    Deno: { env: { get: name => name === 'OPENAI_OCR_ENABLED' ? options.disabled ? 'false' : 'true' : name === 'OPENAI_OCR_MODEL' ? undefined : 'synthetic-fixture-value' }, serve: handler => { scope.handler = handler } },
    createClient: () => db,
    Response, TextDecoder, AbortSignal, btoa,
    fetch: async (url, request) => {
      events.provider.push({ url, body: JSON.parse(request.body) })
      if (options.providerError) return new Response(JSON.stringify({ error: { message: 'synthetic-fixture-value' } }), { status: 401 })
      if (options.providerCredits) return new Response(JSON.stringify({ error: { code: 'credit_balance_exhausted', type: 'insufficient_quota', message: 'synthetic-fixture-value' } }), { status: 429 })
      if (options.providerRate) return new Response(JSON.stringify({ error: { code: 'rate_limit_exceeded', type: 'requests', message: 'synthetic-fixture-value' } }), { status: 429 })
      const payload = options.refusal
        ? { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'Synthetic refusal' }] }] }
        : options.incomplete
          ? { status: 'incomplete', output: [] }
          : { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(options.rawExtraction || rawExtraction) }] }] }
      return new Response(JSON.stringify(payload), { status: 200 })
    },
  }
  vm.runInNewContext(source, scope)
  return {
    events,
    run: async (consent = true) => {
      const response = await scope.handler(new Request('https://synthetic.invalid', { method: 'POST', headers: { authorization: 'Bearer synthetic-session' }, body: JSON.stringify({ document_id: DOCUMENT, openai_document_processing: consent }) }))
      return { status: response.status, body: await response.json() }
    },
  }
}

describe('Authenticated OpenAI admissions extraction', () => {
  it('blocks a disabled provider before reading private documents', async () => {
    const test = harness({ disabled: true })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, stopBatch: result.body.stop_batch, reads: test.events.reads, downloads: test.events.downloads, provider: test.events.provider.length }).toEqual({ status: 503, code: 'OCR_DISABLED', stopBatch: true, reads: 0, downloads: 0, provider: 0 })
  })

  it('requires document-specific provider consent before private access', async () => {
    const test = harness()
    const result = await test.run(false)
    expect({ status: result.status, reads: test.events.reads, provider: test.events.provider.length }).toEqual({ status: 403, reads: 0, provider: 0 })
  })

  it('cannot read or process another account’s document', async () => {
    const test = harness({ otherOwner: true })
    const result = await test.run()
    expect({ status: result.status, leases: test.events.leases, downloads: test.events.downloads, provider: test.events.provider.length }).toEqual({ status: 404, leases: 0, downloads: 0, provider: 0 })
  })

  it('stops a rate-limited request before storage and provider processing', async () => {
    const test = harness({ rateLimited: true })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, stopBatch: result.body.stop_batch, downloads: test.events.downloads, provider: test.events.provider.length }).toEqual({ status: 429, code: 'OCR_RATE_LIMITED', stopBatch: true, downloads: 0, provider: 0 })
  })

  it('sends a stateless strict-schema inline PDF request to Responses', async () => {
    const test = harness()
    await test.run()
    const { url, body } = test.events.provider[0]
    expect({ url, model: body.model, stored: body.store, file: body.input[0].content[1], format: body.text.format }).toMatchObject({ url: 'https://api.openai.com/v1/responses', model: 'gpt-5.4-mini-2026-03-17', stored: false, file: { type: 'input_file', filename: 'synthetic.pdf', detail: 'high' }, format: { type: 'json_schema', strict: true, schema: { type: 'object', additionalProperties: false } } })
  })

  it('saves suggestions for review without writing the student profile', async () => {
    const test = harness()
    const result = await test.run()
    expect({ status: result.status, review: result.body.requires_review, state: result.body.document.status, writeTables: test.events.writes.map(event => event.table) }).toEqual({ status: 200, review: true, state: 'needs_review', writeTables: ['student_admissions_documents', 'admissions_ocr_requests'] })
  })

  it('preserves official score scales, zero marks and missing values independently', async () => {
    const test = harness()
    const { body } = await test.run()
    const data = body.extracted
    expect({ percentage: data.academic_10th.percentage ?? null, cgpaZero: data.academic_10th.cgpa, graduateCgpa: data.academic_graduation.cgpa, scale: data.academic_graduation.cgpa_scale, gmat: data.exam_scores[0].total_score, gmatPercentile: data.exam_scores[0].percentile, catScore: data.exam_scores[1].total_score, catPercentile: data.exam_scores[1].percentile, sat: data.exam_scores[2].total_score, section: data.exam_scores[1].section_scores['VARC percentile'], start: data.work_experience[0].start_date }).toEqual({ percentage: null, cgpaZero: 0, graduateCgpa: 3.7, scale: 4, gmat: 675, gmatPercentile: null, catScore: null, catPercentile: 98.4, sat: 1600, section: 97.2, start: '2023-06' })
  })

  it('keeps refused extractions out of the profile and releases their lease', async () => {
    const test = harness({ refusal: true })
    const result = await test.run()
    expect({ status: result.status, state: test.events.writes[0].patch.status, released: test.events.writes.at(-1).table, profileWrites: test.events.writes.filter(event => event.table === 'student_admissions_profiles').length }).toEqual({ status: 502, state: 'error', released: 'admissions_ocr_requests', profileWrites: 0 })
  })

  it('rejects incomplete model output instead of applying partial extracted fields', async () => {
    const test = harness({ incomplete: true })
    const result = await test.run()
    expect({ status: result.status, extracted: result.body.extracted ?? null, state: test.events.writes[0].patch.status }).toEqual({ status: 502, extracted: null, state: 'error' })
  })

  it('sanitizes access errors and suggests retry only for transient provider rate limits', async () => {
    const access = harness({ providerError: true })
    const rate = harness({ providerRate: true })
    const [denied, limited] = await Promise.all([access.run(), rate.run()])
    expect({ denied: { status: denied.status, error: denied.body.error, code: denied.body.code }, limited: { status: limited.status, error: limited.body.error, code: limited.body.code }, rateRequests: rate.events.provider.length }).toEqual({ denied: { status: 503, error: 'OpenAI extraction configuration or model access needs attention. Contact support or enter your details manually.', code: 'OCR_PROVIDER_CONFIGURATION' }, limited: { status: 429, error: 'OpenAI extraction is temporarily rate limited. Try later or enter your details manually.', code: 'OCR_RATE_LIMITED' }, rateRequests: 1 })
  })

  it('does not retry exhausted API credits or mislabel them as temporary rate limiting', async () => {
    const test = harness({ providerCredits: true })
    const result = await test.run()
    expect({ status: result.status, error: result.body.error, code: result.body.code, stopBatch: result.body.stop_batch, requests: test.events.provider.length }).toEqual({ status: 503, error: 'OpenAI document extraction is unavailable because the service’s API credits or spending allowance need attention. Contact support or enter details manually.', code: 'OCR_QUOTA_EXHAUSTED', stopBatch: true, requests: 1 })
  })

  it('rejects a mismatched file signature before sending anything to OpenAI', async () => {
    const test = harness({ invalidMagic: true })
    const result = await test.run()
    expect({ status: result.status, provider: test.events.provider.length, state: test.events.writes[0].patch.status }).toEqual({ status: 502, provider: 0, state: 'error' })
  })

  it('discards identity numbers accidentally returned as phone, marks or digit-containing text', async () => {
    const test = harness({ documentType: 'aadhaar_card', rawExtraction: { ...rawExtraction, full_name: 'Synthetic Applicant', date_of_birth: '2000-04-18', nationality: 'Indian', current_city: '123456789012', phone: '123456789012' } })
    const { body } = await test.run()
    expect(body.extracted).toEqual({ full_name: 'Synthetic Applicant', date_of_birth: '2000-04-18', nationality: 'Indian' })
  })

  it('applies the limited identity output policy to every optional identity category', async () => {
    const results = await Promise.all(['pan_card', 'aadhaar_card', 'passport', 'government_id'].map(async documentType => {
      const { body } = await harness({ documentType }).run()
      return Object.keys(body.extracted)
    }))
    expect(results).toEqual([['full_name'], ['full_name'], ['full_name'], ['full_name']])
  })

  it('blocks profile photographs before obtaining a provider lease', async () => {
    const test = harness({ documentType: 'photo', mime: 'image/png' })
    const result = await test.run()
    expect({ status: result.status, code: result.body.code, leases: test.events.leases, provider: test.events.provider.length }).toEqual({ status: 400, code: 'PHOTO_EXTRACTION_DISABLED', leases: 0, provider: 0 })
  })
})
