import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { answerDocumentsFirst, documentReturnPath, formReturnPath, hasAnsweredDocumentsFirst, shouldOfferDocumentsFirst } from '../src/lib/admissionsDocumentsFirst'

const workspace = vi.hoisted(() => ({ current: null }))
vi.mock('../src/context/AdmissionsContext', () => ({ useAdmissions: () => workspace.current }))
import DocumentsFirstPrompt from '../src/components/DocumentsFirstPrompt'

const eligible = { userId: 'new-account', documents: [], documentsLoaded: true, documentsUserId: 'new-account' }
function render(overrides = {}) {
  const user = { id: 'prompt-test-account' }
  workspace.current = { user, documents: [], documentsLoaded: true, documentsUserId: user.id, ...overrides }
  return renderToStaticMarkup(<MemoryRouter><DocumentsFirstPrompt><input aria-label="Your existing form" defaultValue="Retained draft"/></DocumentsFirstPrompt></MemoryRouter>)
}
afterEach(() => { workspace.current = null })

describe('documents-first eligibility', () => {
  it('offers the choice after a successful empty document list for the current account', () => {
    expect(shouldOfferDocumentsFirst(eligible)).toBe(true)
  })
  it('does not mistake an unknown or failed list for an empty library', () => {
    expect(shouldOfferDocumentsFirst({ ...eligible, documentsLoaded: false })).toBe(false)
    expect(shouldOfferDocumentsFirst({ ...eligible, documents: undefined })).toBe(false)
  })
  it('ignores a document load belonging to a previous account', () => {
    expect(shouldOfferDocumentsFirst({ ...eligible, documentsUserId: 'previous-account' })).toBe(false)
  })
  it('does not interrupt someone who already uploaded any document, including a photo', () => {
    expect(shouldOfferDocumentsFirst({ ...eligible, documents: [{ id: 'photo', document_type: 'photo' }] })).toBe(false)
  })
  it('requires an account and respects the session choice and inactive form steps', () => {
    expect(shouldOfferDocumentsFirst({ ...eligible, userId: null })).toBe(false)
    expect(shouldOfferDocumentsFirst({ ...eligible, dismissed: true })).toBe(false)
    expect(shouldOfferDocumentsFirst({ ...eligible, enabled: false })).toBe(false)
  })
})

describe('session-scoped choices and return navigation', () => {
  it('keeps a choice for one account without dismissing another account', () => {
    const values = new Map(), storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }
    answerDocumentsFirst('session-choice-a', storage)
    expect(hasAnsweredDocumentsFirst('session-choice-a', storage)).toBe(true)
    expect(hasAnsweredDocumentsFirst('session-choice-b', storage)).toBe(false)
    expect([...values.values()]).toEqual(['answered'])
  })
  it('continues smoothly if browser storage is blocked', () => {
    const storage = { getItem: () => { throw new Error('Blocked') }, setItem: () => { throw new Error('Blocked') } }
    expect(hasAnsweredDocumentsFirst('blocked-storage-account', storage)).toBe(false)
    expect(() => answerDocumentsFirst('blocked-storage-account', storage)).not.toThrow()
    expect(hasAnsweredDocumentsFirst('blocked-storage-account', storage)).toBe(true)
  })
  it('accepts only known internal return routes', () => {
    expect(documentReturnPath('/onboarding')).toBe('/onboarding')
    expect(documentReturnPath('/application-builder')).toBe('/application-builder')
    expect(documentReturnPath('https://another-site.example')).toBe('/profile')
    expect(documentReturnPath('//another-site.example')).toBe('/profile')
    expect(documentReturnPath('/admin')).toBe('/profile')
    expect(formReturnPath('/apply/saved-application')).toBe('/application-builder')
    expect(formReturnPath('/profile/edit')).toBe('/profile')
  })
})

describe('documents-first form integration', () => {
  it('shows both optional choices in an accessible dialog without replacing the form draft', () => {
    const html = render()
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain('aria-describedby="documents-first-description"')
    expect(html).toContain('Upload documents first')
    expect(html).toContain('Continue here')
    expect(html).toContain('Documents are optional at this step')
    expect(html).toContain('does not upload a file or start extraction')
    expect(html).toContain('value="Retained draft"')
    expect(html).toContain('<div inert="">')
  })
  it('keeps the form available without a popup when the list has not loaded', () => {
    const html = render({ documentsLoaded: false })
    expect(html).not.toContain('role="dialog"')
    expect(html).not.toContain('inert=')
    expect(html).toContain('value="Retained draft"')
  })
  it('does not show the empty-library popup using a previous account load', () => {
    expect(render({ documentsUserId: 'other-account' })).not.toContain('role="dialog"')
  })
  it('does not repeat the choice on another form in the same account session', () => {
    const id = 'already-answered-form-account'
    answerDocumentsFirst(id, null)
    expect(render({ user: { id }, documentsUserId: id })).not.toContain('role="dialog"')
  })
})
