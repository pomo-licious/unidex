import { isAiImportPath } from './admissionsProfile'

const NUMBER_FIELDS = new Set(['year', 'year_of_passing', 'percentage', 'cgpa', 'cgpa_scale', 'total_score', 'percentile', 'months', 'total_work_experience_months', 'last_drawn_ctc'])
const FIELD_LABELS = { full_name: 'Full name', email: 'Email address', phone: 'Mobile number', date_of_birth: 'Date of birth', gender: 'Gender', nationality: 'Nationality', current_city: 'Current city', total_work_experience_months: 'Total work experience (months)', last_drawn_ctc: 'Last drawn annual CTC (₹)', year_of_passing: 'Year of graduation', cgpa: 'CGPA', cgpa_scale: 'CGPA grading scale', total_score: 'Total score', start_date: 'Start date', end_date: 'End date', current: 'Current role', months: 'Experience (months)' }
const own = (value, key) => value != null && Object.prototype.hasOwnProperty.call(value, key)

export const isReviewableAiPath = isAiImportPath

export function profileValueAtPath(profile, path) {
  if (!isReviewableAiPath(path)) return undefined
  return path.reduce((value, key) => own(value, key) ? value[key] : undefined, profile)
}

function equivalent(a, b, path) {
  const empty = value => value === null || value === undefined || value === ''
  if (empty(a) || empty(b)) return empty(a) && empty(b)
  const numeric = NUMBER_FIELDS.has(path.at(-1)) || path.includes('section_scores')
  if (numeric && Number.isFinite(Number(a)) && Number.isFinite(Number(b))) return Number(a) === Number(b)
  return typeof a === 'string' && typeof b === 'string' ? a.trim() === b.trim() : Object.is(a, b)
}

export function aiFieldLabel(path) {
  const key = path.at(-1), label = FIELD_LABELS[key] || String(key).replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase())
  if (path[0] === 'academic_10th') return `Class 10 · ${label}`
  if (path[0] === 'academic_12th') return `Class 12 · ${label}`
  if (path[0] === 'academic_graduation') return `Graduation · ${label}`
  if (path[0] === 'exam_scores') return `Exam ${Number(path[1]) + 1} · ${path.includes('section_scores') ? 'Section score · ' : ''}${label}`
  if (path[0] === 'work_experience') return `Experience ${Number(path[1]) + 1} · ${label}`
  return label
}

export function getAiImportedFields(profile = {}) {
  const latest = new Map()
  const records = Array.isArray(profile.ai_imports) ? profile.ai_imports : []
  records.map((record, index) => ({ record, index, time: Date.parse(record?.imported_at) || 0 })).sort((a, b) => a.time - b.time || a.index - b.index).forEach(({ record }) => {
    if (!Array.isArray(record?.fields)) return
    for (const field of record.fields) {
      if (!isReviewableAiPath(field?.path) || !['string', 'number', 'boolean'].includes(typeof field.value)) continue
      const path = [...field.path]
      latest.set(JSON.stringify(path.map(String)), { path, aiValue: field.value, label: aiFieldLabel(path), fileName: typeof record.file_name === 'string' && record.file_name.trim() ? record.file_name : 'Uploaded document', documentId: record.document_id || null, reviewed: record.reviewed === true })
    }
  })
  return [...latest.values()]
}

const ROW_SECTIONS = new Set(['exam_scores', 'work_experience'])
const rowKey = row => row?._unidex_row_id || row?.id

export function withProfileReviewRowIds(profile) {
  const next = structuredClone(profile)
  for (const section of ROW_SECTIONS) next[section] = (next[section] || []).map(row => ({ ...row, _unidex_row_id: row._unidex_row_id || crypto.randomUUID() }))
  return next
}

function candidatePathFor(path, saved, candidate) {
  if (!ROW_SECTIONS.has(path[0])) return path
  const oldRows = saved[path[0]] || [], newRows = candidate[path[0]] || []
  const oldRow = oldRows[path[1]]
  if (!oldRow) return null
  const identity = rowKey(oldRow)
  if (identity) {
    const matches = newRows.flatMap((row, index) => rowKey(row) === identity ? [index] : [])
    if (matches.length > 1) throw new Error('Two profile rows share the same tracking identity. Reload the latest profile before saving.')
    return matches.length ? [path[0], matches[0], ...path.slice(2)] : null
  }
  // Legacy drafts have no tracking IDs. An equal row count alone does not establish identity.
  if (!newRows.length) return null
  const fingerprint = row => profileFingerprint(Object.fromEntries(Object.entries(row || {}).filter(([key]) => key !== '_unidex_row_id')))
  const matches = newRows.flatMap((row, index) => fingerprint(row) === fingerprint(oldRow) ? [index] : [])
  if (matches.length === 1) return [path[0], matches[0], ...path.slice(2)]
  const normalizeKey = value => value === undefined || value === null ? '' : String(value).trim().replace(/\s+/g, ' ').toLowerCase()
  const identityKeys = path[0] === 'exam_scores' ? ['exam', 'year'] : ['company', 'designation', 'start_date']
  const anchor = row => { const parts = identityKeys.map(key => normalizeKey(row?.[key])); return parts.some(Boolean) ? JSON.stringify(parts) : null }
  const target = anchor(oldRow)
  const anchored = target ? newRows.flatMap((row, index) => anchor(row) === target ? [index] : []) : []
  if (anchored.length === 1 && oldRows.filter(row => anchor(row) === target).length === 1) return [path[0], anchored[0], ...path.slice(2)]
  // A pure deletion is unambiguous when every surviving row is an unchanged unique old row.
  if (newRows.length < oldRows.length && newRows.every(row => oldRows.filter(previous => fingerprint(previous) === fingerprint(row)).length === 1) && !matches.length) return null
  throw new Error('The identity of an imported profile row is unclear. Reload the profile, then save row removals separately from other changes.')
}

export function rebaseProfileAiImports(candidate, saved) {
  const imports = Array.isArray(saved.ai_imports) ? saved.ai_imports : []
  return imports.flatMap(record => {
    const fields = (Array.isArray(record.fields) ? record.fields : []).flatMap(field => {
      if (!isReviewableAiPath(field.path)) return []
      const path = candidatePathFor(field.path, saved, candidate)
      if (path && !isReviewableAiPath(path)) throw new Error('An imported row would exceed the supported profile limits. Keep at most 20 exam results and 30 experience rows before saving.')
      return path ? [{ ...field, path: [...path] }] : []
    })
    return fields.length ? [{ ...record, fields }] : []
  })
}

export function findAiProfileCorrections(candidate = {}, saved = {}) {
  return getAiImportedFields(saved).flatMap(field => {
    const savedValue = profileValueAtPath(saved, field.path)
    const nextPath = candidatePathFor(field.path, saved, candidate)
    const value = nextPath ? profileValueAtPath(candidate, nextPath) : undefined
    // A previously saved correction does not require repeated confirmation.
    if (equivalent(value, savedValue, field.path) || equivalent(value, field.aiValue, field.path)) return []
    return [{ ...field, savedValue, value }]
  })
}

export function displayAiReviewValue(value) {
  if (value === null || value === undefined || value === '') return 'Removed / left blank'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

export function profileFingerprint(value) {
  const sort = item => Array.isArray(item) ? item.map(sort) : item && typeof item === 'object' ? Object.fromEntries(Object.keys(item).sort().filter(key => item[key] !== undefined).map(key => [key, sort(item[key])])) : item
  return JSON.stringify(sort(value))
}

export function freezeProfileSaveSnapshot(profile, userId, expectedRevision) {
  const clone = structuredClone(profile)
  function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) } return value }
  return Object.freeze({ profile: freeze(clone), userId, expectedRevision })
}

export function prepareProfileSaveReview(candidate, editorBase, latestRecord, userId, trackedBase = editorBase) {
  if (!userId) throw new Error('Sign in again before saving your profile.')
  if (!latestRecord || !Number.isSafeInteger(latestRecord.revision) || latestRecord.revision < 0) throw new Error('Your profile version could not be checked. Please try saving again.')
  if (profileFingerprint(editorBase) !== profileFingerprint(latestRecord.profile)) throw new Error('Your saved profile changed in another window or workflow. Your edits are still here. Refresh this page to load the latest details before applying your corrections.')
  const changes = findAiProfileCorrections(candidate, trackedBase)
  const next = withProfileReviewRowIds({ ...candidate, ai_imports: rebaseProfileAiImports(candidate, trackedBase) })
  const snapshot = freezeProfileSaveSnapshot(next, userId, latestRecord.revision)
  return { snapshot, changes }
}
