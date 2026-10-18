import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it, vi } from 'vitest'
import {
  DELHI_NCR_CATALOGUE_METADATA as metadata, DELHI_NCR_COLLEGES as colleges,
  DELHI_NCR_EXCLUDED_RECORDS as held, loadCollegeResearch,
} from '../src/data/delhiNcrColleges.js'
import { acceptedExams, programmeCell, programmeDefinitions, sheetRecords } from '../scripts/lib/delhiNcrImport.mjs'

const snapshot = JSON.parse(gunzipSync(fs.readFileSync(new URL('../scripts/data/delhi-ncr-workbook-v7.json.gz', import.meta.url))))
const sourceColleges = sheetRecords(snapshot, 'College Master').filter(row => /^NCR-\d+$/.test(row.fields.ID))
const programmes = colleges.flatMap(college => college.programmes)
const programme = id => programmes.find(record => record.sourceRecordId === id)
const researchFor = college => JSON.parse(fs.readFileSync(new URL(`../public/data/college-research/${college.id}.json`, import.meta.url)))

describe('final workbook institution and programme import', () => {
  it('imports the current version seven audit with the original source fingerprint', () => {
    expect([metadata.sourceVersion, metadata.sourceAuditDate, metadata.sha256]).toEqual(['7', '2026-10-18', snapshot.metadata.sha256])
  })

  it('reconciles every source programme across active discovery and held audit records', () => {
    const imported = [...programmes, ...held].map(record => record.sourceRecordId).sort()
    const expected = sourceColleges.flatMap(({ fields }) => programmeDefinitions(fields).map(record => record.sourceRecordId)).sort()
    expect(imported).toEqual(expected)
  })

  it('keeps one card per active institution after the workbook consolidation', () => {
    expect([sourceColleges.length, colleges.length, programmes.length, held.length]).toEqual([173, 157, 199, 17])
  })

  it('excludes all sixteen held institutions from recommendations', () => {
    const heldInstitutions = new Set(held.map(record => record.sourceInstitutionRecordId))
    expect(colleges.some(college => heldInstitutions.has(college.sourceInstitutionRecordId))).toBe(false)
  })

  it('retains the stable featured college and programme identifiers', () => {
    expect(['NCR-001', 'NCR-003', 'NCR-009'].map(id => {
      const college = colleges.find(record => record.sourceInstitutionRecordId === id)
      return [college.id, college.representativeProgrammeId]
    })).toEqual([['ncr-fms-delhi', 'programme-ncr-001'], ['ncr-iit-delhi-dms', 'programme-ncr-003'], ['ncr-mdi-gurgaon', 'programme-ncr-009']])
  })

  it('keeps the FMS conditional semester calculation separate from verified fees', () => {
    expect([programme('NCR-001').feesInr, programme('NCR-001').feeEstimate.lowInr]).toEqual([null, 243272])
  })

  it('does not use an approximate published fee as an exact budget constraint', () => {
    expect([programme('NCR-023').feesInr, programme('NCR-023').publishedFeeReferenceInr]).toEqual([null, 1725000])
  })

  it('uses the current MDI fee schedule only for its three named programmes', () => {
    expect(['NCR-009', 'NCR-010', 'NCR-011', 'NCR-196'].map(id => [programme(id).feesInr, programme(id).feeCycle ?? null])).toEqual([[2627810, '2027-29'], [2627810, '2027-29'], [2627810, '2027-29'], [3226500, null]])
  })

  it('preserves the separate newly verified JSS University identity', () => {
    expect([colleges.find(college => college.sourceInstitutionRecordId === 'NCR-216')?.city, held.find(record => record.sourceRecordId === 'NCR-074')?.name]).toEqual(['Noida', 'JSS Academy of Technical Education, Noida – MBA'])
  })

  it('does not fabricate average entrant GMAT or work-experience benchmarks', () => {
    expect(programmes.every(record => record.matchingBenchmarks === null)).toBe(true)
  })

  it('does not apply an unversioned GMAT classic cutoff to a Focus score', () => {
    expect(programme('NCR-166').examCriteria.some(rule => rule.exam === 'GMAT')).toBe(false)
  })

  it('preserves the historical CA and CS alternative route without claiming a current bonus', () => {
    expect([programme('NCR-063').acceptedProfessionalQualifications, programme('NCR-063').qualificationEligibilityVerificationStatus]).toEqual([['CA', 'CS'], 'official_previous_cycle_requires_confirmation'])
  })
})

describe('programme cell separation', () => {
  const text = 'MBA [NCR-001] / Executive MBA [NCR-002]: Shared fact\n\nPGDM [NCR-003]: Distinct fact'

  it('applies a shared labelled fact to both named programmes', () => {
    expect(programmeCell(text, 'NCR-002')).toBe('Shared fact')
  })

  it('does not copy a different programme fact into an unmentioned programme', () => {
    expect(programmeCell(text, 'NCR-004')).toBeNull()
  })

  it('retains a genuinely unlabelled shared workbook cell', () => {
    expect(programmeCell('2 years', 'NCR-002')).toBe('2 years')
  })

  it('does not turn a CAT exemption into an accepted entrance test', () => {
    expect(acceptedExams('Institute selection; CAT not required in published executive route')).toEqual([])
  })

  it('keeps raw GMAT route conditions in the label while identifying the exam', () => {
    expect(acceptedExams('XAT; GMAT for eligible international/NRI routes')).toEqual(['XAT', 'GMAT'])
  })
})

describe('complete research on demand', () => {
  it('keeps the complete seventy source columns available for every active college', () => {
    expect(colleges.every(college => Object.keys(researchFor(college).research.fields).length === 70)).toBe(true)
  })

  it('keeps the original master row and supplementary sheet row lineage', () => {
    const research = researchFor(colleges.find(college => college.sourceInstitutionRecordId === 'NCR-001'))
    expect([research.research.source.row, research.research.supplementary.map(record => record.sheet)]).toEqual([6, ['Career Outcomes & Outlook', 'Admissions & Placement Contacts', 'Fee & ROI View', 'Exam & Cutoff View', 'Data Gaps', 'Fee Estimates']])
  })

  it('does not copy a reference MBA numeric fee into the executive research view', () => {
    const research = researchFor(colleges.find(college => college.sourceInstitutionRecordId === 'NCR-003'))
    expect(research.programmes['programme-ncr-004'].fields['Fee ₹L — Numeric']).toBeNull()
  })

  it('retains historical source and correction logs outside the public website payload', () => {
    const archive = JSON.parse(gunzipSync(fs.readFileSync(new URL('../docs/data/delhi-ncr-workbook-v7-audit.json.gz', import.meta.url))))
    expect(Object.fromEntries(Object.entries(archive.sheets).map(([name, rows]) => [name, rows.filter(row => row.row > 5).length]))).toEqual({ 'Source Tracker': 4805, 'Change Log': 7133 })
  })

  it('rejects an unknown college identifier without making a request', async () => {
    const fetchImpl = vi.fn()
    await expect(loadCollegeResearch('../private', { fetchImpl })).rejects.toThrow('not in the current research catalogue')
  })

  it('passes cancellation to the public research request', async () => {
    const controller = new AbortController()
    const college = colleges[0]
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => researchFor(college) }))
    await loadCollegeResearch(college.id, { signal: controller.signal, fetchImpl })
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining(`/data/college-research/${college.id}.json?v=7-`), { signal: controller.signal, cache: 'no-cache' })
  })

  it('rejects a mismatched or stale research response', async () => {
    await expect(loadCollegeResearch(colleges[0].id, { fetchImpl: async () => ({ ok: true, json: async () => ({ id: colleges[1].id }) }) })).rejects.toThrow('out of date')
  })
})
