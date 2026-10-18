import { describe, expect, it } from 'vitest'
import { validateAdmissionsApplicationProfile } from '../src/lib/admissionsApplication'
import { createEmptyProfile, validateAdmissionsProfile } from '../src/lib/admissionsProfile'
import { DELHI_NCR_COLLEGES } from '../src/data/delhiNcrColleges'

const candidate = patch => ({ ...createEmptyProfile(), full_name: 'Synthetic Applicant', email: 'synthetic@example.invalid', phone: '+91 98765 43210', current_city: 'Delhi', total_work_experience_months: 0, professional_qualifications: [{ qualification: 'CA', status: 'completed' }], ...patch })
const programme = patch => ({ id: 'current-mba', acceptedProfessionalQualifications: ['CA', 'CS', 'CMA'], professionalQualificationAlternative: true, qualificationEligibilitySourceUrl: 'https://www.ipu.ac.in/adm2026/adm2026br/br280126pg.pdf', qualificationEligibilityVerificationStatus: 'verified_current_cycle', ...patch })
const catalogue = [{ id: 'current-college', programmes: [programme(), programme({ id: 'bachelors-only', professionalQualificationAlternative: false })] }]
const selected = id => ({ id: 'current-college', selectedProgrammeId: id })
const validate = (profile = candidate(), colleges = [selected('current-mba')], source = catalogue) => validateAdmissionsApplicationProfile(profile, colleges, source)

describe('programme-aware application graduation requirements', () => {
  it.each(['CA', 'CS', 'CMA'])('permits completed %s without a bachelor only for an explicitly current sourced alternative route', qualification => {
    expect(validate(candidate({ professional_qualifications: [{ qualification, status: 'completed' }] })).valid).toBe(true)
  })
  it('keeps bachelor details required when any selected programme needs them', () => {
    expect(validate(candidate(), [selected('current-mba'), selected('bachelors-only')]).errors).toHaveProperty('academic_graduation.degree')
  })
  it.each(['unknown-programme', 'retired-programme'])('does not use a stale snapshot to waive graduation for %s', selectedProgrammeId => {
    const forged = { id: 'current-college', selectedProgrammeId, selected_programme: programme({ id: selectedProgrammeId }), ...programme({ id: 'current-college' }) }
    expect(validate(candidate(), [forged]).errors).toHaveProperty('academic_graduation.degree')
  })
  it('does not waive graduation for an unknown institution or implicit representative programme', () => {
    expect(validate(candidate(), [{ id: 'unknown-college', selectedProgrammeId: 'current-mba', programmes: [programme()] }]).valid).toBe(false)
    expect(validate(candidate(), [{ id: 'current-college', representativeProgrammeId: 'current-mba' }]).valid).toBe(false)
  })
  it('does not treat pursuing or unrecorded qualifications as completed', () => {
    expect(validate(candidate({ professional_qualifications: [{ qualification: 'CA', status: 'pursuing' }] })).valid).toBe(false)
    expect(validate(candidate({ professional_qualifications: [] })).valid).toBe(false)
  })
  it('does not accept historical or unsourced qualification-route metadata', () => {
    for (const patch of [{ qualificationEligibilityVerificationStatus: 'official_previous_cycle_requires_confirmation' }, { qualificationEligibilitySourceUrl: null }, { acceptedProfessionalQualifications: ['PhD'] }]) {
      expect(validate(candidate(), [selected('current-mba')], [{ id: 'current-college', programmes: [programme(patch)] }]).valid).toBe(false)
    }
  })
  it('retains every other profile requirement and validates supplied academic values', () => {
    expect(validate(candidate({ phone: '' })).errors).toHaveProperty('phone')
    expect(validate(candidate({ academic_graduation: { percentage: 101 } })).errors).toHaveProperty('academic_graduation.percentage')
    expect(validate(candidate({ professional_qualifications: [{ qualification: 'CA', status: 'completed', percentage: -1 }] })).errors).toHaveProperty('professional_qualifications.0.percentage')
  })
  it('retains general submission and draft behavior without programme context', () => {
    expect(validateAdmissionsProfile(candidate(), { submission: true }).errors).toHaveProperty('academic_graduation.degree')
    expect(validateAdmissionsProfile(candidate()).valid).toBe(true)
    expect(validate(candidate(), []).valid).toBe(false)
  })
  it('does not promote the current historical MERI route into a verified bachelor waiver', () => {
    const college = DELHI_NCR_COLLEGES.find(item => item.programmes?.some(programme => programme.professionalQualificationAlternative))
    expect(college).toBeTruthy()
    const route = college.programmes.find(programme => programme.professionalQualificationAlternative)
    expect(validateAdmissionsApplicationProfile(candidate(), [{ id: college.id, selectedProgrammeId: route.id }]).errors).toHaveProperty('academic_graduation.degree')
  })
})
