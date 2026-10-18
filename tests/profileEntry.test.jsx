import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

const workspace = vi.hoisted(() => ({ current: null }))
vi.mock('../src/context/AdmissionsContext', () => ({ useAdmissions: () => workspace.current }))
vi.mock('../src/lib/supabase', () => ({ supabase: {} }))
vi.mock('../src/components/Layout', () => ({ default: ({ children }) => <main>{children}</main> }))
vi.mock('../src/components/PrivateProfilePhoto', () => ({ default: () => <div>Private profile photo</div> }))
vi.mock('../src/components/ReviewedProfileEditor', () => ({ default: () => <form aria-label="Editable profile"/> }))
vi.mock('react-router-dom', async () => ({ ...await vi.importActual('react-router-dom'), Navigate: ({ to }) => <span data-redirect={to}/> }))
import Profile from '../src/pages/Profile'
import { createEmptyProfile } from '../src/lib/admissionsProfile'

const user = { id: 'current-account', email: 'applicant@example.com' }
const completed = () => ({ ...createEmptyProfile(user), full_name: 'Applicant', onboarding: { version: 1, step: 'complete', documents_choice: 'manual', completed_at: '2026-10-18T12:00:00.000Z' } })
function render({ edit = false, accountOnly = false, ...overrides } = {}) {
  workspace.current = { user, profile: completed(), loading: false, profileLoaded: true, profileUserId: user.id, documents: [], plans: [], ...overrides }
  return renderToStaticMarkup(<MemoryRouter><Profile edit={edit} accountOnly={accountOnly}/></MemoryRouter>)
}
afterEach(() => { workspace.current = null })

describe('profile entry and overview', () => {
  it('sends an incomplete signed-in profile into guided setup', () => {
    expect(render({ profile: createEmptyProfile(user) })).toContain('data-redirect="/onboarding"')
  })
  it('does not let the direct edit route skip initial setup', () => {
    expect(render({ edit: true, profile: createEmptyProfile(user) })).toContain('data-redirect="/onboarding"')
  })
  it('waits for an authoritative profile load before routing a new account', () => {
    expect(render({ profileLoaded: false })).toContain('Loading your saved information')
  })
  it('does not display a previous account profile', () => {
    expect(render({ profileUserId: 'previous-account' })).not.toContain('Your profile at a glance')
  })
  it('offers a retry when profile loading fails', () => {
    expect(render({ profileLoaded: false, profileError: 'Connection unavailable' })).toContain('Retry loading profile')
  })
  it('shows a saved overview after setup', () => {
    expect(render()).toContain('Your profile at a glance')
  })
  it('opens the editor through the separate edit route', () => {
    expect(render({ edit: true })).toContain('aria-label="Editable profile"')
  })
  it('keeps the overview free of the full form', () => {
    expect(render()).not.toContain('aria-label="Editable profile"')
  })
  it('allows account management even when initial profile loading failed', () => {
    expect(render({ accountOnly: true, profileLoaded: false, profileError: 'Connection unavailable' })).toContain('Delete my account')
  })
  it('shows zero months for a fresh graduate rather than treating zero as missing', () => {
    expect(render({ profile: { ...completed(), total_work_experience_months: 0 } })).toContain('0 months')
  })
})
