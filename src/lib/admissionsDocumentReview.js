import { validateAdmissionsProfile } from './admissionsProfile'

const PERSONAL = ['full_name', 'email', 'phone', 'date_of_birth', 'gender', 'nationality', 'current_city', 'total_work_experience_months', 'last_drawn_ctc']
const ACADEMIC = {
  academic_10th: ['board', 'school', 'year', 'percentage', 'cgpa', 'cgpa_scale'],
  academic_12th: ['board', 'school', 'year', 'percentage', 'cgpa', 'cgpa_scale', 'stream'],
  academic_graduation: ['university', 'college', 'degree', 'branch', 'year_of_passing', 'cgpa', 'cgpa_scale', 'percentage'],
}
const EXAMS = ['exam', 'exam_version', 'year', 'total_score', 'percentile']
const WORK = ['company', 'designation', 'start_date', 'end_date', 'current', 'months', 'last_drawn_ctc']
const QUALIFICATIONS = ['qualification', 'title', 'institution', 'status', 'completion_year', 'percentage', 'cgpa', 'cgpa_scale', 'field']
const DEFENCE = ['status', 'branch', 'rank', 'start_date', 'end_date', 'current', 'leadership_summary']
const ROW_FIELDS = { exam_scores: EXAMS, work_experience: WORK, professional_qualifications: QUALIFICATIONS }
const rowName = section => section === 'exam_scores' ? 'Exam result' : section === 'professional_qualifications' ? 'Qualification' : 'Experience'
const GROUPS = { academic_10th: 'Class 10 mark sheet', academic_12th: 'Class 12 mark sheet', academic_graduation: 'Graduation mark sheet' }
export const DOCUMENT_REVIEW_NUMBERS = new Set(['year', 'year_of_passing', 'completion_year', 'percentage', 'cgpa', 'cgpa_scale', 'total_score', 'percentile', 'months', 'last_drawn_ctc', 'total_work_experience_months'])
export const DOCUMENT_REVIEW_LABELS = { exam_version: 'GMAT edition', qualification: 'Qualification', title: 'Qualification title', institution: 'Awarding institution', status: 'Status', completion_year: 'Year of completion', field: 'Field of study', rank: 'Rank', leadership_summary: 'Leadership / service responsibilities', full_name: 'Full name', email: 'Email', phone: 'Phone', date_of_birth: 'Date of birth', gender: 'Gender', nationality: 'Nationality', current_city: 'Current city', board: 'Board', school: 'School', year: 'Year', percentage: 'Percentage', cgpa: 'CGPA', cgpa_scale: 'CGPA grading scale', stream: 'Stream', university: 'University', college: 'College', degree: 'Degree', branch: 'Specialization', year_of_passing: 'Year of completion', exam: 'Entrance exam', total_score: 'Total score', percentile: 'Percentile', company: 'Company', designation: 'Designation', start_date: 'Start date', end_date: 'End date', months: 'Months of experience', current: 'Currently employed here', last_drawn_ctc: 'Annual CTC (₹)', total_work_experience_months: 'Total experience (months)', verbal: 'Verbal score', quantitative: 'Quantitative score', reasoning: 'Reasoning score' }
const safeKey = key => typeof key === 'number' || /^[a-zA-Z0-9_ -]{1,80}$/.test(String(key)) && !['__proto__', 'prototype', 'constructor'].includes(String(key))
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const clone = value => structuredClone(value)
const text = value => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en')
const stable = value => Array.isArray(value) ? value.map(stable) : record(value) ? Object.fromEntries(Object.keys(value).filter(safeKey).sort().map(key => [key, stable(value[key])])) : typeof value === 'string' ? text(value) : value
const exact = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b))
export const hasDocumentReviewValue = value => value !== null && value !== undefined && (typeof value !== 'string' || value.trim() !== '')
function get(object, path) { return path.reduce((node, key) => node?.[key], object) }
function set(object, path, value) {
  if (!path.every(safeKey)) throw new Error('This extracted field is not supported.')
  let node = object
  path.forEach((key, index) => {
    if (index === path.length - 1) { node[key] = value; return }
    if (!node[key] || typeof node[key] !== 'object') node[key] = typeof path[index + 1] === 'number' ? [] : {}
    node = node[key]
  })
}
function numeric(field) { return DOCUMENT_REVIEW_NUMBERS.has(field.key) || field.path.includes('section_scores') }
function typedValue(field) {
  if (!hasDocumentReviewValue(field.value)) return undefined
  if (field.key === 'current') {
    if (field.value === true || field.value === 'true') return true
    if (field.value === false || field.value === 'false') return false
    throw new Error(`${field.label} must be Yes or No.`)
  }
  if (numeric(field)) {
    const value = Number(String(field.value).trim())
    if (!Number.isFinite(value) || value < (field.path.includes('section_scores') ? -100 : 0)) throw new Error(`Enter a valid non-negative number for ${field.label}.`)
    const max = ['percentage', 'percentile'].includes(field.key) ? 100 : field.key === 'cgpa' ? 20 : field.key === 'cgpa_scale' ? 100 : ['months', 'total_work_experience_months'].includes(field.key) ? 720 : field.key === 'last_drawn_ctc' ? 1e10 : field.key === 'total_score' ? 2000 : null
    if (max !== null && value > max) throw new Error(`${field.label} must not exceed ${max}.`)
    if (['year', 'year_of_passing', 'completion_year'].includes(field.key) && (!Number.isInteger(value) || value < 1950 || value > new Date().getUTCFullYear() + (field.key === 'completion_year' ? (field.record?.source.status || field.record?.baseRecord?.status) === 'pursuing' ? 10 : 0 : 6))) throw new Error(`Check the year for ${field.label}.`)
    if (field.key === 'cgpa_scale' && value < 1) throw new Error('A CGPA grading scale must be greater than zero.')
    return value
  }
  if (typeof field.value !== 'string') throw new Error(`Check the extracted value for ${field.label}.`)
  const value = field.value.trim()
  const choices = field.key === 'qualification' ? ['CA', 'CS', 'CMA', 'CPA', 'ACCA', 'CFA', 'PhD', 'Other'] : field.key === 'exam_version' ? ['focus', 'classic'] : field.key === 'status' ? field.path[0] === 'defence_service' ? ['none', 'serving', 'veteran'] : ['completed', 'pursuing'] : null
  if (choices && !choices.includes(value)) throw new Error(`Check the extracted ${field.label.toLowerCase()}.`)
  if (field.key.includes('date')) {
    const month = /^\d{4}-\d{2}$/.test(value)
    if (month && ['start_date', 'end_date'].includes(field.key)) {
      if (Number(value.slice(-2)) < 1 || Number(value.slice(-2)) > 12 || value > new Date().toISOString().slice(0, 7)) throw new Error(`Check ${field.label}; use a valid month that is not in the future.`)
    } else {
      const parsed = new Date(`${value}T12:00:00Z`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value || value > new Date().toISOString().slice(0, 10)) throw new Error(`Check ${field.label}; use a valid date that is not in the future.`)
    }
  }
  return value
}
export function comparableDocumentValues(field, left, right) {
  if (!hasDocumentReviewValue(left) || !hasDocumentReviewValue(right)) return !hasDocumentReviewValue(left) && !hasDocumentReviewValue(right)
  if (numeric(field)) return Number.isFinite(Number(left)) && Number.isFinite(Number(right)) && Number(left) === Number(right)
  if (field.key === 'current') return String(left) === String(right)
  if (field.key.includes('date')) return String(left).trim() === String(right).trim()
  if (field.key === 'phone') return String(left).replace(/[\s()-]/g, '') === String(right).replace(/[\s()-]/g, '')
  return text(left) === text(right)
}
function classify(field) {
  if (field.record?.choice === '') return { status: 'ambiguous', reason: field.record.reason || 'Choose the record this belongs to before autofill.' }
  try { typedValue(field) } catch (error) { return { status: 'invalid', reason: error.message } }
  if (!hasDocumentReviewValue(field.value)) return { status: 'invalid', reason: 'No value was extracted.' }
  if (field.key === 'cgpa_scale' && hasDocumentReviewValue(field.currentCgpa) && !hasDocumentReviewValue(field.sourceCgpa)) return { status: 'variance', reason: 'The document has no corresponding CGPA. Confirm the value and its scale together in Profile.' }
  if (field.key === 'cgpa_scale' && hasDocumentReviewValue(field.currentCgpa) && Number(field.sourceCgpa) !== Number(field.currentCgpa)) return { status: 'variance', reason: 'This scale belongs to an extracted CGPA. Review and approve the value and its grading scale together.' }
  if (field.key === 'cgpa' && hasDocumentReviewValue(field.sourceScale) && hasDocumentReviewValue(field.currentScale) && Number(field.sourceScale) !== Number(field.currentScale)) return { status: 'variance', reason: 'The document and profile use different CGPA scales. Approve the value and grading scale together; no conversion has been assumed.' }
  if (!hasDocumentReviewValue(field.current)) return { status: 'new', reason: 'This profile field is empty.' }
  return comparableDocumentValues(field, field.value, field.current) ? { status: 'same', reason: 'Already recorded in your profile.' } : { status: 'variance', reason: 'The extracted value differs from your saved profile.' }
}
function decorate(field, keepSelection = false) {
  const classification = classify(field)
  return { ...field, ...classification, include: keepSelection ? Boolean(field.include) && !['same', 'invalid', 'ambiguous'].includes(classification.status) : classification.status === 'new' }
}
export function updateAdmissionsDocumentField(field, patch) {
  return decorate({ ...field, ...patch }, Object.hasOwn(patch, 'include') || field.include)
}
function dateCompatible(a, b) {
  if (!hasDocumentReviewValue(a) || !hasDocumentReviewValue(b)) return true
  return String(a).length === 7 || String(b).length === 7 ? String(a).slice(0, 7) === String(b).slice(0, 7) : String(a) === String(b)
}
function candidates(section, source, rows) {
  return rows.map((row, index) => ({ row, index })).filter(({ row }) => {
    if (!record(row)) return false
    if (section === 'professional_qualifications') return hasDocumentReviewValue(source.qualification) && text(row.qualification) === text(source.qualification) && (!hasDocumentReviewValue(source.institution) || !hasDocumentReviewValue(row.institution) || text(row.institution) === text(source.institution)) && (!hasDocumentReviewValue(source.completion_year) || !hasDocumentReviewValue(row.completion_year) || Number(row.completion_year) === Number(source.completion_year)) && (!hasDocumentReviewValue(source.title) || !hasDocumentReviewValue(row.title) || text(row.title) === text(source.title))
    if (section === 'exam_scores') return hasDocumentReviewValue(source.exam) && text(row.exam) === text(source.exam) && (!hasDocumentReviewValue(source.exam_version) || !hasDocumentReviewValue(row.exam_version) || text(row.exam_version) === text(source.exam_version)) && (!hasDocumentReviewValue(source.year) || !hasDocumentReviewValue(row.year) || Number(row.year) === Number(source.year))
    return hasDocumentReviewValue(source.company) && text(row.company) === text(source.company) && (!hasDocumentReviewValue(source.designation) || !hasDocumentReviewValue(row.designation) || text(row.designation) === text(source.designation)) && dateCompatible(source.start_date, row.start_date)
  })
}
function identity(section, source) {
  if (section === 'professional_qualifications') return hasDocumentReviewValue(source.qualification) && hasDocumentReviewValue(source.institution) && hasDocumentReviewValue(source.completion_year) ? `${text(source.qualification)}|${text(source.institution)}|${source.completion_year}|${text(source.title)}` : null
  if (section === 'exam_scores') return hasDocumentReviewValue(source.exam) && hasDocumentReviewValue(source.year) ? `${text(source.exam)}|${source.year}|${text(source.exam_version)}` : null
  return hasDocumentReviewValue(source.company) && hasDocumentReviewValue(source.designation) && hasDocumentReviewValue(source.start_date) ? `${text(source.company)}|${text(source.designation)}|${String(source.start_date).slice(0, 7)}` : null
}
function sameSuggestion(section, left, right) {
  const canonical = source => {
    const result = {}
    for (const key of ROW_FIELDS[section]) {
      if (!hasDocumentReviewValue(source[key])) continue
      const raw = source[key]
      result[key] = DOCUMENT_REVIEW_NUMBERS.has(key) && Number.isFinite(Number(raw)) ? Number(raw) : key === 'current' && ['true', 'false'].includes(String(raw)) ? String(raw) === 'true' : raw
    }
    if (section === 'exam_scores' && record(source.section_scores)) result.section_scores = Object.fromEntries(Object.entries(source.section_scores).filter(([key]) => safeKey(key)).map(([key, value]) => [key, hasDocumentReviewValue(value) && Number.isFinite(Number(value)) ? Number(value) : value]))
    return result
  }
  return exact(canonical(left), canonical(right))
}
function rowLabel(section, row, index) { if (section === 'professional_qualifications') return `${row.title || row.qualification || 'Unnamed qualification'} · ${row.institution || 'institution not recorded'} · ${row.completion_year || 'year not recorded'} (record ${index + 1})`; return section === 'exam_scores' ? `${row.exam || 'Unnamed exam'}${row.exam_version ? ` (${row.exam_version})` : ''} · ${row.year || 'year not recorded'} (record ${index + 1})` : `${row.company || 'Unnamed company'} · ${row.designation || 'role not recorded'} · ${row.start_date || 'start date not recorded'} (record ${index + 1})` }
function rowChoices(section, rows) { return rows.map((row, index) => ({ value: `existing:${index}`, label: rowLabel(section, row, index), baseRecord: clone(row) })) }
function makeRecord(section, source, sourceIndex, rows, duplicateConflict) {
  const matches = candidates(section, source, rows)
  const missingIdentity = section === 'exam_scores' ? !hasDocumentReviewValue(source.exam) : section === 'professional_qualifications' ? !hasDocumentReviewValue(source.qualification) : !hasDocumentReviewValue(source.company)
  const ambiguous = matches.length > 1 || duplicateConflict || missingIdentity
  const choice = ambiguous ? '' : matches.length === 1 ? `existing:${matches[0].index}` : 'new'
  return { id: `${section}.${sourceIndex}`, section, sourceIndex, source: clone(source), group: `${rowName(section)} ${sourceIndex + 1}`, choice, baseRecord: choice.startsWith('existing:') ? clone(matches[0].row) : null, baseMatchingRecords: matches.map(item => clone(item.row)), reason: duplicateConflict ? 'Some extracted rows may describe the same record but provide different or incomplete details. Choose a target and approve only the intended values.' : missingIdentity ? 'The document does not identify this record clearly. Choose its target.' : matches.length > 1 ? 'Several saved records could match. Choose the correct one; none was selected automatically.' : '', options: [...rowChoices(section, rows), { value: 'new', label: `Create a new ${rowName(section).toLowerCase()} record` }] }
}
function fieldFor(path, value, group, profile, row = null, source = null) {
  const key = path.at(-1)
  const target = row ? row.choice.startsWith('existing:') ? [row.section, Number(row.choice.split(':')[1]), ...path.slice(2)] : null : path
  const current = target ? get(profile, target) : undefined
  const academicPath = path.length === 2 && path[0].startsWith('academic_') ? [path[0]] : row?.section === 'professional_qualifications' && target ? target.slice(0, 2) : null
  const currentAcademic = academicPath ? get(profile, academicPath) : undefined
  const gradeSource = source || row?.source
  return decorate({ id: path.join('.'), path, key, group, label: path[0] === 'defence_service' && key === 'branch' ? 'Service branch' : path[0] === 'defence_service' && key === 'current' ? 'Currently serving' : DOCUMENT_REVIEW_LABELS[key] || String(key).replaceAll('_', ' '), value: typeof value === 'boolean' ? value : String(value), originalValue: clone(value), current: clone(current), baseValue: clone(current), record: row, sourceScale: gradeSource?.cgpa_scale, currentScale: currentAcademic?.cgpa_scale, sourceCgpa: gradeSource?.cgpa, currentCgpa: currentAcademic?.cgpa })
}

export function buildAdmissionsDocumentReview(suggestions = {}, profile = {}) {
  const fields = [], records = [], skippedDuplicates = []
  const append = (path, value, group, row = null, source = null) => { if (path.every(safeKey) && hasDocumentReviewValue(value) && typeof value !== 'object') fields.push(fieldFor(path, value, group, profile, row, source)) }
  PERSONAL.forEach(key => append([key], suggestions[key], 'Personal information'))
  Object.entries(ACADEMIC).forEach(([section, keys]) => keys.forEach(key => append([section, key], suggestions[section]?.[key], GROUPS[section], null, suggestions[section])))
  DEFENCE.forEach(key => append(['defence_service', key], suggestions.defence_service?.[key], 'Defence service'))
  for (const section of Object.keys(ROW_FIELDS)) {
    const rows = Array.isArray(profile[section]) ? profile[section].filter(record) : []
    const sources = (Array.isArray(suggestions[section]) ? suggestions[section] : []).map((value, index) => ({ value, index })).filter(item => record(item.value))
    const unique = []
    for (const item of sources) {
      if (unique.some(previous => sameSuggestion(section, previous.value, item.value))) { skippedDuplicates.push(`${section}.${item.index}`); continue }
      unique.push(item)
    }
    for (const { value: source, index } of unique) {
      const key = identity(section, source)
      const duplicateConflict = unique.some(item => item.index !== index && (key !== null && identity(section, item.value) === key || candidates(section, source, [item.value]).length && candidates(section, item.value, [source]).length))
      const row = makeRecord(section, source, index, rows, duplicateConflict)
      records.push(row)
      ;(ROW_FIELDS[section]).forEach(key => append([section, index, key], source[key], row.group, row))
      if (section === 'exam_scores') Object.entries(record(source.section_scores) ? source.section_scores : {}).forEach(([key, value]) => append([section, index, 'section_scores', key], value, row.group, row))
    }
  }
  return { fields, records, skippedDuplicates }
}

export function retargetAdmissionsDocumentReview(model, recordId, choice, profile) {
  const row = model.records.find(item => item.id === recordId)
  if (!row || choice && !row.options.some(option => option.value === choice)) throw new Error('Choose an available record target.')
  const option = row.options.find(item => item.value === choice)
  const resolved = choice.startsWith('existing:') ? resolveExistingRecord(row.section, option.baseRecord, profile) : null
  const index = resolved?.index ?? null
  const baseRecord = resolved?.row ?? null
  const updated = { ...row, choice, baseRecord: clone(baseRecord), explicitTarget: true, baseMatchingRecords: candidates(row.section, row.source, profile[row.section] || []).map(item => clone(item.row)) }
  const fields = model.fields.map(field => {
    if (field.record?.id !== recordId) return field
    const current = index === null ? undefined : get(baseRecord, field.path.slice(2))
    return decorate({ ...field, record: updated, current: clone(current), baseValue: clone(current), ...(row.section === 'professional_qualifications' ? { currentScale: baseRecord?.cgpa_scale, currentCgpa: baseRecord?.cgpa } : {}) })
  })
  return { ...model, fields, records: model.records.map(item => item.id === recordId ? updated : item) }
}
function resolveExistingRecord(section, baseRecord, profile) {
  const rows = (Array.isArray(profile[section]) ? profile[section] : []).filter(record)
  const stableId = baseRecord?._row_id || baseRecord?._unidex_row_id || baseRecord?.id
  let matches = hasDocumentReviewValue(stableId) ? rows.map((value, index) => ({ row: value, index })).filter(item => (item.row._row_id || item.row._unidex_row_id || item.row.id) === stableId) : candidates(section, baseRecord || {}, rows)
  if (matches.length > 1) {
    const exactMatches = matches.filter(item => exact(item.row, baseRecord))
    if (exactMatches.length === 1) matches = exactMatches
  }
  if (matches.length !== 1) throw new Error('The target record changed or became ambiguous. Reopen this document review before applying it.')
  return matches[0]
}
function resolveRecord(row, profile) {
  const rows = (Array.isArray(profile[row.section]) ? profile[row.section] : []).filter(record)
  if (row.choice === '') throw new Error('Choose the correct saved record or create a new record before approving these fields.')
  if (row.choice === 'new') {
    const matches = candidates(row.section, row.source, rows)
    if (matches.some(item => !(row.baseMatchingRecords || []).some(previous => exact(previous, item.row)))) throw new Error('A matching record was added or changed after this review opened. Reopen the review to avoid creating a duplicate.')
    return { mode: 'new' }
  }
  return { mode: 'existing', index: resolveExistingRecord(row.section, row.baseRecord, profile).index }
}

export function applyAdmissionsDocumentReview(profile, model) {
  const next = clone(profile || {}), reviewedData = {}, writes = [], seen = new Map(), recordTargets = new Map()
  const selected = model.fields.filter(field => field.include && !['invalid', 'ambiguous', 'same'].includes(field.status))
  const matched = model.fields.filter(field => field.status === 'same')
  const usedRows = model.records.filter(row => selected.some(field => field.record?.id === row.id) || matched.some(field => field.record?.id === row.id))
  for (const row of usedRows) {
    const target = resolveRecord(row, profile)
    if (target.mode === 'new') {
      if (!Array.isArray(next[row.section])) next[row.section] = []
      target.index = next[row.section].length
      next[row.section].push(row.section === 'work_experience' ? { id: crypto.randomUUID() } : row.section === 'professional_qualifications' ? { _row_id: crypto.randomUUID() } : {})
    }
    recordTargets.set(row.id, target)
  }
  for (const field of [...selected, ...matched]) {
    const target = field.record ? [field.record.section, recordTargets.get(field.record.id).index, ...field.path.slice(2)] : field.path
    const latest = field.record && recordTargets.get(field.record.id).mode === 'new' ? undefined : get(profile, target)
    const value = typedValue(field)
    if (!comparableDocumentValues(field, latest, field.baseValue) && !comparableDocumentValues(field, latest, value)) throw new Error(`${field.label} changed after this review opened. Reopen the review to compare the latest saved value.`)
    if (field.status === 'same' && !comparableDocumentValues(field, latest, value)) throw new Error(`${field.label} no longer matches your profile. Reopen the review.`)
    const pathKey = target.join('.')
    if (seen.has(pathKey) && !comparableDocumentValues(field, seen.get(pathKey), value)) throw new Error(`Two selected suggestions disagree about ${field.label}. Approve only the intended value.`)
    seen.set(pathKey, value)
    if (field.include && !comparableDocumentValues(field, latest, value)) writes.push({ target, value, sourcePath: clone(field.path), originalValue: clone(field.originalValue) })
    set(reviewedData, field.path, value)
  }
  writes.forEach(({ target, value }) => set(next, target, value))
  // A CGPA and its denominator are one fact. Never attach one half of a
  // conflicting pair to a previously saved value from a different scale.
  const gradeGroups = [...Object.keys(ACADEMIC).map(section => ({ sourcePath: [section], targetPath: [section] })), ...model.records.filter(row => row.section === 'professional_qualifications' && recordTargets.has(row.id)).map(row => ({ sourcePath: [row.section, row.sourceIndex], targetPath: [row.section, recordTargets.get(row.id).index] }))]
  for (const { sourcePath, targetPath } of gradeGroups) {
    const valueField = model.fields.find(field => exact(field.path.slice(0, -1), sourcePath) && field.key === 'cgpa')
    const scaleField = model.fields.find(field => exact(field.path.slice(0, -1), sourcePath) && field.key === 'cgpa_scale')
    const valueChosen = selected.includes(valueField), scaleChosen = selected.includes(scaleField)
    if (!valueChosen && !scaleChosen) continue
    const sourceValue = valueField ? typedValue(valueField) : undefined
    const sourceScale = scaleField ? typedValue(scaleField) : undefined
    const savedValue = get(profile, targetPath)?.cgpa, savedScale = get(profile, targetPath)?.cgpa_scale
    if (valueChosen && hasDocumentReviewValue(savedScale) && !hasDocumentReviewValue(sourceScale)) throw new Error('The extracted CGPA has no confirmed grading scale. Confirm the value and grading scale together in your profile.')
    if (valueChosen && hasDocumentReviewValue(sourceScale) && Number(get(next, targetPath)?.cgpa_scale) !== Number(sourceScale)) throw new Error('Approve the CGPA and its extracted grading scale together so the saved pair stays consistent.')
    if (scaleChosen && hasDocumentReviewValue(savedValue) && (!hasDocumentReviewValue(sourceValue) || Number(get(next, targetPath)?.cgpa) !== Number(sourceValue))) throw new Error('Approve the CGPA value with its grading scale; do not attach this scale to a different saved CGPA.')
    if (scaleChosen && hasDocumentReviewValue(savedScale) && Number(savedScale) !== Number(sourceScale) && hasDocumentReviewValue(savedValue) && !valueChosen) throw new Error('Changing a CGPA denominator requires explicitly approving the CGPA value and grading scale together.')
  }
  if (Array.isArray(reviewedData.exam_scores)) reviewedData.exam_scores = reviewedData.exam_scores.filter(Boolean)
  if (Array.isArray(reviewedData.work_experience)) reviewedData.work_experience = reviewedData.work_experience.filter(Boolean)
  if (Array.isArray(reviewedData.professional_qualifications)) reviewedData.professional_qualifications = reviewedData.professional_qualifications.filter(Boolean)
  const validation = writes.length ? validateAdmissionsProfile(next) : { valid: true }
  if (!validation.valid) throw new Error(Object.values(validation.errors)[0])
  return { profile: next, reviewedData, appliedFields: writes.map(({ target, value, sourcePath, originalValue }) => ({ path: clone(target), value: clone(value), sourcePath: clone(sourcePath), originalValue: clone(originalValue) })), appliedCount: writes.length, matchedCount: matched.length, excludedCount: model.fields.length - selected.length - matched.length }
}
