import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createEmptyProfile } from '../src/lib/admissionsProfile'

const workspace = vi.hoisted(() => ({ current: null }))
vi.mock('../src/context/AdmissionsContext', () => ({ useAdmissions: () => workspace.current }))
vi.mock('../src/components/Layout', () => ({ default: ({ children }) => <main>{children}</main> }))
vi.mock('../src/lib/admissionsApi', () => ({ submitAdmissionsApplication: vi.fn() }))
import ApplicationBuilder from '../src/pages/ApplicationBuilder'

function render(overrides = {}) {
  const user = { id: 'test-student', email: 'student@example.com' }
  workspace.current = {
    user, profile: { ...createEmptyProfile(user), full_name: 'Student Current' },
    plans: [], documents: [], draft: null, loading: false, saving: false, error: '',
    saveProfile: vi.fn(), saveDraft: vi.fn(), refreshPlans: vi.fn(), ...overrides,
  }
  return renderToStaticMarkup(<MemoryRouter><ApplicationBuilder /></MemoryRouter>)
}
afterEach(() => { workspace.current = null })

describe('common application integration', () => {
  it('renders the editable current profile inside the common application', () => {
    expect(render()).toContain('value="Student Current"')
  })
  it('keeps a legitimate zero-month experience in the common application', () => {
    const user = { id: 'test-student', email: 'student@example.com' }
    const profile = { ...createEmptyProfile(user), total_work_experience_months: 0 }
    expect(render({ profile })).toMatch(/Total full-time experience \(months\)[\s\S]{0,800}value="0"/)
  })
  it('exposes a grading scale for each academic record in the common application', () => {
    expect(render().match(/CGPA grading scale/g)?.length).toBe(3)
  })
  it('keeps the embedded common details free of nested submit forms', () => {
    expect(render()).not.toContain('<form')
  })
  it('hides stale private profile values while account data loads', () => {
    expect(render({ loading: true })).not.toContain('Student Current')
  })
  it('shows a database receipt only when a durable receipt is in the draft', () => {
    const receipt = { id: 'receipt-id', receipt: 'UNIDEX-TEST', submitted_at: '2026-10-16T07:00:00Z', college_count: 2 }
    expect(render({ draft: { receipt } })).toContain('UNIDEX-TEST')
  })
  it('makes clear that a receipt is internal collection rather than college portal submission', () => {
    const receipt = { id: 'receipt-id', receipt: 'UNIDEX-TEST', submitted_at: '2026-10-16T07:00:00Z', college_count: 2 }
    expect(render({ draft: { receipt } })).toContain('Each institution’s official submission and any application fee still need to be completed separately.')
  })
})
