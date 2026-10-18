import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import AdmissionsProfileForm from '../src/components/AdmissionsProfileForm'
import ProfileOverview from '../src/components/ProfileOverview'
import { createEmptyProfile } from '../src/lib/admissionsProfile'

const profile = { ...createEmptyProfile(), full_name: 'Synthetic Applicant', email: 'applicant@example.invalid', professional_qualifications: [{ qualification: 'CA', title: 'CA Final', institution: 'ICAI', status: 'completed', completion_year: 2024, percentage: 64.5 }] }
const form = props => renderToStaticMarkup(<AdmissionsProfileForm value={profile} onChange={() => {}} {...props}/>)
const overview = value => renderToStaticMarkup(<MemoryRouter><ProfileOverview profile={value}/></MemoryRouter>)

describe('qualification and defence profile forms', () => {
  it('exposes professional qualifications within the guided education step', () => {
    expect(form({ section: 'academics', guided: true })).toContain('aria-label="Professional and advanced qualifications"')
  })
  it('preserves an extracted CA awarding institution in an editable field', () => {
    expect(form({ section: 'academics' })).toMatch(/<input[^>]*value="ICAI"/)
  })
  it('provides a doctorate option alongside CA, CS and CMA', () => {
    expect(form({ section: 'academics' })).toContain('<option value="PhD">Doctorate / PhD</option>')
  })
  it('prevents adding qualifications beyond the twenty row bound', () => {
    const value = { ...profile, professional_qualifications: Array.from({ length: 20 }, () => profile.professional_qualifications[0]) }
    expect(form({ value, section: 'academics' })).toMatch(/<button type="button" disabled=""[^>]*>.*?Add a qualification/s)
  })
  it('keeps new controls inside the disabled fieldset during a save', () => {
    expect(form({ section: 'academics', saving: true })).toMatch(/<fieldset disabled=""[^>]*>.*?Professional and advanced qualifications.*?<\/fieldset>/s)
  })
  it('hides new education fields when the user is on another guided step', () => {
    expect(form({ section: 'personal', guided: true })).not.toContain('aria-label="Professional and advanced qualifications"')
  })
  it('provides a dedicated defence service status selector in Experience', () => {
    expect(form({ section: 'work' })).toContain('Veteran / released from service')
  })
  it('preserves an extracted service branch even when it is outside the preset list', () => {
    const value = { ...profile, defence_service: { status: 'veteran', branch: 'Army Medical Corps', rank: 'Major', current: false } }
    expect(form({ value, section: 'work' })).toContain('<option value="Army Medical Corps" selected="">Army Medical Corps</option>')
  })
  it('shows the annual CTC completion prompt for an experienced applicant', () => {
    expect(form({ value: { ...profile, total_work_experience_months: 36 }, section: 'work' })).toContain('Add your last drawn annual CTC in INR to complete this part of your profile.')
  })
  it('does not add a salary completion prompt for a fresh graduate', () => {
    expect(form({ value: { ...profile, total_work_experience_months: 0 }, section: 'work' })).not.toContain('Your experience is saved.')
  })
  it('makes the GMAT edition explicit before comparing raw score scales', () => {
    expect(form({ value: { ...profile, exam_scores: [{ exam: 'GMAT', total_score: 675, exam_version: 'focus' }] }, section: 'exams' })).toContain('<option value="focus" selected="">GMAT Exam / Focus (205–805)</option>')
  })
  it('keeps a negative original scaled section score editable', () => {
    expect(form({ value: { ...profile, exam_scores: [{ exam: 'CAT', section_scores: { 'DILR scaled score': -2.5 } }] }, section: 'exams' })).toMatch(/type="number" min="-100" max="1000"[^>]*value="-2\.5"/)
  })
})

describe('profile overview qualifications and service', () => {
  it('shows the saved professional qualification and awarding institute', () => {
    expect(overview(profile)).toMatch(/CA Final.*?ICAI/s)
  })
  it('shows the saved defence rank and leadership summary', () => {
    expect(overview({ ...profile, defence_service: { status: 'veteran', branch: 'Indian Army', rank: 'Major', leadership_summary: 'Led training teams.' } })).toMatch(/Indian Army.*?Major.*?Led training teams\./s)
  })
  it('shows annual CTC as a completion item for experienced applicants', () => {
    expect(overview({ ...profile, total_work_experience_months: 24 })).toContain('Add your last drawn annual CTC in INR to complete your work details.')
  })
})
