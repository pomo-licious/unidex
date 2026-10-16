import { describe, expect, it } from 'vitest'
import {
  createEmptyProfile, formatInr, getProfileProgress, normalizeAdmissionsProfile,
  validateAdmissionsProfile,
} from '../src/lib/admissionsProfile.js'

const complete = patch => ({
  ...createEmptyProfile(), full_name: 'Test Applicant', email: 'applicant@example.com',
  phone: '+91 98765 43210', current_city: 'Delhi',
  academic_graduation: { degree: 'B.Com', percentage: 72 },
  total_work_experience_months: 0, ...patch,
})

describe('Canonical admissions profile', () => {
  it('uses the signed-in identity as defaults without inventing academics', () => {
    const value = createEmptyProfile({ email: 'applicant@example.com', user_metadata: { name: 'Test Applicant' } })
    expect([value.full_name, value.email, value.academic_graduation.percentage]).toEqual(['Test Applicant', 'applicant@example.com', ''])
  })

  it('fills partial nested sections while preserving a supplied graduation mark', () => {
    expect(normalizeAdmissionsProfile({ academic_graduation: { percentage: 72 } }).academic_graduation)
      .toEqual({ university: '', college: '', degree: '', branch: '', year_of_passing: '', cgpa: '', cgpa_scale: '', percentage: 72 })
  })

  it('keeps zero months as a completed experience answer for fresh graduates', () => {
    expect(getProfileProgress(complete()).sections.find(section => section.key === 'experience').complete).toBe(true)
  })

  it('allows a fresh graduate to submit without salary or an entrance result', () => {
    expect(validateAdmissionsProfile(complete(), { submission: true }).valid).toBe(true)
  })

  it('retains CGPA without silently calculating a percentage', () => {
    expect(normalizeAdmissionsProfile({ academic_graduation: { cgpa: 8.2 } }).academic_graduation.percentage).toBe('')
  })

  it('allows a supplied original CGPA in place of graduation percentage', () => {
    expect(validateAdmissionsProfile(complete({ academic_graduation: { degree: 'B.Com', cgpa: 8.2 } }), { submission: true }).valid).toBe(true)
  })

  it('requires a genuine graduation result before submission', () => {
    expect(validateAdmissionsProfile(complete({ academic_graduation: { degree: 'B.Com', percentage: '   ', cgpa: null } }), { submission: true }).errors)
      .toHaveProperty('academic_graduation.percentage')
  })

  it('rejects a percentile outside its own 0 to 100 scale', () => {
    expect(validateAdmissionsProfile(complete({ exam_scores: [{ exam: 'CAT', percentile: 101 }] })).errors)
      .toHaveProperty('exam_scores.0.percentile')
  })

  it('accepts a GMAT raw score greater than 100 without treating it as a percentile', () => {
    expect(validateAdmissionsProfile(complete({ exam_scores: [{ exam: 'GMAT', total_score: 675 }] })).valid).toBe(true)
  })

  it('requires an exam identity when a numeric result is supplied', () => {
    expect(validateAdmissionsProfile(complete({ exam_scores: [{ percentile: 90 }] })).errors)
      .toHaveProperty('exam_scores.0.exam')
  })

  it('rejects a negative salary while allowing salary to remain absent', () => {
    expect(validateAdmissionsProfile(complete({ last_drawn_ctc: -1 })).errors).toHaveProperty('last_drawn_ctc')
  })

  it('rejects a work period whose end precedes its start', () => {
    expect(validateAdmissionsProfile(complete({ work_experience: [{ company: 'Example', start_date: '2025-01-01', end_date: '2024-12-31' }] })).errors)
      .toHaveProperty('work_experience.0.end_date')
  })

  it('rejects negative role-level experience even if the total is valid', () => {
    expect(validateAdmissionsProfile(complete({ work_experience: [{ company: 'Example', designation: 'Analyst', months: -3 }] })).valid).toBe(false)
  })

  it('rejects negative role-level CTC even if the last drawn CTC is absent', () => {
    expect(validateAdmissionsProfile(complete({ work_experience: [{ company: 'Example', designation: 'Analyst', last_drawn_ctc: -1 }] })).valid).toBe(false)
  })

  it('can calculate progress after normalizing legacy null exam rows', () => {
    expect(() => getProfileProgress(normalizeAdmissionsProfile({ exam_scores: [null] }))).not.toThrow()
  })

  it('can validate after normalizing legacy null experience rows', () => {
    expect(() => validateAdmissionsProfile(normalizeAdmissionsProfile({ work_experience: [null] }))).not.toThrow()
  })

  it('does not format a missing amount as zero rupees', () => {
    expect(formatInr(null)).toBe('Not confirmed')
  })

  it('preserves a deliberately supplied zero amount', () => {
    expect(formatInr(0)).toBe('₹0')
  })
})


describe('Explicit CGPA grading scale', () => {
  it('preserves an explicit original grading scale without converting the value', () => {
    expect(normalizeAdmissionsProfile({ academic_graduation: { cgpa: 3.7, cgpa_scale: 4 } }).academic_graduation.cgpa_scale).toBe(4)
  })
  it('rejects a CGPA that exceeds its explicitly recorded scale', () => {
    expect(validateAdmissionsProfile(complete({ academic_graduation: { degree: 'B.Com', cgpa: 8.5, cgpa_scale: 4 } })).errors).toHaveProperty('academic_graduation.cgpa')
  })
  it('rejects a grading scale outside the supported explicit range', () => {
    expect(validateAdmissionsProfile(complete({ academic_10th: { cgpa: 8.5, cgpa_scale: 0 } })).errors).toHaveProperty('academic_10th.cgpa_scale')
  })
})
