import { describe, expect, it } from 'vitest'
import { createEmptyProfile } from '../src/lib/admissionsProfile.js'
import { matchCollege, rankColleges } from '../src/lib/admissionsMatching.js'
import { DELHI_NCR_COLLEGES } from '../src/data/delhiNcrColleges.js'

const collegeById = id => DELHI_NCR_COLLEGES.find(college => college.id === id)
const reason = (match, key) => match.reasons.find(item => item.key === key)
const profile = patch => ({ ...createEmptyProfile(), ...patch })
const jindal = collegeById('ncr-jindal-global-business-school')
const mbi = collegeById('ncr-mdi-gurgaon')

describe('Admissions matching with sourced criteria', () => {
  it('withholds academic match scores on a new account with only default preferences', () => {
    expect(matchCollege(createEmptyProfile(), mbi).score).toBeNull()
  })

  it('does not treat an absent graduation percentage as zero', () => {
    expect(reason(matchCollege(profile({ academic_graduation: { percentage: null } }), mbi), 'academics').status).toBe('unknown')
  })

  it('does not treat a whitespace-only graduation value as zero', () => {
    expect(reason(matchCollege(profile({ academic_graduation: { percentage: '   ' } }), mbi), 'academics').status).toBe('unknown')
  })

  it('preserves a real zero percentage as a result requiring review', () => {
    expect(reason(matchCollege(profile({ academic_graduation: { percentage: 0 } }), mbi), 'academics').status).toBe('review')
  })

  it('does not turn CGPA into a guessed graduation percentage', () => {
    expect(reason(matchCollege(profile({ academic_graduation: { cgpa: 8.9 } }), mbi), 'academics').status).toBe('unknown')
  })

  it('compares a CAT percentile with a sourced CAT percentile minimum', () => {
    expect(reason(matchCollege(profile({ exam_scores: [{ exam: 'CAT', percentile: 60 }] }), jindal), 'exam').status).toBe('met')
  })

  it('does not compare a CAT raw score with a percentile minimum', () => {
    expect(reason(matchCollege(profile({ exam_scores: [{ exam: 'CAT', total_score: 80 }] }), jindal), 'exam').assessed).toBe(false)
  })

  it('compares a raw GMAT score with a sourced raw GMAT minimum', () => {
    expect(reason(matchCollege(profile({ exam_scores: [{ exam: 'GMAT', total_score: 500 }] }), jindal), 'exam').status).toBe('met')
  })

  it('does not compare a GMAT percentile with a raw GMAT minimum', () => {
    expect(reason(matchCollege(profile({ exam_scores: [{ exam: 'GMAT', percentile: 99 }] }), jindal), 'exam').assessed).toBe(false)
  })

  it('excludes a blank exam percentile rather than failing it as a zero result', () => {
    expect(reason(matchCollege(profile({ exam_scores: [{ exam: 'CAT', percentile: ' ' }] }), jindal), 'exam').assessed).toBe(false)
  })

  it('treats alternative accepted exams as alternative qualification paths', () => {
    expect(reason(matchCollege(profile({ exam_scores: [{ exam: 'CAT', percentile: 40 }, { exam: 'GRE', total_score: 310 }] }), jindal), 'exam').status).toBe('met')
  })

  it('does not award exam points solely for naming a listed exam', () => {
    expect(reason(matchCollege(profile({ exam_scores: [{ exam: 'CAT', percentile: 99 }] }), mbi), 'exam').assessed).toBe(false)
  })

  it('never introduces an official cutoff from an inherited expected band', () => {
    const college = { ...mbi, examCutoffLabel: 'Expected 95+ percentile' }
    expect(reason(matchCollege(profile({ exam_scores: [{ exam: 'CAT', percentile: 99 }] }), college), 'exam').assessed).toBe(false)
  })

  it('keeps compensation neutral across otherwise identical applicant profiles', () => {
    const base = profile({ academic_graduation: { percentage: 75 }, exam_scores: [{ exam: 'CAT', percentile: 75 }] })
    expect(matchCollege({ ...base, last_drawn_ctc: 0 }, jindal)).toEqual(matchCollege({ ...base, last_drawn_ctc: 50000000 }, jindal))
  })

  it('does not infer college fees from an unverified published estimate', () => {
    const college = { ...mbi, feesInr: null, feesLabel: '₹5 lakh approximately' }
    expect(reason(matchCollege(profile({ preferences: { max_fees_inr: 1000000 } }), college), 'budget').assessed).toBe(false)
  })

  it('shows only assessed framework coverage when criteria are missing', () => {
    expect(matchCollege(profile({ academic_graduation: { percentage: 75 }, preferences: {} }), { ...mbi, mode: null }).confidence.percentage).toBe(30)
  })

  it('withholds scores for an institution needing identity verification', () => {
    const college = { ...jindal, dataStatus: 'identity_verification_required' }
    expect(matchCollege(profile({ academic_graduation: { percentage: 99 }, exam_scores: [{ exam: 'CAT', percentile: 99 }] }), college).score).toBeNull()
  })

  it('does not mutate applicants or college data during ranking', () => {
    const candidate = profile({ academic_graduation: { percentage: 75 } })
    const list = [mbi, jindal]
    const before = JSON.stringify({ candidate, list })
    rankColleges(candidate, list)
    expect(JSON.stringify({ candidate, list })).toBe(before)
  })

  it('does not rank a withheld institutional score above a comparable assessed match', () => {
    const list = [mbi, { ...jindal, id: 'unverified', dataStatus: 'identity_verification_required' }]
    expect(rankColleges(profile({ academic_graduation: { percentage: 75 } }), list)[0].id).toBe(mbi.id)
  })

  it('does not fabricate a numerical match when every academic rule is unavailable', () => {
    const college = { ...mbi, minGraduationPercent: null, examCriteria: [] }
    expect(matchCollege(profile({ academic_graduation: { percentage: 100 }, exam_scores: [{ exam: 'CAT', percentile: 100 }] }), college).score).toBeNull()
  })

  it('flags a known Class 10 minimum even when graduation results are strong', () => {
    expect(matchCollege(profile({ academic_graduation: { percentage: 90 }, academic_10th: { percentage: 20 } }), mbi).eligibility).toBe('review_required')
  })

  it('flags a known Class 12 minimum even when graduation results are strong', () => {
    expect(matchCollege(profile({ academic_graduation: { percentage: 90 }, academic_12th: { percentage: 20 } }), mbi).eligibility).toBe('review_required')
  })

  it('flags the international-business work-experience requirement for a fresh graduate', () => {
    const ib = mbi.programmes.find(programme => programme.sourceRecordId === 'NCR-196')
    expect(matchCollege(profile({ academic_graduation: { percentage: 90 }, total_work_experience_months: 0 }), { ...mbi, ...ib }).eligibility).toBe('review_required')
  })

  it('does not verify degree duration from the graduation degree name alone', () => {
    const ib = mbi.programmes.find(programme => programme.sourceRecordId === 'NCR-196')
    expect(reason(matchCollege(profile({ academic_graduation: { degree: 'B.Com', percentage: 90 } }), { ...mbi, ...ib }), 'degreeDuration').status).toBe('unknown')
  })
})
