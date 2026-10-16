import { describe, expect, it } from 'vitest'
import { applyAdmissionsDocumentReview, buildAdmissionsDocumentReview, retargetAdmissionsDocumentReview, updateAdmissionsDocumentField } from '../src/lib/admissionsDocumentReview'

const byKey = (model, key) => model.fields.find(field => field.key === key)
const select = (model, key) => ({ ...model, fields: model.fields.map(field => field.key === key ? updateAdmissionsDocumentField(field, { include: true }) : field) })

describe('document autofill and variances', () => {
  it('selects an extracted zero for an empty field', () => {
    expect(byKey(buildAdmissionsDocumentReview({ total_work_experience_months: 0 }, {}), 'total_work_experience_months').include).toBe(true)
  })
  it('preserves a saved zero when the document gives a different amount', () => {
    const profile = { last_drawn_ctc: 0 }, model = buildAdmissionsDocumentReview({ last_drawn_ctc: 1000000 }, profile)
    expect(applyAdmissionsDocumentReview(profile, model).profile.last_drawn_ctc).toBe(0)
  })
  it('treats numeric formatting as a match within the same field', () => {
    expect(byKey(buildAdmissionsDocumentReview({ academic_10th: { percentage: '80.00' } }, { academic_10th: { percentage: 80 } }), 'percentage').status).toBe('same')
  })
  it('treats harmless case and repeated whitespace as a name match', () => {
    expect(byKey(buildAdmissionsDocumentReview({ full_name: '  STUDENT   NAME ' }, { full_name: 'Student Name' }), 'full_name').status).toBe('same')
  })
  it('treats whitespace-only current values as empty', () => {
    expect(byKey(buildAdmissionsDocumentReview({ current_city: 'Delhi' }, { current_city: '  ' }), 'current_city').status).toBe('new')
  })
  it('does not preselect a real variance', () => {
    expect(byKey(buildAdmissionsDocumentReview({ academic_10th: { percentage: 85 } }, { academic_10th: { percentage: 80 } }), 'percentage').include).toBe(false)
  })
  it('applies a variance only after its replacement is selected', () => {
    const profile = { academic_10th: { percentage: 80 } }, model = select(buildAdmissionsDocumentReview({ academic_10th: { percentage: 85 } }, profile), 'percentage')
    expect(applyAdmissionsDocumentReview(profile, model).profile.academic_10th.percentage).toBe(85)
  })
  it('reclassifies an edited suggestion matching the saved value', () => {
    const field = byKey(buildAdmissionsDocumentReview({ current_city: 'Mumbai' }, { current_city: 'Delhi' }), 'current_city')
    expect(updateAdmissionsDocumentField(field, { value: ' DELHI ' }).status).toBe('same')
  })
  it('can record an all-matching review without profile changes', () => {
    const profile = { full_name: 'Student', total_work_experience_months: 0 }, model = buildAdmissionsDocumentReview({ full_name: 'Student', total_work_experience_months: 0 }, profile)
    expect(applyAdmissionsDocumentReview(profile, model).appliedCount).toBe(0)
  })
  it('preserves a matching false boolean without converting it to true', () => {
    const profile = { work_experience: [{ id: 'role-one', company: 'Company', current: false }] }, model = buildAdmissionsDocumentReview({ work_experience: [{ company: 'Company', current: false }] }, profile)
    expect(applyAdmissionsDocumentReview(profile, model).reviewedData.work_experience[0].current).toBe(false)
  })
  it('never compares raw exam score with a saved percentile', () => {
    const profile = { exam_scores: [{ exam: 'CAT', year: 2026, percentile: 90 }] }, model = buildAdmissionsDocumentReview({ exam_scores: [{ exam: 'CAT', year: 2026, total_score: 90 }] }, profile)
    expect(byKey(model, 'total_score').status).toBe('new')
  })
  it('flags differing CGPA scales without converting their values', () => {
    const profile = { academic_graduation: { cgpa: 8, cgpa_scale: 10 } }, model = buildAdmissionsDocumentReview({ academic_graduation: { cgpa: 8, cgpa_scale: 20 } }, profile)
    expect(byKey(model, 'cgpa').status).toBe('variance')
  })
  it('keeps month-only work dates at their original precision', () => {
    const model = buildAdmissionsDocumentReview({ work_experience: [{ company: 'Company', start_date: '2024-01', end_date: '2025-06' }] }, {})
    expect(applyAdmissionsDocumentReview({}, model).profile.work_experience[0].start_date).toBe('2024-01')
  })
  it('classifies an impossible percentage as invalid before autofill', () => {
    expect(byKey(buildAdmissionsDocumentReview({ academic_10th: { percentage: 150 } }, {}), 'percentage').status).toBe('invalid')
  })
})

describe('record identity and stale-review protection', () => {
  it('requires choosing between several possible exam records', () => {
    const profile = { exam_scores: [{ exam: 'CAT', year: 2025 }, { exam: 'CAT', year: 2026 }] }
    expect(buildAdmissionsDocumentReview({ exam_scores: [{ exam: 'CAT', percentile: 92 }] }, profile).records[0].choice).toBe('')
  })
  it('applies exam fields to the explicitly chosen record', () => {
    const profile = { exam_scores: [{ exam: 'CAT', year: 2025 }, { exam: 'CAT', year: 2026 }] }
    const initial = buildAdmissionsDocumentReview({ exam_scores: [{ exam: 'CAT', percentile: 92 }] }, profile)
    const model = retargetAdmissionsDocumentReview(initial, initial.records[0].id, 'existing:1', profile)
    expect(applyAdmissionsDocumentReview(profile, model).profile.exam_scores[1].percentile).toBe(92)
  })
  it('combines exact duplicate extracted exam rows', () => {
    const row = { exam: 'CAT', year: 2026, percentile: 92 }, model = buildAdmissionsDocumentReview({ exam_scores: [row, { ...row }] }, {})
    expect(applyAdmissionsDocumentReview({}, model).profile.exam_scores.length).toBe(1)
  })
  it('flags contradictory duplicate identities instead of choosing the first', () => {
    const model = buildAdmissionsDocumentReview({ exam_scores: [{ exam: 'CAT', year: 2026, percentile: 90 }, { exam: 'CAT', year: 2026, percentile: 92 }] }, {})
    expect(model.records.every(row => row.choice === '')).toBe(true)
  })
  it('allows ambiguous records to be excluded while marking a review complete', () => {
    const profile = { exam_scores: [{ exam: 'CAT', year: 2025 }, { exam: 'CAT', year: 2026 }] }, model = buildAdmissionsDocumentReview({ exam_scores: [{ exam: 'CAT', percentile: 92 }] }, profile)
    expect(applyAdmissionsDocumentReview(profile, model).profile).toEqual(profile)
  })
  it('rejects a value populated differently after the review opened', () => {
    const model = buildAdmissionsDocumentReview({ current_city: 'Delhi' }, { current_city: '' })
    expect(() => applyAdmissionsDocumentReview({ current_city: 'Mumbai' }, model)).toThrow('changed after this review opened')
  })
  it('re-resolves reordered work records by stable ID', () => {
    const one = { id: 'one', company: 'Company A', designation: 'Analyst' }, two = { id: 'two', company: 'Company B', designation: 'Manager' }
    const model = buildAdmissionsDocumentReview({ work_experience: [{ company: 'Company A', designation: 'Analyst', months: 12 }] }, { work_experience: [one, two] })
    expect(applyAdmissionsDocumentReview({ work_experience: [two, one] }, model).profile.work_experience[1].months).toBe(12)
  })
  it('re-resolves exam targets after array reordering', () => {
    const first = { exam: 'CAT', year: 2025 }, second = { exam: 'CAT', year: 2026 }
    const model = buildAdmissionsDocumentReview({ exam_scores: [{ exam: 'CAT', year: 2026, percentile: 92 }] }, { exam_scores: [first, second] })
    expect(applyAdmissionsDocumentReview({ exam_scores: [second, first] }, model).profile.exam_scores[0].percentile).toBe(92)
  })
  it('rejects a new row if a matching record was added meanwhile', () => {
    const model = buildAdmissionsDocumentReview({ exam_scores: [{ exam: 'CAT', year: 2026, percentile: 92 }] }, {})
    expect(() => applyAdmissionsDocumentReview({ exam_scores: [{ exam: 'CAT', year: 2026, percentile: 90 }] }, model)).toThrow('matching record was added')
  })
  it('does not mutate the supplied profile during application', () => {
    const profile = { current_city: '' }, model = buildAdmissionsDocumentReview({ current_city: 'Delhi' }, profile)
    applyAdmissionsDocumentReview(profile, model)
    expect(profile.current_city).toBe('')
  })
  it('does not create prototype fields from extracted section names', () => {
    const data = JSON.parse('{"exam_scores":[{"exam":"CAT","year":2026,"section_scores":{"__proto__":9,"constructor":8,"verbal":7}}]}')
    expect(buildAdmissionsDocumentReview(data, {}).fields.some(field => ['__proto__', 'constructor'].includes(field.key))).toBe(false)
  })
})

describe('coherent CGPA value and grading scale review', () => {
  it('withholds a new scale that belongs to a conflicting extracted CGPA', () => {
    const model = buildAdmissionsDocumentReview({ academic_graduation: { cgpa: 8.5, cgpa_scale: 10 } }, { academic_graduation: { cgpa: 3.7 } })
    expect(byKey(model, 'cgpa_scale').include).toBe(false)
  })
  it('does not attach an extracted scale to the old different CGPA', () => {
    const profile = { academic_graduation: { cgpa: 3.7 } }
    const model = select(buildAdmissionsDocumentReview({ academic_graduation: { cgpa: 8.5, cgpa_scale: 10 } }, profile), 'cgpa_scale')
    expect(() => applyAdmissionsDocumentReview(profile, model)).toThrow('do not attach this scale')
  })
  it('does not keep the old denominator when selecting a new CGPA', () => {
    const profile = { academic_graduation: { cgpa: 3.7, cgpa_scale: 4 } }
    const model = select(buildAdmissionsDocumentReview({ academic_graduation: { cgpa: 8.5, cgpa_scale: 10 } }, profile), 'cgpa')
    expect(() => applyAdmissionsDocumentReview(profile, model)).toThrow('grading scale together')
  })
  it('requires explicit paired review when only the denominator differs', () => {
    const profile = { academic_graduation: { cgpa: 3.7, cgpa_scale: 4 } }
    const model = select(buildAdmissionsDocumentReview({ academic_graduation: { cgpa: 3.7, cgpa_scale: 10 } }, profile), 'cgpa_scale')
    expect(() => applyAdmissionsDocumentReview(profile, model)).toThrow('denominator requires explicitly approving')
  })
  it('applies an explicitly approved coherent CGPA pair without conversion', () => {
    const profile = { academic_graduation: { cgpa: 3.7, cgpa_scale: 4 } }
    const model = select(select(buildAdmissionsDocumentReview({ academic_graduation: { cgpa: 8.5, cgpa_scale: 10 } }, profile), 'cgpa'), 'cgpa_scale')
    expect(applyAdmissionsDocumentReview(profile, model).profile.academic_graduation).toEqual({ cgpa: 8.5, cgpa_scale: 10 })
  })
  it('fills both parts of a new CGPA pair together', () => {
    const model = buildAdmissionsDocumentReview({ academic_graduation: { cgpa: 8.5, cgpa_scale: 10 } }, {})
    expect(applyAdmissionsDocumentReview({}, model).profile.academic_graduation).toEqual({ cgpa: 8.5, cgpa_scale: 10 })
  })
})


it('combines duplicate exam suggestions after comparable numeric and text formatting', () => {
  const model = buildAdmissionsDocumentReview({ exam_scores: [{ exam: ' CAT ', year: '2026', percentile: '92.00' }, { exam: 'cat', year: 2026, percentile: 92 }] }, {})
  expect(model.records.length).toBe(1)
})


describe('ambiguous partial source records and stable dropdown targets', () => {
  it('withholds overlapping dated and undated exam suggestions', () => {
    const model = buildAdmissionsDocumentReview({ exam_scores: [{ exam: 'CAT', percentile: 90 }, { exam: 'CAT', year: 2026, percentile: 92 }] }, {})
    expect(model.records.every(row => row.choice === '')).toBe(true)
  })
  it('withholds a company-only row overlapping a fully described job', () => {
    const model = buildAdmissionsDocumentReview({ work_experience: [{ company: 'Company' }, { company: 'Company', designation: 'Analyst', start_date: '2024-01', months: 12 }] }, {})
    expect(model.records.every(row => row.choice === '')).toBe(true)
  })
  it('resolves the displayed dropdown option by its record snapshot after reordering', () => {
    const first = { exam: 'CAT', year: 2025 }, second = { exam: 'CAT', year: 2026 }
    const initial = buildAdmissionsDocumentReview({ exam_scores: [{ exam: 'CAT', percentile: 92 }] }, { exam_scores: [first, second] })
    const profile = { exam_scores: [second, first] }
    const model = retargetAdmissionsDocumentReview(initial, initial.records[0].id, 'existing:1', profile)
    expect(applyAdmissionsDocumentReview(profile, model).profile.exam_scores[0].percentile).toBe(92)
  })
  it('rejects a new record choice if a matching record appears after that explicit choice', () => {
    const initial = buildAdmissionsDocumentReview({ exam_scores: [{ exam: 'CAT', year: 2026, percentile: 92 }] }, {})
    const model = retargetAdmissionsDocumentReview(initial, initial.records[0].id, 'new', {})
    expect(() => applyAdmissionsDocumentReview({ exam_scores: [{ exam: 'CAT', year: 2026 }] }, model)).toThrow('matching record was added')
  })
})

it('autofills an explicit percentage while leaving an unapproved conflicting CGPA pair unchanged', () => {
  const profile = { academic_graduation: { cgpa: 3.7, cgpa_scale: 4 } }
  const model = buildAdmissionsDocumentReview({ academic_graduation: { percentage: 85, cgpa: 8.5, cgpa_scale: 10 } }, profile)
  expect(applyAdmissionsDocumentReview(profile, model).profile.academic_graduation).toEqual({ percentage: 85, cgpa: 3.7, cgpa_scale: 4 })
})
