import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import ExtractedProfileReview from '../src/components/ExtractedProfileReview'
import { createEmptyProfile } from '../src/lib/admissionsProfile'

const user = { id: 'review-account', email: 'student@example.com' }
const sourceId = '00000000-0000-4000-8000-000000000001'
const photoId = '00000000-0000-4000-8000-000000000002'
const profile = {
  ...createEmptyProfile(user), full_name: 'Current Applicant', phone: '+91 9876543210', date_of_birth: '2000-09-17', gender: 'Female', nationality: 'Indian', current_city: 'New Delhi',
  academic_10th: { board: 'CBSE Board', school: 'North Senior School', year: 2016, percentage: 88.5, cgpa: 9.1, cgpa_scale: 10 },
  academic_12th: { board: 'ISC Board', school: 'South Senior School', stream: 'Commerce', year: 2018, percentage: 90.25, cgpa: '', cgpa_scale: '' },
  academic_graduation: { university: 'Delhi University', college: 'Commerce College', degree: 'B.Com', branch: 'Accounting', year_of_passing: 2021, percentage: '', cgpa: 8.4, cgpa_scale: 10 },
  exam_scores: [{ exam: 'CAT', year: 2025, total_score: 78.4, percentile: 94.2, section_scores: { 'VARC percentile': 96.1, 'DILR scaled score': 21.3, quantitative: 0 } }],
  work_experience: [{ company: 'Example Analytics', designation: 'Research Analyst', start_date: '2022-07', end_date: '2024-12', current: false, months: 29, last_drawn_ctc: 900000 }], total_work_experience_months: 29, last_drawn_ctc: 900000,
  preferences: { programme: 'MBA/PGDM', study_mode: 'Full time', preferred_cities: ['Delhi NCR', 'Gurugram'], max_fees_inr: 2000000, specialization: 'Business Analytics', college_types: ['Government', 'Autonomous PGDM'] },
  profile_photo_document_id: photoId,
  ai_imports: [{ document_id: sourceId, file_name: 'Applicant records.pdf', imported_at: '2026-10-18T10:00:00.000Z', reviewed: false, fields: [{ path: ['full_name'], value: 'Original Applicant' }, { path: ['date_of_birth'], value: '2000-09-17' }, { path: ['exam_scores', 0, 'section_scores', 'VARC percentile'], value: 96.1 }] }],
}
const render = (value = profile) => renderToStaticMarkup(<MemoryRouter><ExtractedProfileReview profile={value} user={user} documents={[{ id: photoId, file_name: 'Profile photo.png' }]} onEdit={() => {}}/></MemoryRouter>)

describe('complete extracted-profile review', () => {
  it('shows saved date of birth without a timezone conversion', () => {
    expect(render()).toContain('2000-09-17')
  })
  it('shows school and board facts previously omitted from the summary', () => {
    expect(render()).toContain('North Senior School')
  })
  it('shows graduation university rather than only degree and marks', () => {
    expect(render()).toContain('Delhi University')
  })
  it('shows the original CGPA denominator as its own labelled field', () => {
    expect(render()).toMatch(/CGPA grading scale[\s\S]*?>10</)
  })
  it('shows the total score even when a percentile also exists', () => {
    expect(render()).toContain('78.4')
  })
  it('shows custom exam section labels and their extracted values', () => {
    expect(render()).toContain('DILR scaled score')
  })
  it('preserves a legitimate zero section score', () => {
    expect(render()).toMatch(/Section score · quantitative[\s\S]*?>0</)
  })
  it('shows each employer and designation instead of only counting roles', () => {
    expect(render()).toContain('Research Analyst')
  })
  it('shows month-only work dates exactly as recorded', () => {
    expect(render()).toContain('2022-07')
  })
  it('shows false current-role status as No rather than treating it as missing', () => {
    expect(render()).toMatch(/Currently employed here[\s\S]*?>No</)
  })
  it('shows institution-type preferences along with the study programme', () => {
    expect(render()).toContain('Government, Autonomous PGDM')
  })
  it('shows the assigned photo filename while keeping storage pointers private', () => {
    expect(render()).toContain('Uploaded photo · Profile photo.png')
  })
  it('preserves guided context on the profile-photo upload link', () => {
    expect(render()).not.toContain('href="/documents"')
  })
  it('does not expose a document UUID as a student-facing profile fact', () => {
    expect(render()).not.toContain(photoId)
  })
  it('identifies original source files for field-level cross-checking', () => {
    expect(render()).toContain('Source: Applicant records.pdf')
  })
  it('marks an unchanged extracted value as document-filled', () => {
    expect(render()).toContain('Document-filled')
  })
  it('shows the AI original separately after a saved manual correction', () => {
    expect(render()).toContain('Originally extracted: Original Applicant')
  })
  it('displays the current corrected value as the profile value', () => {
    expect(render()).toContain('Current Applicant')
  })
  it('does not call manually provided preferences document-filled', () => {
    expect(render()).not.toMatch(/Business Analytics<\/p><div[^>]*>[\s\S]*?Document-filled/)
  })
  it('offers targeted missing-information actions without rendering edit inputs', () => {
    expect(render(createEmptyProfile(user))).not.toContain('<input')
  })
  it('does not require a fresh graduate to create experience rows', () => {
    expect(render({ ...createEmptyProfile(user), total_work_experience_months: 0 })).toContain('Fresh graduates can leave this blank or enter zero total months.')
  })
})
