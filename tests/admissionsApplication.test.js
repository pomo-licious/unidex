import { describe, expect, it } from 'vitest'
import { DELHI_NCR_COLLEGES } from '../src/data/delhiNcrColleges.js'
import { answerKey, deadlineFor, programmeForSnapshot, specificFields, validateCollegeAnswers } from '../src/lib/admissionsApplication.js'

const mdi = DELHI_NCR_COLLEGES.find(college => college.id === 'ncr-mdi-gurgaon')
const executive = { ...mdi, programme_key: 'programme-ncr-197' }
const ib = { ...mdi, selectedProgrammeId: 'programme-ncr-196' }
const fixture = (field, programmeId = 'fixture-programme') => ({
  id: 'fixture-college', name: 'Test institution', programme_key: programmeId,
  programmes: [{ id: programmeId, name: 'Test programme', specificFields: [field] }],
})
const sourced = { key: 'preference', label: 'Preference', type: 'select', required: true, options: ['Finance', 'Marketing'], sourceUrl: 'https://example.edu/admissions' }
const answersFor = (college, value) => ({ [answerKey(college)]: { preference: value } })

describe('Selected-programme application helpers', () => {
  it('resolves the programme_key emitted by the college directory', () => {
    expect(programmeForSnapshot(executive).sourceRecordId).toBe('NCR-197')
  })

  it('resolves an explicit programme_id from earlier saved snapshots', () => {
    expect(programmeForSnapshot({ ...mdi, programme_id: 'programme-ncr-196' }).sourceRecordId).toBe('NCR-196')
  })

  it('keeps an embedded selected programme ahead of the default representative', () => {
    const selected = mdi.programmes.find(programme => programme.sourceRecordId === 'NCR-197')
    expect(programmeForSnapshot({ ...mdi, selected_programme: selected }).sourceRecordId).toBe('NCR-197')
  })

  it('uses selectedProgrammeId ahead of an older programme_key', () => {
    expect(programmeForSnapshot({ ...executive, selectedProgrammeId: 'programme-ncr-196' }).sourceRecordId).toBe('NCR-196')
  })

  it('withholds the representative deadline for a selected executive programme', () => {
    expect(deadlineFor(executive).date).toBeNull()
  })

  it('retains the verified deadline for a selected MDI international-business programme', () => {
    expect(deadlineFor(ib).closesAt).toBe('2026-11-28T17:00:00+05:30')
  })

  it('does not fall back to the first programme for an unknown explicit selection', () => {
    expect(deadlineFor({ ...mdi, programme_key: 'removed-programme' }).date).toBeNull()
  })

  it('ignores an unrelated saved top-level deadline for an unknown programme', () => {
    expect(deadlineFor({ id: 'unknown', selectedProgrammeId: 'unknown-programme', deadline: mdi.deadline }).date).toBeNull()
  })

  it('does not trust a saved institution snapshot over current programme evidence', () => {
    const snapshot = { ...executive, programmes: [{ id: 'programme-ncr-197', deadline: mdi.deadline }] }
    expect(deadlineFor(snapshot).date).toBeNull()
  })

  it('namespaces answers by both institution and selected programme', () => {
    expect(answerKey(executive)).toBe('ncr-mdi-gurgaon:programme-ncr-197')
  })

  it('has an explicit namespace for an unconfirmed programme', () => {
    expect(answerKey({ id: 'pending-college' })).toBe('pending-college:unconfirmed')
  })

  it('does not reuse required answers after the selected programme changes', () => {
    const first = fixture(sourced, 'first'), second = fixture(sourced, 'second')
    expect(validateCollegeAnswers([second], answersFor(first, 'Finance'), []).valid).toBe(false)
  })

  it('keeps unsourced fields optional even if a stale snapshot labels them required', () => {
    expect(specificFields(fixture({ ...sourced, sourceUrl: null }), [])[0].required).toBe(false)
  })

  it('does not introduce mandatory questions from an unrelated programme', () => {
    expect(specificFields(executive)).toEqual([])
  })

  it('accepts a sourced required multiselect as an array of listed options', () => {
    const college = fixture({ ...sourced, type: 'multiselect' })
    expect(validateCollegeAnswers([college], answersFor(college, ['Finance', 'Marketing']), []).valid).toBe(true)
  })

  it('rejects an empty required multiselect', () => {
    const college = fixture({ ...sourced, type: 'multiselect' })
    expect(validateCollegeAnswers([college], answersFor(college, []), []).valid).toBe(false)
  })

  it('rejects arbitrary free text for a multiselect requirement', () => {
    const college = fixture({ ...sourced, type: 'multiselect' })
    expect(validateCollegeAnswers([college], answersFor(college, 'Finance'), []).valid).toBe(false)
  })

  it('rejects an invented option in a multiselect answer', () => {
    const college = fixture({ ...sourced, type: 'multiselect' })
    expect(validateCollegeAnswers([college], answersFor(college, ['Invented programme']), []).valid).toBe(false)
  })

  it('rejects an unlisted option in a single-select answer', () => {
    const college = fixture(sourced)
    expect(validateCollegeAnswers([college], answersFor(college, 'Invented programme'), []).valid).toBe(false)
  })

  it('requires an actual boolean confirmation for mandatory checkboxes', () => {
    const college = fixture({ ...sourced, type: 'checkbox' })
    expect(validateCollegeAnswers([college], answersFor(college, 'true'), []).valid).toBe(false)
  })

  it('accepts a true required checkbox', () => {
    const college = fixture({ ...sourced, type: 'checkbox' })
    expect(validateCollegeAnswers([college], answersFor(college, true), []).valid).toBe(true)
  })

  it('does not mistake zero for an unanswered numeric field', () => {
    const college = fixture({ ...sourced, type: 'number' })
    expect(validateCollegeAnswers([college], answersFor(college, 0), []).valid).toBe(true)
  })
})
