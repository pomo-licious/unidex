import { readFileSync } from 'node:fs'
import { webcrypto } from 'node:crypto'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { normalizeAiImports, validateAdmissionsProfile } from '../src/lib/admissionsProfile'
import { DOCUMENT_MIME_TYPES, IMAGE_MIME_TYPES, isDocumentType } from '../src/lib/admissionsDocumentTypes'

const source = readFileSync(new URL('../src/lib/admissionsApi.js', import.meta.url), 'utf8').replace(/^import .*\r?\n/gm, '').replace(/^export /gm, '')
const OWNER = '11111111-1111-4111-8111-111111111111'
const PHOTO = '22222222-2222-4222-8222-222222222222'
const OTHER = '33333333-3333-4333-8333-333333333333'
const photo = { id: PHOTO, user_id: OWNER, document_type: 'photo', mime_type: 'image/png', size_bytes: 20, storage_bucket: 'unidex-admissions-private', storage_path: `${OWNER}/${PHOTO}/photo.png`, file_name: 'photo.png' }

function harness(options = {}) {
  const events = { queries: [], signed: [], uploaded: [], functions: 0 }
  let authIndex = 0
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: options.authUsers?.[Math.min(authIndex++, options.authUsers.length - 1)] || OWNER } } }) },
    from(table) {
      const event = { table, action: 'read', filters: {}, value: null }
      const query = {
        select: () => query, single: () => query, maybeSingle: () => query,
        eq(key, value) { event.filters[key] = value; return query },
        insert(value) { event.action = 'insert'; event.value = value; return query },
        upsert(value) { event.action = 'upsert'; event.value = value; return query },
        update(value) { event.action = 'update'; event.value = value; return query },
        then(resolve) {
          events.queries.push(event)
          const stored = options.document === null ? null : { ...photo, ...options.document }
          const document = stored && (!event.filters.user_id || stored.user_id === event.filters.user_id) ? stored : null
          return Promise.resolve({ data: table === 'student_admissions_documents' ? event.action === 'insert' ? event.value : document : { profile: event.action === 'read' ? options.currentProfile : event.value?.profile } }).then(resolve)
        },
      }
      return query
    },
    storage: { from: bucket => ({
      createSignedUrl: async (path, ttl) => { events.signed.push({ bucket, path, ttl }); return { data: { signedUrl: 'https://synthetic.invalid/private-photo?token=synthetic' } } },
      createSignedUrls: async paths => ({ data: paths.map(path => ({ path, signedUrl: 'https://synthetic.invalid/private-document' })) }),
      upload: async (path, file) => { events.uploaded.push({ path, type: file.type }); return {} },
    }) },
    functions: { invoke: async () => { events.functions++; return { error: { message: 'Edge Function returned a non-2xx status code', context: new Response(JSON.stringify(options.functionFailure || {}), { status: options.functionStatus || 503 }) } } } },
  }
  const scope = { supabase: db, crypto: webcrypto, normalizeAiImports, validateAdmissionsProfile, DOCUMENT_MIME_TYPES, IMAGE_MIME_TYPES, isDocumentType }
  vm.runInNewContext(`${source};globalThis.api={getAdmissionsProfilePhoto,saveAdmissionsProfile,uploadAdmissionsDocument,extractAdmissionsDocument};`, scope)
  return { api: scope.api, events }
}

describe('Private profile photographs and document API', () => {
  it('signs only an owned photograph for five minutes without persisting its URL', async () => {
    const test = harness()
    const result = await test.api.getAdmissionsProfilePhoto({ profile_photo_document_id: PHOTO }, OWNER)
    expect({ id: result.document_id, name: result.file_name, hasUrl: Boolean(result.url), futureExpiry: Date.parse(result.expires_at) > Date.now() + 290_000, signed: test.events.signed, writes: test.events.queries.filter(query => query.action !== 'read').length }).toEqual({ id: PHOTO, name: 'photo.png', hasUrl: true, futureExpiry: true, signed: [{ bucket: 'unidex-admissions-private', path: photo.storage_path, ttl: 300 }], writes: 0 })
  })

  it('falls back safely when a photograph was removed', async () => {
    const test = harness({ document: null })
    expect({ photo: await test.api.getAdmissionsProfilePhoto(PHOTO, OWNER), signed: test.events.signed.length }).toEqual({ photo: null, signed: 0 })
  })

  it('does not sign another account’s document or a forged private storage path', async () => {
    const foreign = harness({ document: { user_id: OTHER } })
    const forgedPath = harness({ document: { storage_path: `${OTHER}/other.png` } })
    expect(await Promise.all([foreign.api.getAdmissionsProfilePhoto(PHOTO, OWNER), forgedPath.api.getAdmissionsProfilePhoto(PHOTO, OWNER)])).toEqual([null, null])
  })

  it('rejects a non-photo document as a profile pointer before any profile write', async () => {
    const test = harness({ document: { document_type: 'pan_card' } })
    const error = await test.api.saveAdmissionsProfile({ profile_photo_document_id: PHOTO }, OWNER).catch(error => error)
    expect({ code: error.code, profileWrites: test.events.queries.filter(query => query.table === 'student_admissions_profiles').length }).toEqual({ code: 'INVALID_PROFILE_PHOTO', profileWrites: 0 })
  })

  it('clears a previously saved deleted photo pointer so later profile edits still save', async () => {
    const test = harness({ document: null, currentProfile: { profile_photo_document_id: PHOTO } })
    const saved = await test.api.saveAdmissionsProfile({ full_name: 'Updated Applicant', profile_photo_document_id: PHOTO }, OWNER)
    expect({ name: saved.full_name, photo: saved.profile_photo_document_id }).toEqual({ name: 'Updated Applicant', photo: null })
  })

  it('rejects a missing or foreign photo ID that was never saved for this account', async () => {
    const test = harness({ document: null })
    const error = await test.api.saveAdmissionsProfile({ profile_photo_document_id: PHOTO }, OWNER).catch(error => error)
    expect({ code: error.code, writes: test.events.queries.filter(query => query.action !== 'read').length }).toEqual({ code: 'INVALID_PROFILE_PHOTO', writes: 0 })
  })

  it('never returns a signed photograph after an account switch', async () => {
    const test = harness({ authUsers: [OWNER, OTHER] })
    const error = await test.api.getAdmissionsProfilePhoto(PHOTO, OWNER).catch(error => error)
    expect({ code: error.code, stopped: error.stopBatch }).toEqual({ code: 'ACCOUNT_CHANGED', stopped: true })
  })

  it('rejects PDF profile photographs before uploading them', async () => {
    const test = harness()
    const error = await test.api.uploadAdmissionsDocument({ name: 'photo.pdf', type: 'application/pdf', size: 20 }, 'photo', undefined, OWNER).catch(error => error)
    expect({ code: error.code, uploads: test.events.uploaded.length }).toEqual({ code: 'INVALID_FILE_TYPE', uploads: 0 })
  })

  it('supports all optional identity categories with real upload metadata', async () => {
    const test = harness()
    const categories = ['pan_card', 'aadhaar_card', 'passport', 'government_id']
    const saved = await Promise.all(categories.map(category => test.api.uploadAdmissionsDocument({ name: 'identity.pdf', type: 'application/pdf', size: 20 }, category, undefined, OWNER)))
    expect(saved.map(document => document.document_type)).toEqual(categories)
  })

  it('preserves quota error semantics so a batch stops without retrying', async () => {
    const test = harness({ document: { document_type: 'resume' }, functionFailure: { error: 'Service credits need attention.', code: 'OCR_QUOTA_EXHAUSTED', stop_batch: true } })
    const error = await test.api.extractAdmissionsDocument(photo, OWNER, true).catch(error => error)
    expect({ code: error.code, status: error.status, stopBatch: error.stopBatch, requests: test.events.functions }).toEqual({ code: 'OCR_QUOTA_EXHAUSTED', status: 503, stopBatch: true, requests: 1 })
  })

  it('keeps photographs out of the extraction provider', async () => {
    const test = harness()
    const error = await test.api.extractAdmissionsDocument(photo, OWNER, true).catch(error => error)
    expect({ code: error.code, requests: test.events.functions }).toEqual({ code: 'PHOTO_EXTRACTION_DISABLED', requests: 0 })
  })
})
