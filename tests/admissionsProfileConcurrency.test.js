import { readFileSync } from 'node:fs'
import { webcrypto } from 'node:crypto'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { normalizeAiImports, validateAdmissionsProfile } from '../src/lib/admissionsProfile'
import { DOCUMENT_MIME_TYPES, IMAGE_MIME_TYPES, isDocumentType } from '../src/lib/admissionsDocumentTypes'

const source = readFileSync(new URL('../src/lib/admissionsApi.js', import.meta.url), 'utf8').replace(/^import .*\r?\n/gm, '').replace(/^export /gm, '')
const OWNER = '11111111-1111-4111-8111-111111111111'

function apiHarness(results = [], signedInUser = OWNER) {
  const events = []
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: signedInUser, email: 'synthetic@example.invalid' } } }) },
    from(table) {
      const event = { table, filters: {}, action: 'read' }
      const query = {
        select: () => query, maybeSingle: () => query, single: () => query,
        eq(key, value) { event.filters[key] = value; return query },
        insert(value) { event.action = 'insert'; event.value = value; return query },
        update(value) { event.action = 'update'; event.value = value; return query },
        upsert(value) { event.action = 'upsert'; event.value = value; return query },
        then(resolve) { events.push(event); return Promise.resolve(results.shift() || { data: null }).then(resolve) },
      }
      return query
    },
  }
  const scope = { supabase: db, crypto: webcrypto, normalizeAiImports, validateAdmissionsProfile, DOCUMENT_MIME_TYPES, IMAGE_MIME_TYPES, isDocumentType }
  vm.runInNewContext(`${source};globalThis.api={loadAdmissionsProfileRecord,saveAdmissionsProfile};`, scope)
  return { api: scope.api, events }
}

describe('Document review profile concurrency', () => {
  it('returns the persisted profile with the database revision', async () => {
    const test = apiHarness([{ data: { profile: { full_name: 'Synthetic Applicant' }, schema_version: 1, revision: 7 } }])
    expect(await test.api.loadAdmissionsProfileRecord(OWNER)).toEqual({ profile: { full_name: 'Synthetic Applicant', schema_version: 1 }, revision: 7 })
  })

  it('returns revision zero for an unsaved legacy profile without creating a row', async () => {
    const test = apiHarness([{ data: null }, { data: { name: 'Synthetic Applicant', academic_background: { gpa: 3.7, gpa_scale: 4 } } }])
    const record = await test.api.loadAdmissionsProfileRecord(OWNER)
    expect({ revision: record.revision, cgpa: record.profile.academic_graduation.cgpa, scale: record.profile.academic_graduation.cgpa_scale, actions: test.events.map(event => event.action) }).toEqual({ revision: 0, cgpa: 3.7, scale: 4, actions: ['read', 'read'] })
  })

  it('rejects a competing first save instead of overwriting the newly created profile', async () => {
    const test = apiHarness([{ error: { code: '23505', message: 'duplicate row' } }])
    const error = await test.api.saveAdmissionsProfile({ full_name: 'Older review' }, OWNER, 0).catch(error => error)
    expect({ code: error.code, actions: test.events.map(event => event.action) }).toEqual({ code: 'PROFILE_CHANGED', actions: ['insert'] })
  })

  it('saves a review only against the expected owner and revision', async () => {
    const test = apiHarness([{ data: { profile: { full_name: 'Reviewed Applicant' } } }])
    const saved = await test.api.saveAdmissionsProfile({ full_name: 'Reviewed Applicant' }, OWNER, 7)
    expect({ saved, action: test.events[0].action, filters: test.events[0].filters }).toEqual({ saved: { full_name: 'Reviewed Applicant' }, action: 'update', filters: { user_id: OWNER, revision: 7 } })
  })

  it('requires a fresh review if another tab already advanced the revision', async () => {
    const test = apiHarness([{ data: null }])
    const error = await test.api.saveAdmissionsProfile({ full_name: 'Stale review' }, OWNER, 6).catch(error => error)
    expect({ code: error.code, actions: test.events.map(event => event.action) }).toEqual({ code: 'PROFILE_CHANGED', actions: ['update'] })
  })

  it('preserves ordinary profile saves when no review revision was supplied', async () => {
    const test = apiHarness([{ data: { profile: { full_name: 'Manual edit' } } }])
    await test.api.saveAdmissionsProfile({ full_name: 'Manual edit' }, OWNER)
    expect(test.events.map(event => event.action)).toEqual(['upsert'])
  })

  it('rejects a queued review after the signed-in account changes', async () => {
    const test = apiHarness([], 'another-account')
    const error = await test.api.saveAdmissionsProfile({ full_name: 'Old account data' }, OWNER, 7).catch(error => error)
    expect({ code: error.code, queries: test.events.length }).toEqual({ code: 'ACCOUNT_CHANGED', queries: 0 })
  })
})
