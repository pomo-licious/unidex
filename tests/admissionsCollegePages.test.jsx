import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createEmptyProfile } from '../src/lib/admissionsProfile.js'

const workspace = vi.hoisted(() => ({ current: null }))
vi.mock('../src/context/AdmissionsContext', () => ({ useAdmissions: () => workspace.current }))
vi.mock('../src/components/Layout', () => ({ default: ({ children }) => <main>{children}</main> }))
vi.mock('../src/lib/supabase', () => ({ supabase: { from: vi.fn() } }))
import CollegeDirectory from '../src/pages/CollegeDirectory'
import CollegeProfile from '../src/pages/CollegeProfile'

function render(path, component) {
  workspace.current = { user: null, profile: createEmptyProfile(), plans: [], loading: false, toggleBookmark: vi.fn(), toggleSelection: vi.fn(), updatePlan: vi.fn() }
  return renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><Routes><Route path="/colleges" element={<CollegeDirectory/>}/><Route path="/college/:id" element={component || <CollegeProfile/>}/></Routes></MemoryRouter>)
}
afterEach(() => { workspace.current = null })

describe('Connected college discovery pages', () => {
  it('shows at least ten authentic campus images for the public initial discovery page', () => {
    expect((render('/colleges').match(/<img[^>]+src="\/assets\/colleges\//g) || []).length).toBeGreaterThanOrEqual(10)
  })
  it('does not label unassessed public visitors as personally recommended', () => {
    expect(render('/colleges')).not.toContain('>Recommended for you</h2>')
  })
  it('offers access to the full programme research on each current college page', () => {
    expect(render('/college/ncr-mdi-gurgaon?programme=programme-ncr-197')).toContain('Full programme research')
  })
  it('preserves the programme carried from the discovery card URL', () => {
    expect(render('/college/ncr-mdi-gurgaon?programme=programme-ncr-197')).toContain('value="programme-ncr-197" selected=""')
  })
})
