import { describe, expect, it } from 'vitest'
import { chooseDiscoveryProgramme, collegeWithProgramme, profileForDiscovery, sortDiscoveryColleges } from '../src/lib/admissionsDiscovery.js'
import { matchCollege } from '../src/lib/admissionsMatching.js'
import { createEmptyProfile } from '../src/lib/admissionsProfile.js'
import { DELHI_NCR_COLLEGES } from '../src/data/delhiNcrColleges.js'
import { hasCollegePhoto } from '../src/data/collegeImages.js'

const fit = (recommendationGroup = 'recommended', score = 85, budget = 'within_budget', eligibility = 'meets_known_criteria') => ({ recommendationGroup, score, eligibility, budget: { status: budget }, confidence: { percentage: 80 } })
const card = (id, match = fit()) => ({ id, name: id, city: 'New Delhi', feesInr: 200000, match })
const applicant = { ...createEmptyProfile(), academic_graduation: { percentage: 80 }, exam_scores: [{ exam: 'CAT', percentile: 99 }], preferences: { max_fees_inr: 1000000 } }
const programme = (id, fee) => ({ id, name: id, feesInr: fee, feeVerificationStatus: 'official_current_cycle', minGraduationPercent: 50, acceptedExams: ['CAT'], examCriteria: [{ exam: 'CAT', scoreType: 'percentile', minScore: 70 }] })
const college = { id: 'sample', name: 'Example college', type: 'MBA', city: 'New Delhi', programmes: [programme('expensive', 2000000), programme('affordable', 500000)] }

describe('Programme discovery choices', () => {
  it('chooses a fitting affordable programme rather than blindly taking the first programme', () => {
    expect(chooseDiscoveryProgramme(college, applicant).programme_key).toBe('affordable')
  })
  it('preserves the applicant’s explicit programme despite another programme fitting better', () => {
    expect(chooseDiscoveryProgramme(college, applicant, 'expensive').programme_key).toBe('expensive')
  })
  it('keeps a saved application programme instead of silently changing it', () => {
    expect(chooseDiscoveryProgramme(college, applicant, null, { programme_key: 'expensive' }).programme_key).toBe('expensive')
  })
  it('honours the saved selectedProgrammeId alias on older application snapshots', () => {
    expect(chooseDiscoveryProgramme(college, applicant, null, { selectedProgrammeId: 'expensive' }).programme_key).toBe('expensive')
  })
  it('retains and flags a saved programme removed from the current catalogue', () => {
    const selected = chooseDiscoveryProgramme(college, applicant, null, { programme_key: 'retired', programme: 'Prior MBA', feesInr: 300000 })
    expect([selected.programme_key, selected.programme, selected.programmeUnavailable]).toEqual(['retired', 'Prior MBA', true])
  })
  it('does not mutate the original programme catalogue while choosing', () => {
    const before = JSON.stringify(college)
    chooseDiscoveryProgramme(college, applicant)
    expect(JSON.stringify(college)).toBe(before)
  })
  it('does not inherit another programme’s eligibility, exams, fees, deadlines or benchmarks', () => {
    const first = { ...programme('first', 500000), minClass10Percent: 50, minClass12Percent: 50, minBachelorDurationYears: 3, minWorkExperienceMonths: 24, deadline: { date: '2026-11-01' }, matchingBenchmarks: { experience: { averageMonths: 36 } } }
    const second = { id: 'second', name: 'Another programme' }
    const institution = { ...college, ...first, id: 'institution', name: 'Institution', programmes: [first, second] }
    const selected = collegeWithProgramme(institution, second)
    expect(['minClass10Percent', 'minClass12Percent', 'minBachelorDurationYears', 'minWorkExperienceMonths', 'acceptedExams', 'examCriteria', 'feesInr', 'deadline', 'matchingBenchmarks'].filter(key => Object.hasOwn(selected, key))).toEqual([])
  })
  it('does not graft the representative programme’s requirements onto a retired saved choice', () => {
    const first = { ...programme('first', 500000), minWorkExperienceMonths: 24, deadline: { date: '2026-11-01' } }
    const institution = { ...college, ...first, id: 'institution', name: 'Institution', programmes: [first] }
    const selected = chooseDiscoveryProgramme(institution, applicant, null, { programme_key: 'retired', programme: 'Prior MBA' })
    expect([selected.minWorkExperienceMonths, selected.deadline, selected.feesInr]).toEqual([undefined, undefined, undefined])
  })
  it('keeps MDI business-management requirements scoped to that programme', () => {
    const mdi = DELHI_NCR_COLLEGES.find(item => item.id === 'ncr-mdi-gurgaon')
    const programme = mdi.programmes.find(item => item.sourceRecordId === 'NCR-197')
    const selected = collegeWithProgramme(mdi, programme)
    expect([selected.minClass10Percent, selected.minClass12Percent, selected.minBachelorDurationYears]).toEqual([programme.minClass10Percent, programme.minClass12Percent, programme.minBachelorDurationYears])
  })
  it('keeps the MDI default in the requested full-time family rather than moving to an affordable executive alternative', () => {
    const mdi = DELHI_NCR_COLLEGES.find(item => item.id === 'ncr-mdi-gurgaon')
    const fullTime = { ...applicant, total_work_experience_months: 72, exam_scores: [{ exam: 'CAT', percentile: 95 }], preferences: { study_mode: 'Full-time', target_programme: 'MBA / PGDM', max_fees_inr: 2000000 } }
    expect(chooseDiscoveryProgramme(mdi, fullTime).mode).toMatch(/^Full-time/)
  })
  it('prefers a fitting full-time Gurugram University programme to its executive evening programme', () => {
    const university = DELHI_NCR_COLLEGES.find(item => /Gurugram University/i.test(item.name))
    const fullTime = { ...applicant, total_work_experience_months: 72, exam_scores: [{ exam: 'CAT', percentile: 95 }], preferences: { study_mode: 'Full-time', target_programme: 'MBA / PGDM', max_fees_inr: 2000000 } }
    expect(chooseDiscoveryProgramme(university, fullTime).mode).toMatch(/^Full-time/)
  })
  it('still preserves an explicitly selected executive MDI programme as a clearly classified alternative', () => {
    const mdi = DELHI_NCR_COLLEGES.find(item => item.id === 'ncr-mdi-gurgaon')
    const fullTime = { ...applicant, total_work_experience_months: 72, preferences: { study_mode: 'Full-time', max_fees_inr: 2000000 } }
    const selected = chooseDiscoveryProgramme(mdi, fullTime, 'programme-ncr-197')
    expect([selected.programme_key, matchCollege(fullTime, selected).recommendationGroup]).toEqual(['programme-ncr-197', 'other'])
  })
})

describe('A budget filter also constrains the programme fit', () => {
  it('uses the view cap when no budget was saved', () => {
    expect(profileForDiscovery({ preferences: { max_fees_inr: null } }, '500000').preferences.max_fees_inr).toBe(500000)
  })
  it('retains the stricter saved budget when a larger view cap is selected', () => {
    expect(profileForDiscovery({ preferences: { max_fees_inr: 300000 } }, '500000').preferences.max_fees_inr).toBe(300000)
  })
  it.each([0, '0'])('preserves an explicit zero fee budget despite a larger filter: %s', saved => {
    expect(profileForDiscovery({ preferences: { max_fees_inr: saved } }, '500000').preferences.max_fees_inr).toBe(0)
  })
  it('places a programme with unknown fees under To confirm when a view budget is set', () => {
    const effective = profileForDiscovery({ ...applicant, preferences: { max_fees_inr: null } }, '500000')
    expect(matchCollege(effective, { ...programme('unknown-fees', null), city: 'New Delhi' }).recommendationGroup).toBe('needs_review')
  })
  it('does not save the temporary view cap back into the original profile', () => {
    const profile = { preferences: { study_mode: 'Full-time', max_fees_inr: null } }
    profileForDiscovery(profile, '500000')
    expect(profile.preferences.max_fees_inr).toBeNull()
  })
})

describe('Safe campus photograph ordering', () => {
  it('shows audited campus photography first within the same fit and budget group', () => {
    expect(sortDiscoveryColleges([card('No photo'), card('ncr-fms-delhi')])[0].id).toBe('ncr-fms-delhi')
  })
  it('keeps an over-budget photographed college below an affordable recommendation', () => {
    expect(sortDiscoveryColleges([card('ncr-fms-delhi', fit('other', 99, 'over_budget')), card('Affordable')])[0].id).toBe('Affordable')
  })
  it('keeps unmet eligibility below another college with known eligibility even when it has a photo', () => {
    expect(sortDiscoveryColleges([card('ncr-fms-delhi', fit('needs_review', 99, 'within_budget', 'review_required')), card('Known', fit('needs_review'))])[0].id).toBe('Known')
  })
  it('does not use photography to change an explicit fee sort', () => {
    const expensive = { ...card('ncr-fms-delhi'), feesInr: 500000 }
    expect(sortDiscoveryColleges([expensive, card('Cheaper')], 'fees')[0].id).toBe('Cheaper')
  })
  it('offers ten actual campus photographs first when fit information is not yet available', () => {
    const browse = DELHI_NCR_COLLEGES.map(item => ({ ...item, match: fit('needs_review', null, 'not_set', 'unknown') }))
    expect(sortDiscoveryColleges(browse).slice(0, 10).every(hasCollegePhoto)).toBe(true)
  })
})
