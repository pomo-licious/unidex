import { describe, expect, it } from 'vitest'
import {
  DELHI_NCR_CATALOGUE_METADATA, DELHI_NCR_COLLEGES,
  DELHI_NCR_EXCLUDED_RECORDS,
} from '../src/data/delhiNcrColleges.js'

const programmes = DELHI_NCR_COLLEGES.flatMap(college => college.programmes)
const mdi = DELHI_NCR_COLLEGES.find(college => college.id === 'ncr-mdi-gurgaon')
const bimtech = DELHI_NCR_COLLEGES.find(college => college.id === 'ncr-bimtech-greater-noida')

describe('Delhi NCR programme evidence contract', () => {
  it('reconciles published catalogue counts with the actual imported programmes', () => {
    expect([DELHI_NCR_COLLEGES.length, programmes.length]).toEqual([DELHI_NCR_CATALOGUE_METADATA.institutions, DELHI_NCR_CATALOGUE_METADATA.programmeRecords])
  })

  it('keeps programme identities unique across different institutions', () => {
    expect(new Set(programmes.map(programme => programme.id)).size).toBe(programmes.length)
  })

  it('does not expose held research leads in active discovery', () => {
    const held = new Set(DELHI_NCR_EXCLUDED_RECORDS.map(record => record.sourceRecordId))
    expect(programmes.some(programme => held.has(programme.sourceRecordId))).toBe(false)
  })

  it('retains unknown deadlines as null rather than reusing seeded sample dates', () => {
    expect(programmes.filter(programme => programme.deadline.verificationStatus !== 'verified_current_cycle').every(programme => programme.deadline.date === null)).toBe(true)
  })

  it('keeps the MDI full-time deadline attached to a named cycle and timezone', () => {
    expect([mdi.deadline.date, mdi.deadline.closesAt, mdi.deadline.timeZone]).toEqual(['2026-11-28', '2026-11-28T17:00:00+05:30', 'Asia/Kolkata'])
  })

  it('does not assign MDI full-time deadlines to its executive business-management programme', () => {
    expect(mdi.programmes.find(programme => programme.sourceRecordId === 'NCR-197').deadline.date).toBeNull()
  })

  it('keeps the MDI international-business work-experience requirement programme-specific', () => {
    expect(mdi.programmes.filter(programme => programme.minWorkExperienceMonths === 12).map(programme => programme.sourceRecordId)).toEqual(['NCR-196'])
  })

  it('does not claim MAT is accepted by BIMTECH general PGDM', () => {
    expect(bimtech.programmes.find(programme => programme.sourceRecordId === 'NCR-020').acceptedExams).not.toContain('MAT')
  })

  it('retains MAT as an accepted route for BIMTECH insurance management', () => {
    expect(bimtech.programmes.find(programme => programme.sourceRecordId === 'NCR-186').acceptedExams).toContain('MAT')
  })

  it('requires source evidence before labelling a college-specific answer mandatory', () => {
    expect(programmes.flatMap(programme => programme.specificFields).filter(field => field.required).every(field => /^https:\/\//.test(field.sourceUrl))).toBe(true)
  })

  it('keeps noncomparable placement figures out of the numeric average CTC field', () => {
    expect(programmes.filter(programme => programme.averageCtcVerificationStatus === 'unverified_or_noncomparable').every(programme => programme.averageCtcInr === null)).toBe(true)
  })

  it('preserves an unknown website without inventing a likely institutional domain', () => {
    expect(DELHI_NCR_COLLEGES.find(college => college.sourceInstitutionRecordId === 'NCR-128').website).toBeNull()
  })

  it('keeps inherited fee estimates separate from verified numeric fees', () => {
    expect(programmes.filter(programme => programme.feeVerificationStatus === 'unverified_or_unavailable').every(programme => programme.feesInr === null)).toBe(true)
  })
})
