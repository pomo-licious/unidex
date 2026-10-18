import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'
import {
  SOURCE_ID, unique, sourceUrls, programmeCell, programmeDefinitions, labelledNumber,
  positiveNumber, acceptedExams, programmeStatus, sheetRecords,
} from './lib/delhiNcrImport.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const snapshot = JSON.parse(gunzipSync(await fs.readFile(path.join(root, 'scripts/data/delhi-ncr-workbook-v7.json.gz'))))
const rules = JSON.parse(await fs.readFile(path.join(root, 'scripts/data/delhi-ncr-verified-rules.json'), 'utf8'))
const metadata = snapshot.metadata
const currentSheets = ['Career Outcomes & Outlook', 'Admissions & Placement Contacts', 'Fee & ROI View', 'Exam & Cutoff View', 'Data Gaps', 'Fee Estimates']
const linkedViews = Object.fromEntries(currentSheets.map(name => [name, sheetRecords(snapshot, name)]))
const originalRows = sheetRecords(snapshot, 'College Master').filter(row => SOURCE_ID.test(row.fields.ID))
const source = row => ({ workbook: metadata.sourceWorkbook, version: metadata.sourceVersion, sheet: 'College Master', row, auditedOn: metadata.sourceAuditDate })
const programmeFields = (row, sourceRecordId, referenceId) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key,
  typeof value === 'number' && sourceRecordId !== referenceId ? null : programmeCell(value, sourceRecordId),
]))
const supplemental = row => currentSheets.flatMap(sheet => linkedViews[sheet].filter(item =>
  item.fields.ID === row.ID || item.fields.Institution === row.Institution,
).map(item => ({ sheet, row: item.row, fields: item.fields })))
const lakhs = number => number === null ? null : Math.round(number * 100000)
const dateFrom = value => String(value ?? '').match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0] ?? null
const missing = value => !value || /^(?:not available|not published|not applicable|not stated)$/i.test(String(value).trim())
const defaultDeadline = (url, checked) => ({ date: null, label: 'Confirm the current application deadline with the institution', sourceUrl: url, verifiedOn: checked, verificationStatus: 'confirmation_required', timeZone: 'Asia/Kolkata' })
const held = []
const colleges = []
const allSourceProgrammeIds = []
const researchRecords = {}

for (const { row: rowNumber, fields: row } of originalRows) {
  const definitions = programmeDefinitions(row)
  const referenceId = String(row['Numeric reference programme'] ?? '').match(/NCR-\d+/)?.[0] ?? row.ID
  const programmes = []
  for (const { sourceRecordId, name } of definitions) {
    allSourceProgrammeIds.push(sourceRecordId)
    const fields = programmeFields(row, sourceRecordId, referenceId)
    const status = programmeStatus(row, sourceRecordId)
    const urls = sourceUrls(row.Sources)
    const eligibilitySource = sourceUrls(fields['Admissions / Brochure'])[0] ?? sourceUrls(row.Website)[0] ?? null
    if (!String(status).startsWith('Active')) {
      held.push({ sourceRecordId, sourceInstitutionRecordId: row.ID, name: row.Institution, programme: name, city: row.City, reason: status, notes: fields.Notes, sourceUrls: urls, research: { source: source(rowNumber) } })
      continue
    }
    const isReference = sourceRecordId === referenceId
    const formalFee = isReference ? positiveNumber(row['Fee ₹L — Numeric']) : labelledNumber(fields['Fees — Published'], 'Numeric fee reference ₹L')
    const approximateFee = /approx(?:imate|imately|\.)|\bestimate\b|conditional|not a (?:certified|confirmed|fixed)/i.test([fields['Fees — Published'], fields['Fee Scope']].join(' '))
    const numericFee = approximateFee ? null : formalFee
    const reportedMean = isReference ? positiveNumber(row['Avg CTC ₹L']) : labelledNumber(fields['Avg CTC — Published'], 'Reported mean ₹L')
    const meanEvidence = [fields['Average Evidence'], fields['Placement Scope'], fields['Avg CTC — Published']].join(' ')
    // A published number may still be a pooled, undated or secondary reference. Keep its label, but not a verified programme average.
    const comparableMean = reportedMean !== null && !/pooled|pool\b|undated|headline|secondary|third[- ]party|proxy|interim|top.?\d+|not separately|institution[- ]wide|university[- ]wide|all.course|overall.*institution/i.test(meanEvidence)
    const numericMean = comparableMean ? reportedMean : null
    const examLabel = fields['Accepted Exams']
    const feeDateText = fields['Fee Source / Date']
    const placementDateText = fields['Average Source / Date']
    const feesSourceUrl = sourceUrls(feeDateText)[0] ?? eligibilitySource
    const placementsSourceUrl = sourceUrls(placementDateText)[0] ?? sourceUrls(fields['Placement Report'])[0] ?? null
    const publishedIntake = isReference ? positiveNumber(row['Intake — Numeric']) : labelledNumber(fields['Intake — Published'], 'Published numeric intake')
    const feeEstimateLow = isReference ? positiveNumber(row['Fee estimate low ₹L']) : labelledNumber(fields['Fee estimate basis'], 'Conditional fee low ₹L')
    const feeEstimateHigh = isReference ? positiveNumber(row['Fee estimate high ₹L']) : labelledNumber(fields['Fee estimate basis'], 'Conditional fee high ₹L')
    const ctcLow = isReference ? positiveNumber(row['Research CTC low ₹L']) : labelledNumber(fields['Research CTC basis'], 'Research CTC low ₹L')
    const ctcHigh = isReference ? positiveNumber(row['Research CTC high ₹L']) : labelledNumber(fields['Research CTC basis'], 'Research CTC high ₹L')
    const previousRules = rules.programmeRules[sourceRecordId] ?? {}
    const programme = {
      id: `programme-${sourceRecordId.toLowerCase()}`, sourceRecordId, name,
      type: fields['Programme Type'], mode: fields.Mode, duration: fields.Duration,
      acceptedExams: acceptedExams(examLabel), acceptedExamsLabel: examLabel,
      minGraduationPercent: null, eligibility: fields.Eligibility,
      eligibilitySourceUrl: eligibilitySource, eligibilityVerificationStatus: 'research_import_requires_cycle_check',
      examCriteria: [], examCutoffLabel: fields['CAT / Exam Cutoff'], cutoffVerificationStatus: 'research_label_not_official_numeric_threshold',
      selectionProcess: fields['Selection Process'],
      feesInr: lakhs(numericFee), feesLabel: fields['Fees — Published'], feeScope: fields['Fee Scope'],
      publishedFeeReferenceInr: lakhs(formalFee),
      feeVerificationStatus: numericFee === null ? 'unverified_or_unavailable' : 'published_schedule_cycle_and_scope_apply',
      feeEvidence: fields['Fee Evidence'], feeSourceUrl: feesSourceUrl, feeVerifiedOn: dateFrom(feeDateText) ?? fields['Last Verified'],
      averageCtcInr: lakhs(numericMean), averageCtcLabel: fields['Avg CTC — Published'],
      averageCtcVerificationStatus: numericMean === null ? 'unverified_or_noncomparable' : 'published_historical_cohort',
      reportedMeanReferenceInr: lakhs(reportedMean), placementScope: fields['Placement Scope'],
      placementEvidence: fields['Average Evidence'], placementSourceUrl: placementsSourceUrl,
      placementVerifiedOn: dateFrom(placementDateText) ?? fields['Last Verified'],
      intake: publishedIntake, intakeLabel: fields['Intake — Published'], intakeEvidence: fields['Intake Evidence'],
      medianCtcLabel: fields['Median CTC — Published'], highestCtcLabel: fields['Highest CTC — Published'],
      placementLabel: fields['Placement — Published'], placementPercent: isReference ? positiveNumber(row['Placement %']) : labelledNumber(fields['Placement — Published'], 'Published/calculated rate %'),
      topRecruiters: fields['Top Recruiters'], officialRoleExamples: fields['Official Role Examples'],
      careerPathsLabel: fields['Programme-Aligned Career Paths'], rankingLabel: fields.Ranking,
      contactsLabel: fields['Admissions / General Contact'], cohortLabel: fields['Outcome Year / Cohort'],
      feeEstimate: { lowInr: lakhs(feeEstimateLow ?? (approximateFee ? formalFee : null)), highInr: lakhs(feeEstimateHigh ?? (approximateFee ? formalFee : null)), basis: fields['Fee estimate basis'] ?? (approximateFee ? fields['Fees — Published'] : null), sourceUrls: unique([...sourceUrls(fields['Fee estimate source']), ...(approximateFee && feesSourceUrl ? [feesSourceUrl] : [])]), verificationStatus: 'conditional_estimate_not_payable_actual' },
      ctcReference: { lowInr: lakhs(ctcLow), highInr: lakhs(ctcHigh), type: fields['Research CTC type'], basis: fields['Research CTC basis'], sourceUrls: sourceUrls(fields['Research CTC source']), cohort: fields['Research CTC year'], verificationStatus: 'research_reference_not_verified_outcome' },
      deadline: defaultDeadline(eligibilitySource, fields['Last Verified']), applicationUrl: sourceUrls(row.Website)[0] ?? eligibilitySource,
      sourceUrls: urls, verifiedOn: fields['Last Verified'], dataStatus: 'research_import',
      researchReliability: fields.Reliability, notes: fields.Notes, applicationSignal: fields['Application / Vacancy Signal'],
      specificFields: [], requirementsStatus: 'pending_verification', sourceStatus: status, matchingBenchmarks: null,
      research: { source: source(rowNumber) },
      ...previousRules,
      ...rules.currentOfficialChecks?.[sourceRecordId],
    }
    // A newly withheld numeric value always supersedes an earlier imported value. Rules never own fees or outcomes.
    if (missing(programme.averageCtcLabel)) programme.averageCtcLabel = null
    programmes.push(programme)
  }
  if (!programmes.length) continue
  programmes.sort((a, b) => Number(b.sourceRecordId === referenceId) - Number(a.sourceRecordId === referenceId))
  const knownId = rules.institutionIds[row.ID]
  const id = knownId ?? `ncr-${row.Institution.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
  const first = programmes[0]
  const supplementary = supplemental(row)
  researchRecords[id] = {
    id,
    research: { source: source(rowNumber), fields: row, supplementary },
    programmes: Object.fromEntries(programmes.map(programme => [programme.id, {
      source: source(rowNumber),
      fields: programmeFields(row, programme.sourceRecordId, referenceId),
      supplementary: supplementary.map(item => ({
        ...item,
        fields: Object.fromEntries(Object.entries(item.fields).map(([key, value]) => [key,
          typeof value === 'number' && programme.sourceRecordId !== referenceId ? null : programmeCell(value, programme.sourceRecordId),
        ])),
      })),
    }])),
  }
  colleges.push({
    id, name: row.Institution, sourceInstitutionRecordId: row.ID, city: row.City, region: 'Delhi NCR',
    geographicScope: String(row['Geographic Scope']).startsWith('Core') ? 'core' : 'broader_ncr',
    type: programmeCell(row.Ownership, first.sourceRecordId), website: sourceUrls(row.Website)[0] ?? null,
    programme: first.name, programmeType: first.type, representativeProgrammeId: first.id,
    programmeNames: programmes.map(programme => programme.name), programmes,
    allAcceptedExams: unique(programmes.flatMap(programme => programme.acceptedExams)),
    affiliation: row['Affiliation / University'], accreditation: row['Approval / Accreditation'],
    importedOn: metadata.sourceAuditDate, sourceStatus: row.Status,
    research: { source: source(rowNumber) },
  })
}

if (new Set(allSourceProgrammeIds).size !== allSourceProgrammeIds.length) throw new Error('Duplicate source programme identifiers in workbook')
if (new Set(colleges.map(college => college.id)).size !== colleges.length) throw new Error('Duplicate website institution identifiers')
const activeProgrammes = colleges.flatMap(college => college.programmes)
const outputMetadata = {
  name: 'Delhi NCR MBA / PGDM college catalogue', ...metadata, importedOn: metadata.sourceAuditDate,
  institutions: colleges.length, programmeRecords: activeProgrammes.length,
  sourceInstitutions: originalRows.length, sourceProgrammeRecords: allSourceProgrammeIds.length,
  coreInstitutions: colleges.filter(college => college.geographicScope === 'core').length,
  coreProgrammeRecords: colleges.filter(college => college.geographicScope === 'core').flatMap(college => college.programmes).length,
  excludedInstitutions: new Set(held.map(programme => programme.sourceInstitutionRecordId)).size,
  excludedProgrammeRecords: held.length,
  currentCycleRechecks: ['MDI 2027–29 PGDM / HRM / Business Analytics fees checked on 18 October 2026', 'MDI 2027–29 deadline and programme-specific eligibility retained from official check on 16 October 2026', 'BIMTECH 2027–29 accepted tests and eligibility retained from official check on 16 October 2026'],
  sourceSheets: Object.keys(snapshot.sheets).concat(['Source Tracker', 'Change Log']),
  historicalAudit: 'docs/data/delhi-ncr-workbook-v7-audit.json.gz',
}
if (outputMetadata.sourceInstitutions !== 173 || outputMetadata.sourceProgrammeRecords !== 216 || outputMetadata.coreInstitutions !== 148 || outputMetadata.excludedInstitutions !== 16) {
  throw new Error(`Catalogue does not reconcile with workbook summary: ${JSON.stringify(outputMetadata)}`)
}
// Keep generated source files small without changing catalogue order or values.
const shardDirectory = path.join(root, 'src/data/delhiNcrCatalogue')
const shardHeader = '/** Generated by scripts/generate-delhi-ncr-catalogue.mjs; do not edit. */\nexport default '
const shardCode = records => shardHeader + JSON.stringify(records, null, 2) + ';\n'
const shards = []
let shard = []
for (const college of colleges) {
  if (Buffer.byteLength(shardCode([...shard, college])) > 250000 && shard.length) {
    shards.push(shard)
    shard = []
  }
  shard.push(college)
  if (Buffer.byteLength(shardCode(shard)) > 250000) throw new Error(`College record exceeds generated shard limit: ${college.id}`)
}
if (shard.length) shards.push(shard)
const shardNames = shards.map((_, index) => `part-${String(index + 1).padStart(2, '0')}.generated.js`)
await fs.mkdir(shardDirectory, { recursive: true })
for (const name of await fs.readdir(shardDirectory)) {
  if (/^part-\d{2}\.generated\.js$/.test(name) && !shardNames.includes(name)) await fs.unlink(path.join(shardDirectory, name))
}
for (const [index, records] of shards.entries()) await fs.writeFile(path.join(shardDirectory, shardNames[index]), shardCode(records))
const imports = shardNames.map((name, index) => `import records${index + 1} from './delhiNcrCatalogue/${name}';`).join('\n')
const sourceCode = `/** Generated by scripts/generate-delhi-ncr-catalogue.mjs. See docs/DELHI_NCR_CATALOGUE.md.
 * Missing numeric facts are null; expected bands and conditional estimates are not admissions rules. */
${imports}

export const DELHI_NCR_CATALOGUE_METADATA = ${JSON.stringify(outputMetadata, null, 2)};

const COLLEGE_RECORDS = [${shards.map((_, index) => `...records${index + 1}`).join(', ')}];

export const DELHI_NCR_COLLEGES = COLLEGE_RECORDS.map(college => ({ ...college.programmes[0], ...college }));

// Held source records are audit information, excluded from active discovery and matching.
export const DELHI_NCR_EXCLUDED_RECORDS = ${JSON.stringify(held, null, 2)};
`
const loader = `
const RESEARCH_IDS = new Set(COLLEGE_RECORDS.map(college => college.id));
/** Public research is loaded only when a student opens its detail view. */
export async function loadCollegeResearch(collegeId, { signal, fetchImpl = globalThis.fetch } = {}) {
  if (!RESEARCH_IDS.has(collegeId)) throw new Error('This college is not in the current research catalogue.');
  const response = await fetchImpl('/data/college-research/' + encodeURIComponent(collegeId) + '.json?v=${metadata.sourceVersion}-${metadata.sha256.slice(0, 12)}', { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error('College research could not be loaded. Please try again.');
  const result = await response.json();
  if (result?.id !== collegeId || result?.research?.source?.version !== DELHI_NCR_CATALOGUE_METADATA.sourceVersion || !result.research.fields || !result.programmes) throw new Error('College research is out of date. Refresh and try again.');
  return result;
}
`
await fs.writeFile(path.join(root, 'src/data/delhiNcrColleges.js'), sourceCode + loader)
const researchDirectory = path.join(root, 'public/data/college-research')
await fs.mkdir(researchDirectory, { recursive: true })
for (const name of await fs.readdir(researchDirectory)) if (name.endsWith('.json') && !researchRecords[name.slice(0, -5)]) await fs.unlink(path.join(researchDirectory, name))
for (const [id, research] of Object.entries(researchRecords)) await fs.writeFile(path.join(researchDirectory, `${id}.json`), JSON.stringify(research) + '\n')
console.log(JSON.stringify(outputMetadata, null, 2))
