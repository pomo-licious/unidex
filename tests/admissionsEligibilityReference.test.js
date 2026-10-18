import { describe, expect, it } from 'vitest'
import { DELHI_NCR_COLLEGES } from '../src/data/delhiNcrColleges.js'
import { getGraduationEligibilityReference } from '../src/lib/admissionsEligibilityReference.js'
import { matchCollege } from '../src/lib/admissionsMatching.js'

const source = 'https://example.edu/admissions/eligibility'
const record = patch => ({ id: 'programme-test', minGraduationPercent: null, eligibility: 'Recognised bachelor’s degree with at least 50%.', eligibilitySourceUrl: source, eligibilityVerificationStatus: 'research_import_requires_cycle_check', ...patch })
const programme = id => DELHI_NCR_COLLEGES.flatMap(college => college.programmes).find(item => item.id === `programme-${id.toLowerCase()}`)

describe('Imported bachelor eligibility references', () => {
  it.each(['NCR-013', 'NCR-014', 'NCR-015', 'NCR-016', 'NCR-017', 'NCR-018', 'NCR-019', 'NCR-024'])('uses the explicit bachelor minimum already in the %s workbook record', id => {
    expect(getGraduationEligibilityReference(programme(id))).toMatchObject({ value: 50, source: 'imported_eligibility', sourceUrl: programme(id).eligibilitySourceUrl, verificationStatus: programme(id).eligibilityVerificationStatus })
  })

  it('retains the exact programme and source excerpt without claiming fresh verification', () => {
    expect(getGraduationEligibilityReference(programme('NCR-014'))).toMatchObject({ programmeId: 'programme-ncr-014', excerpt: 'bachelor’s degree with ≥50%', caveat: expect.stringContaining('not a newly verified rule') })
  })

  it('never overwrites an existing structured rule with a prose value', () => {
    expect(getGraduationEligibilityReference(record({ minGraduationPercent: 60 }))).toMatchObject({ value: 60, source: 'structured' })
  })

  it('does not hide an invalid structured rule by deriving a different value', () => {
    expect(getGraduationEligibilityReference(record({ minGraduationPercent: 150 }))).toBeNull()
  })

  it.each([
    'Bachelor’s degree with 50%.',
    'Recognised bachelor’s degree required.',
    'Bachelor’s degree with at least 50% (45% for SC/ST).',
    'Bachelor’s degree with at least 50%; reserved category relaxation applies.',
    'Bachelor’s degree with at least 50%, or CA/CS final qualification.',
    'Bachelor’s degree with at least 50%, or Chartered Accountant final examination.',
    'MBBS/BDS at least 45%, or health-science master degree at least 55%.',
    'Bachelor’s degree with minimum 50% or 6.0 CGPA.',
    'Bachelor’s degree required, Class XII minimum 50%.',
    'Bachelor’s degree with expected minimum 50%.',
    'Bachelor’s degree with at least 50%; interview threshold 70%.',
    'Bachelor’s degree and minimum 50% in the entrance exam.',
  ])('leaves an ambiguous or non-explicit rule unstructured: %s', eligibility => {
    expect(getGraduationEligibilityReference(record({ eligibility }))).toBeNull()
  })

  it.each([null, '', 'javascript:alert(1)', 'not-a-source'])('requires a valid existing eligibility source URL: %s', eligibilitySourceUrl => {
    expect(getGraduationEligibilityReference(record({ eligibilitySourceUrl, sourceUrls: [source] }))).toBeNull()
  })

  it('uses the selected programme text rather than another programme’s representative rule', () => {
    const selected = record({ id: 'programme-selected', eligibility: 'Bachelor’s degree with at least 60%.' })
    const institution = { ...record(), id: 'college-test', programmes: [record(), selected], programme_key: selected.id }
    expect(getGraduationEligibilityReference(institution)).toMatchObject({ value: 60, programmeId: selected.id })
  })

  it('does not borrow a representative rule for an unknown selected programme', () => {
    expect(getGraduationEligibilityReference({ ...record(), programme_key: 'programme-absent', programmes: [record()] })).toBeNull()
  })

  it('leaves a malformed programme collection unknown rather than borrowing a representative rule', () => {
    expect(getGraduationEligibilityReference({ ...record(), programme_key: 'programme-absent', programmes: {} })).toBeNull()
  })

  it('does not derive a rule for a saved programme awaiting availability confirmation', () => {
    expect(getGraduationEligibilityReference({ ...record(), programmeUnavailable: true })).toBeNull()
  })

  it('does not mutate source programme records', () => {
    const input = record()
    const before = JSON.stringify(input)
    getGraduationEligibilityReference(input)
    expect(JSON.stringify(input)).toBe(before)
  })

  it('uses the same imported reference in academic scoring and eligibility review', () => {
    const candidate = { academic_graduation: { percentage: 40 }, preferences: {} }
    const match = matchCollege(candidate, record())
    expect([match.reasons.find(item => item.key === 'academics').status, match.eligibility, match.recommendationGroup]).toEqual(['review', 'review_required', 'other'])
  })

  it('explains a newly assessable academic factor using its imported provenance', () => {
    const match = matchCollege({ academic_graduation: { percentage: 80 }, preferences: {} }, record())
    expect(match.reasons.find(item => item.key === 'academics')).toMatchObject({ assessed: true, sourceUrl: source, referenceSource: 'imported_eligibility', verificationStatus: 'research_import_requires_cycle_check', detail: expect.stringContaining('not a newly verified rule') })
  })

  it('keeps the academic factor unknown for CGPA without an explicit equivalent percentage', () => {
    expect(matchCollege({ academic_graduation: { cgpa: 8 }, preferences: {} }, record()).reasons.find(item => item.key === 'academics').assessed).toBe(false)
  })
})
