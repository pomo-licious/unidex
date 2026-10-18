import { describe, expect, it } from 'vitest'
import { createEmptyProfile, getLastDrawnCtc, getProfileProgress, hasLastDrawnCtc, isAiImportPath, normalizeAdmissionsProfile, validateAdmissionsProfile } from '../src/lib/admissionsProfile'
import { getProfileSectionForPath } from '../src/lib/admissionsProfileSections'

const qualification = patch => ({ qualification: 'CA', title: 'CA Final', institution: 'ICAI', status: 'completed', completion_year: 2024, percentage: 64.5, ...patch })
const rowId = '85fbc30a-a884-4384-b53a-99323943574b'
const complete = patch => ({ ...createEmptyProfile(), full_name: 'Synthetic Applicant', email: 'applicant@example.invalid', phone: '+919876543210', current_city: 'Delhi', academic_graduation: { degree: 'B.Com', percentage: 72 }, ...patch })

describe('professional qualification profile records', () => {
  it('adds empty qualification fields without dropping an existing graduation result', () => {
    const profile = normalizeAdmissionsProfile({ academic_graduation: { degree: 'B.Com', percentage: 72 } })
    expect([profile.professional_qualifications, profile.academic_graduation.percentage]).toEqual([[], 72])
  })
  it('retains a CA certificate with its original result and stable row identity', () => {
    expect(normalizeAdmissionsProfile({ professional_qualifications: [qualification({ _row_id: rowId })] }).professional_qualifications[0]).toMatchObject(qualification({ _row_id: rowId }))
  })
  it('does not invent completed status for a partially extracted qualification', () => {
    expect(normalizeAdmissionsProfile({ professional_qualifications: [{ qualification: 'CA', institution: 'ICAI' }] }).professional_qualifications[0].status).toBe('')
  })
  it('keeps doctorate CGPA in the recorded scale without deriving percentage', () => {
    expect(normalizeAdmissionsProfile({ professional_qualifications: [{ qualification: 'PhD', title: 'PhD in Economics', cgpa: 3.8, cgpa_scale: 4 }] }).professional_qualifications[0]).toMatchObject({ qualification: 'PhD', cgpa: 3.8, cgpa_scale: 4, percentage: '' })
  })
  it('bounds rows and strips unknown nested payloads during safe normalization', () => {
    const rows = normalizeAdmissionsProfile({ professional_qualifications: Array.from({ length: 21 }, () => qualification({ payload: { arbitrary: true } })) }).professional_qualifications
    expect({ count: rows.length, unknown: Object.hasOwn(rows[0], 'payload') }).toEqual({ count: 20, unknown: false })
  })
  it('rejects a new save containing more than twenty qualifications', () => {
    expect(validateAdmissionsProfile({ professional_qualifications: Array.from({ length: 21 }, () => qualification()) }).errors).toHaveProperty('professional_qualifications')
  })
  it('rejects an unsupported qualification enum before normalization could hide it', () => {
    expect(validateAdmissionsProfile({ professional_qualifications: [qualification({ qualification: 'Invented' })] }).errors).toHaveProperty('professional_qualifications.0.qualification')
  })
  it('rejects an object supplied in place of an institution name', () => {
    expect(validateAdmissionsProfile({ professional_qualifications: [qualification({ institution: { text: 'ICAI' } })] }).errors).toHaveProperty('professional_qualifications.0.institution')
  })
  it('rejects a boolean supplied in place of a qualification percentage', () => {
    expect(validateAdmissionsProfile({ professional_qualifications: [qualification({ percentage: true })] }).errors).toHaveProperty('professional_qualifications.0.percentage')
  })
  it('rejects a qualification CGPA above its recorded denominator', () => {
    expect(validateAdmissionsProfile({ professional_qualifications: [qualification({ cgpa: 8.5, cgpa_scale: 4 })] }).errors).toHaveProperty('professional_qualifications.0.cgpa')
  })
  it('allows an expected future completion year for a pursuing qualification', () => {
    expect(validateAdmissionsProfile({ professional_qualifications: [qualification({ status: 'pursuing', completion_year: new Date().getUTCFullYear() + 2 })] }).valid).toBe(true)
  })
  it('rejects a fractional completion year', () => {
    expect(validateAdmissionsProfile({ professional_qualifications: [qualification({ completion_year: 2024.5 })] }).errors).toHaveProperty('professional_qualifications.0.completion_year')
  })
  it('rejects duplicate qualification row identities before evidence can be attached to the wrong record', () => {
    expect(validateAdmissionsProfile({ professional_qualifications: [qualification({ _row_id: rowId }), qualification({ _row_id: rowId })] }).errors).toHaveProperty('professional_qualifications.1._row_id')
  })
  it('routes qualification corrections to the education form', () => {
    expect(getProfileSectionForPath('professional_qualifications.0.percentage')).toBe('academics')
  })
})

describe('defence service records', () => {
  it('leaves service status and current service unanswered for safe document autofill', () => {
    expect([createEmptyProfile().defence_service.status, createEmptyProfile().defence_service.current]).toEqual(['', null])
  })
  it('preserves an explicitly declared no-service answer', () => {
    expect(normalizeAdmissionsProfile({ defence_service: { status: 'none', current: false } }).defence_service).toMatchObject({ status: 'none', current: false })
  })
  it('retains month precision and a multiline leadership summary', () => {
    expect(normalizeAdmissionsProfile({ defence_service: { status: 'veteran', branch: 'Indian Army', start_date: '2009-01', end_date: '2025-06', leadership_summary: 'Led a team.\nManaged training.' } }).defence_service).toMatchObject({ start_date: '2009-01', end_date: '2025-06', leadership_summary: 'Led a team.\nManaged training.' })
  })
  it('rejects impossible service dates', () => {
    expect(validateAdmissionsProfile({ defence_service: { status: 'veteran', start_date: '2023-02-30' } }).errors).toHaveProperty('defence_service.start_date')
  })
  it('rejects a release date before the start day within the same month', () => {
    expect(validateAdmissionsProfile({ defence_service: { status: 'veteran', start_date: '2024-01-10', end_date: '2024-01-01' } }).errors).toHaveProperty('defence_service.end_date')
  })
  it('does not accept an unchecked string as a current-service boolean', () => {
    expect(validateAdmissionsProfile({ defence_service: { status: 'serving', current: 'true' } }).errors).toHaveProperty('defence_service.current')
  })
  it('routes service corrections to the experience form', () => {
    expect(getProfileSectionForPath('defence_service.rank')).toBe('work')
  })
  it('retains supported qualification, service and GMAT edition provenance', () => {
    expect([['professional_qualifications', 19, 'institution'], ['defence_service', 'rank'], ['exam_scores', 0, 'exam_version']].map(isAiImportPath)).toEqual([true, true, true])
  })
  it('rejects qualification evidence outside the bound or targeting row metadata', () => {
    expect([['professional_qualifications', 20, 'institution'], ['professional_qualifications', 0, '_row_id'], ['defence_service', '__proto__']].map(isAiImportPath)).toEqual([false, false, false])
  })
})

describe('experienced applicant annual CTC completion', () => {
  it('returns the canonical annual CTC before considering role-level values', () => {
    expect(getLastDrawnCtc({ last_drawn_ctc: '1200000', work_experience: [{ current: true, last_drawn_ctc: 900000 }] })).toBe(1200000)
  })
  it('preserves an explicit annual CTC of zero as a recorded value', () => {
    expect(getLastDrawnCtc({ last_drawn_ctc: 0 })).toBe(0)
  })
  it('returns the latest role annual CTC without falling back to earlier roles', () => {
    expect(getLastDrawnCtc({ work_experience: [{ end_date: '2023-01', last_drawn_ctc: 400000 }, { current: true, last_drawn_ctc: '900000' }] })).toBe(900000)
  })
  it('returns null for invalid annual CTC values instead of treating them as money', () => {
    expect([true, ' ', -1, Infinity, {}].map(last_drawn_ctc => getLastDrawnCtc({ last_drawn_ctc }))).toEqual([null, null, null, null, null])
  })
  it('allows an AI-filled draft to save before salary is added', () => {
    expect(validateAdmissionsProfile(complete({ total_work_experience_months: 36 })).valid).toBe(true)
  })
  it('flags missing annual CTC only at final submission validation', () => {
    expect(validateAdmissionsProfile(complete({ total_work_experience_months: 36 }), { submission: true }).errors).toHaveProperty('last_drawn_ctc')
  })
  it('allows a fresh graduate to complete without salary', () => {
    expect(validateAdmissionsProfile(complete({ total_work_experience_months: 0 }), { submission: true }).valid).toBe(true)
  })
  it('considers the annual CTC on the latest dated role', () => {
    expect(hasLastDrawnCtc({ work_experience: [{ company: 'Earlier', end_date: '2022-01', last_drawn_ctc: 400000 }, { company: 'Latest', end_date: '2025-01', last_drawn_ctc: 900000 }] })).toBe(true)
  })
  it('does not use an earlier role salary when the latest role salary is missing', () => {
    expect(hasLastDrawnCtc({ work_experience: [{ company: 'Earlier', end_date: '2022-01', last_drawn_ctc: 400000 }, { company: 'Latest', current: true, start_date: '2024-01' }] })).toBe(false)
  })
  it('marks experienced work details incomplete until annual CTC is present', () => {
    expect(getProfileProgress(complete({ total_work_experience_months: 36 })).sections.find(section => section.key === 'experience').complete).toBe(false)
  })
})
