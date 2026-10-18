import { describe, expect, it } from 'vitest'
import { sanitizeLocalAdmissionsExtraction } from '../src/lib/admissionsLocalExtraction'

describe('canonical local OCR suggestions', () => {
  it('preserves a labeled Indian international mobile while dropping unlabelled identity numbers', () => {
    expect(sanitizeLocalAdmissionsExtraction({ phone: '+91 98765 43210' }, 'resume')).toEqual({ phone: '+91 98765 43210' })
    expect(sanitizeLocalAdmissionsExtraction({ phone: '1234 5678 9012' }, 'resume')).toEqual({})
    expect(sanitizeLocalAdmissionsExtraction({ phone: '123456789012' }, 'resume')).toEqual({})
  })
  it('never accepts raw text, identity fields, attachments or unknown nested keys', () => {
    const result = sanitizeLocalAdmissionsExtraction({ raw_text: 'private', full_name: 'Student', passport_number: 'A1234567', academic_10th: { school: 'School', percentage: 80, roll_number: '123' }, exam_scores: [{ exam: 'CAT', year: 2026, percentile: 95, application_number: '123', section_scores: { QA: 34, __proto__: 999 } }] }, 'resume')
    expect(result).toEqual({ full_name: 'Student', academic_10th: { school: 'School', percentage: 80 }, exam_scores: [{ exam: 'CAT', year: 2026, percentile: 95, section_scores: { QA: 34 } }] })
  })
  it('ignores prototype-derived canonical fields', () => {
    expect(sanitizeLocalAdmissionsExtraction(Object.create({ full_name: 'Inherited' }), 'resume')).toEqual({})
    expect(sanitizeLocalAdmissionsExtraction({ academic_10th: Object.assign(Object.create({ school: 'Inherited' }), { percentage: 88 }) }, 'academic_10th')).toEqual({ academic_10th: { percentage: 88 } })
  })
  it('rejects non-finite marks and incoherent CGPA denominators without losing independent facts', () => {
    expect(sanitizeLocalAdmissionsExtraction({ academic_graduation: { cgpa: 8.9, cgpa_scale: 4, percentage: 88, year_of_passing: 2025 }, exam_scores: [{ exam: 'CAT', total_score: Infinity, percentile: 110 }] }, 'graduation')).toEqual({ academic_graduation: { percentage: 88, year_of_passing: 2025 } })
  })
  it('preserves a stated CGPA scale without conversion', () => {
    expect(sanitizeLocalAdmissionsExtraction({ academic_graduation: { cgpa: 3.7, cgpa_scale: 4 } }, 'graduation')).toEqual({ academic_graduation: { cgpa: 3.7, cgpa_scale: 4 } })
  })
  it('rejects impossible or future dates', () => {
    expect(sanitizeLocalAdmissionsExtraction({ date_of_birth: '2000-02-31' }, 'passport')).toEqual({})
    expect(sanitizeLocalAdmissionsExtraction({ date_of_birth: '2999-01-01' }, 'passport')).toEqual({})
  })
  it('identity proofs only contribute common facts, with no digit-bearing names or cities', () => {
    expect(sanitizeLocalAdmissionsExtraction({ full_name: 'Student', current_city: 'Delhi 123456789012', nationality: 'Indian', date_of_birth: '2000-01-02', email: 'person@example.test', phone: '+919876543210', last_drawn_ctc: 1000000 }, 'pan_card')).toEqual({ full_name: 'Student', nationality: 'Indian', date_of_birth: '2000-01-02' })
  })
})
