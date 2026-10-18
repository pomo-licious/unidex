import { normalizeProfileOnboarding } from './admissionsOnboarding'

export const PROFILE_SCHEMA_VERSION = 1
export const PROFESSIONAL_QUALIFICATIONS = Object.freeze([
  { value: 'CA', label: 'Chartered Accountant (CA)' },
  { value: 'CS', label: 'Company Secretary (CS)' },
  { value: 'CMA', label: 'Cost and Management Accountant (CMA)' },
  { value: 'CPA', label: 'Certified Public Accountant (CPA)' },
  { value: 'ACCA', label: 'ACCA' },
  { value: 'CFA', label: 'Chartered Financial Analyst (CFA)' },
  { value: 'PhD', label: 'Doctorate / PhD' },
  { value: 'Other', label: 'Other qualification' },
])
export const MAX_PROFESSIONAL_QUALIFICATIONS = 20

const isRecord = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const recordRows = value => Array.isArray(value) ? value.filter(isRecord) : []
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PERSONAL_IMPORT_FIELDS = ['full_name', 'email', 'phone', 'date_of_birth', 'gender', 'nationality', 'current_city', 'total_work_experience_months', 'last_drawn_ctc']
const ACADEMIC_IMPORT_FIELDS = {
  academic_10th: ['board', 'school', 'year', 'percentage', 'cgpa', 'cgpa_scale'],
  academic_12th: ['board', 'school', 'year', 'percentage', 'cgpa', 'cgpa_scale', 'stream'],
  academic_graduation: ['university', 'college', 'degree', 'branch', 'year_of_passing', 'percentage', 'cgpa', 'cgpa_scale'],
}
const safeKey = value => typeof value === 'string' && !['__proto__', 'constructor', 'prototype'].includes(value)
const rowIndex = (value, max) => Number.isInteger(value) && value >= 0 && value < max
const QUALIFICATION_FIELDS = ['qualification', 'title', 'institution', 'status', 'completion_year', 'percentage', 'cgpa', 'cgpa_scale', 'field']
const DEFENCE_FIELDS = ['status', 'branch', 'rank', 'start_date', 'end_date', 'current', 'leadership_summary']
const boundedText = (value, max, multiline = false) => typeof value === 'string' ? value.replace(/\p{Cc}/gu, character => multiline && ['\n', '\t'].includes(character) ? character : '').trim().slice(0, max) : ''
const numericValue = value => typeof value === 'number' && Number.isFinite(value) || typeof value === 'string' ? value : ''
const emptyDefenceService = () => ({ status: '', branch: '', rank: '', start_date: '', end_date: '', current: null, leadership_summary: '' })

function normalizeQualification(row) {
  return {
    ...(UUID.test(row._row_id || '') ? { _row_id: row._row_id } : {}),
    qualification: PROFESSIONAL_QUALIFICATIONS.some(item => item.value === row.qualification) ? row.qualification : 'Other',
    title: boundedText(row.title, 200), institution: boundedText(row.institution, 200),
    status: ['completed', 'pursuing'].includes(row.status) ? row.status : '',
    completion_year: numericValue(row.completion_year), percentage: numericValue(row.percentage),
    cgpa: numericValue(row.cgpa), cgpa_scale: numericValue(row.cgpa_scale), field: boundedText(row.field, 200),
  }
}

function normalizeDefenceService(value) {
  if (!isRecord(value)) return emptyDefenceService()
  return {
    status: ['none', 'serving', 'veteran'].includes(value.status) ? value.status : '',
    branch: boundedText(value.branch, 120), rank: boundedText(value.rank, 120),
    start_date: boundedText(value.start_date, 10), end_date: boundedText(value.end_date, 10),
    current: typeof value.current === 'boolean' ? value.current : null, leadership_summary: boundedText(value.leadership_summary, 1000, true),
  }
}

export function isAiImportPath(path) {
  if (!Array.isArray(path) || !path.length || path.length > 4 || path.some(part => typeof part === 'string' && !safeKey(part))) return false
  const [section, index, field, key] = path
  if (path.length === 1) return PERSONAL_IMPORT_FIELDS.includes(section)
  if (path.length === 2) return section === 'defence_service' ? DEFENCE_FIELDS.includes(index) : Object.hasOwn(ACADEMIC_IMPORT_FIELDS, section) && ACADEMIC_IMPORT_FIELDS[section].includes(index)
  if (path.length === 3 && section === 'professional_qualifications' && rowIndex(index, MAX_PROFESSIONAL_QUALIFICATIONS)) return QUALIFICATION_FIELDS.includes(field)
  if (section === 'exam_scores' && rowIndex(index, 20)) {
    if (path.length === 3) return ['exam', 'exam_version', 'year', 'total_score', 'percentile'].includes(field)
    return field === 'section_scores' && safeKey(key) && /^[A-Za-z0-9_ -]{1,80}$/.test(key)
  }
  return path.length === 3 && section === 'work_experience' && rowIndex(index, 30) && ['company', 'designation', 'start_date', 'end_date', 'current', 'months', 'last_drawn_ctc'].includes(field)
}

const isImportValue = value => value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)) || (typeof value === 'string' && value.length <= 1000)
const isImportField = field => isRecord(field) && isAiImportPath(field.path) && isImportValue(field.value)
const isImportTimestamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19)

export function normalizeAiImports(value) {
  return recordRows(value).slice(-100).flatMap(entry => {
    if (!UUID.test(entry.document_id || '') || typeof entry.file_name !== 'string' || !entry.file_name.trim() || !isImportTimestamp(entry.imported_at) || typeof entry.reviewed !== 'boolean') return []
    const fields = recordRows(entry.fields).filter(isImportField).slice(0, 200).map(field => ({ path: [...field.path], value: field.value }))
    if (!fields.length) return []
    const fileName = entry.file_name.replace(/\p{Cc}/gu, '').trim().slice(0, 255)
    if (!fileName) return []
    return [{ document_id: entry.document_id, file_name: fileName, fields, imported_at: entry.imported_at, reviewed: entry.reviewed }]
  })
}

export function createEmptyProfile(user) {
  return {
    schema_version: PROFILE_SCHEMA_VERSION,
    full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
    email: user?.email || '', phone: '', date_of_birth: '', gender: '',
    nationality: 'Indian', current_city: '',
    academic_10th: { board: '', school: '', year: '', percentage: '', cgpa: '', cgpa_scale: '' },
    academic_12th: { board: '', school: '', year: '', percentage: '', cgpa: '', cgpa_scale: '', stream: '' },
    academic_graduation: { university: '', college: '', degree: '', branch: '', year_of_passing: '', cgpa: '', cgpa_scale: '', percentage: '' },
    exam_scores: [], work_experience: [], professional_qualifications: [], defence_service: emptyDefenceService(), total_work_experience_months: '', last_drawn_ctc: '',
    profile_photo_document_id: null, ai_imports: [],
    preferences: { preferred_cities: ['Delhi NCR'], max_fees_inr: '', study_mode: 'Full time', programme: 'MBA/PGDM', college_types: [], specialization: '' },
  }
}

export function normalizeAdmissionsProfile(value, user) {
  const defaults = createEmptyProfile(user)
  if (!isRecord(value)) return defaults
  return {
    ...defaults, ...value, schema_version: PROFILE_SCHEMA_VERSION,
    academic_10th: { ...defaults.academic_10th, ...(isRecord(value.academic_10th) ? value.academic_10th : {}) },
    academic_12th: { ...defaults.academic_12th, ...(isRecord(value.academic_12th) ? value.academic_12th : {}) },
    academic_graduation: { ...defaults.academic_graduation, ...(isRecord(value.academic_graduation) ? value.academic_graduation : {}) },
    exam_scores: recordRows(value.exam_scores),
    work_experience: recordRows(value.work_experience),
    professional_qualifications: recordRows(value.professional_qualifications).slice(0, MAX_PROFESSIONAL_QUALIFICATIONS).map(normalizeQualification),
    defence_service: normalizeDefenceService(value.defence_service),
    profile_photo_document_id: typeof value.profile_photo_document_id === 'string' && UUID.test(value.profile_photo_document_id) ? value.profile_photo_document_id : null,
    ai_imports: normalizeAiImports(value.ai_imports),
    ...(Object.hasOwn(value, 'onboarding') ? { onboarding: normalizeProfileOnboarding(value.onboarding) } : {}),
    preferences: { ...defaults.preferences, ...(isRecord(value.preferences) ? value.preferences : {}) },
  }
}

const present = value => value !== null && value !== undefined && String(value).trim() !== ''
export const hasProfileValue = present

export function hasWorkExperience(profile = {}) {
  return Number(profile.total_work_experience_months) > 0
    || recordRows(profile.work_experience).some(job => Number(job.months) > 0 || present(job.company) || present(job.designation) || present(job.start_date))
    || ['serving', 'veteran'].includes(profile.defence_service?.status)
}

export function getLastDrawnCtc(profile = {}) {
  const valid = value => (typeof value === 'number' || typeof value === 'string') && present(value) && Number.isFinite(Number(value)) && Number(value) >= 0
  if (valid(profile.last_drawn_ctc)) return Number(profile.last_drawn_ctc)
  const latest = recordRows(profile.work_experience).map((job, index) => ({ job, index })).sort((a, b) => Number(Boolean(b.job.current)) - Number(Boolean(a.job.current)) || String(b.job.end_date || b.job.start_date || '').localeCompare(String(a.job.end_date || a.job.start_date || '')) || b.index - a.index)[0]?.job
  return valid(latest?.last_drawn_ctc) ? Number(latest.last_drawn_ctc) : null
}

export const hasLastDrawnCtc = profile => getLastDrawnCtc(profile) !== null

export function getProfileProgress(profile = {}) {
  profile = normalizeAdmissionsProfile(profile)
  const marks = academic => present(academic?.percentage) || present(academic?.cgpa)
  const sections = [
    { key: 'personal', label: 'Personal details', complete: Boolean(profile.full_name && profile.email && profile.phone && profile.current_city) },
    { key: 'school', label: 'School academics', complete: marks(profile.academic_10th) && marks(profile.academic_12th) },
    { key: 'graduation', label: 'Graduation', complete: Boolean(profile.academic_graduation?.degree && marks(profile.academic_graduation)) },
    { key: 'exams', label: 'Entrance exams', complete: (profile.exam_scores || []).some(exam => exam.exam && (present(exam.percentile) || present(exam.total_score))) },
    { key: 'experience', label: 'Experience', complete: (present(profile.total_work_experience_months) || (profile.work_experience || []).some(job => job.company && job.designation) || ['serving', 'veteran'].includes(profile.defence_service.status)) && (!hasWorkExperience(profile) || hasLastDrawnCtc(profile)) },
    { key: 'preferences', label: 'Your preferences', complete: Boolean(profile.preferences?.programme && profile.preferences?.study_mode) },
  ]
  const completed = sections.filter(section => section.complete).length
  return { score: Math.round(completed / sections.length * 100), percentage: Math.round(completed / sections.length * 100), completed, total: sections.length, sections }
}

export function validateAdmissionsProfile(profile = {}, { submission = false, requireGraduation = true } = {}) {
  const original = profile
  profile = normalizeAdmissionsProfile(profile)
  const errors = {}
  if (original?.professional_qualifications !== undefined && (!Array.isArray(original.professional_qualifications) || original.professional_qualifications.length > MAX_PROFESSIONAL_QUALIFICATIONS || original.professional_qualifications.some(row => !isRecord(row)))) errors.professional_qualifications = `Add up to ${MAX_PROFESSIONAL_QUALIFICATIONS} valid qualification records.`
  if (original?.defence_service !== undefined && !isRecord(original.defence_service)) errors.defence_service = 'Check your defence service details.'
  if (original?.profile_photo_document_id != null && original.profile_photo_document_id !== '' && (typeof original.profile_photo_document_id !== 'string' || !UUID.test(original.profile_photo_document_id))) errors.profile_photo_document_id = 'Choose an uploaded profile photograph.'
  if (original?.ai_imports !== undefined && (!Array.isArray(original.ai_imports) || original.ai_imports.length > 100 || original.ai_imports.some(entry => !isRecord(entry) || !UUID.test(entry.document_id || '') || typeof entry.file_name !== 'string' || !entry.file_name.trim() || entry.file_name.length > 255 || !isImportTimestamp(entry.imported_at) || typeof entry.reviewed !== 'boolean' || !Array.isArray(entry.fields) || !entry.fields.length || entry.fields.length > 200 || entry.fields.some(field => !isImportField(field))))) errors.ai_imports = 'AI import history is invalid or too large. Reload the latest profile before saving.'
  const numberInRange = (value, min, max, path, label) => {
    if (present(value) && (!Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max)) errors[path] = `${label} must be between ${min} and ${max}.`
  }
  const typedNumber = (value, min, max, path, label, integer = false) => {
    if (value === undefined || value === null || value === '') return
    if (!['string', 'number'].includes(typeof value) || typeof value === 'string' && !value.trim()) errors[path] = `Enter a valid ${label.toLowerCase()}.`
    else { numberInRange(value, min, max, path, label); if (integer && present(value) && !Number.isInteger(Number(value))) errors[path] = `${label} must be a whole number.` }
  }
  const textField = (value, max, path, label, multiline = false) => {
    if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > max || /\p{Cc}/u.test(multiline ? value.replace(/[\n\t]/g, '') : value))) errors[path] = `${label} must be text of up to ${max} characters.`
  }
  const validDate = value => typeof value === 'string' && (/^\d{4}-\d{2}$/.test(value) && Number(value.slice(5)) >= 1 && Number(value.slice(5)) <= 12 || /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value)
  const qualificationRowIds = new Set()
  recordRows(original?.professional_qualifications).slice(0, MAX_PROFESSIONAL_QUALIFICATIONS).forEach((row, index) => {
    const path = `professional_qualifications.${index}`
    if (row._row_id != null && !UUID.test(row._row_id)) errors[`${path}._row_id`] = 'Reload this qualification before saving.'
    if (row._row_id && qualificationRowIds.has(row._row_id)) errors[`${path}._row_id`] = 'This qualification has a duplicate row identity. Remove the duplicate record before saving.'
    qualificationRowIds.add(row._row_id)
    if (row.qualification !== undefined && !PROFESSIONAL_QUALIFICATIONS.some(item => item.value === row.qualification)) errors[`${path}.qualification`] = 'Choose the qualification type.'
    if (row.status !== undefined && !['', 'completed', 'pursuing'].includes(row.status)) errors[`${path}.status`] = 'Choose completed or pursuing.'
    for (const field of ['title', 'institution', 'field']) textField(row[field], 200, `${path}.${field}`, 'Qualification detail')
    typedNumber(row.completion_year, 1950, new Date().getUTCFullYear() + (row.status === 'pursuing' ? 10 : 0), `${path}.completion_year`, 'Qualification year', true)
    typedNumber(row.percentage, 0, 100, `${path}.percentage`, 'Percentage')
    typedNumber(row.cgpa, 0, 20, `${path}.cgpa`, 'CGPA')
    typedNumber(row.cgpa_scale, 1, 100, `${path}.cgpa_scale`, 'CGPA grading scale')
    if (present(row.cgpa) && present(row.cgpa_scale) && Number(row.cgpa) > Number(row.cgpa_scale)) errors[`${path}.cgpa`] = 'CGPA cannot exceed its recorded grading scale.'
  })
  if (isRecord(original?.defence_service)) {
    const service = original.defence_service
    if (service.status !== undefined && !['', 'none', 'serving', 'veteran'].includes(service.status)) errors['defence_service.status'] = 'Choose your defence service status.'
    for (const field of ['branch', 'rank']) textField(service[field], 120, `defence_service.${field}`, 'Service detail')
    textField(service.leadership_summary, 1000, 'defence_service.leadership_summary', 'Service experience', true)
    if (service.current !== undefined && service.current !== null && typeof service.current !== 'boolean') errors['defence_service.current'] = 'Check whether you are currently serving.'
    for (const field of ['start_date', 'end_date']) if (present(service[field]) && !validDate(service[field])) errors[`defence_service.${field}`] = 'Enter a valid service date.'
    if (validDate(service.start_date) && validDate(service.end_date) && (service.start_date.length === 7 || service.end_date.length === 7 ? service.end_date.slice(0, 7) < service.start_date.slice(0, 7) : service.end_date < service.start_date)) errors['defence_service.end_date'] = 'End date must follow start date.'
    if (service.status === 'veteran' && service.current === true) errors['defence_service.current'] = 'Choose serving if you are currently in service.'
    if (service.status === 'serving' && service.current === false) errors['defence_service.current'] = 'Check your current service status.'
  }
  if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) errors.email = 'Enter a valid email address.'
  if (profile.phone && !/^\+?[\d\s()-]{7,22}$/.test(profile.phone)) errors.phone = 'Enter a valid phone number, including country code where needed.'
  for (const key of ['academic_10th', 'academic_12th', 'academic_graduation']) {
    numberInRange(profile[key]?.percentage, 0, 100, `${key}.percentage`, 'Percentage')
    numberInRange(profile[key]?.cgpa, 0, 20, `${key}.cgpa`, 'CGPA on your institution’s scale')
    numberInRange(profile[key]?.cgpa_scale, 1, 100, `${key}.cgpa_scale`, 'CGPA grading scale')
    if (present(profile[key]?.cgpa) && present(profile[key]?.cgpa_scale) && Number.isFinite(Number(profile[key].cgpa)) && Number.isFinite(Number(profile[key].cgpa_scale)) && Number(profile[key].cgpa) > Number(profile[key].cgpa_scale)) errors[`${key}.cgpa`] = 'CGPA cannot exceed its recorded grading scale.'
    const yearKey = key === 'academic_graduation' ? 'year_of_passing' : 'year'
    numberInRange(profile[key]?.[yearKey], 1950, new Date().getUTCFullYear() + 6, `${key}.${yearKey}`, 'Academic year')
  }
  numberInRange(profile.total_work_experience_months, 0, 720, 'total_work_experience_months', 'Experience in months')
  numberInRange(profile.last_drawn_ctc, 0, 1e10, 'last_drawn_ctc', 'Annual CTC in INR')
  numberInRange(profile.preferences?.max_fees_inr, 0, 1e9, 'preferences.max_fees_inr', 'Budget in INR')
  ;(profile.exam_scores || []).forEach((exam, index) => {
    if (exam.exam_version != null && !['', 'focus', 'classic'].includes(exam.exam_version)) errors[`exam_scores.${index}.exam_version`] = 'Choose the GMAT edition printed on your result.'
    numberInRange(exam.percentile, 0, 100, `exam_scores.${index}.percentile`, 'Exam percentile')
    numberInRange(exam.total_score, 0, 2000, `exam_scores.${index}.total_score`, 'Exam score')
    if ((present(exam.percentile) || present(exam.total_score)) && !exam.exam) errors[`exam_scores.${index}.exam`] = 'Choose the exam for this score.'
  })
  ;(profile.work_experience || []).forEach((job, index) => {
    numberInRange(job.months, 0, 720, `work_experience.${index}.months`, 'Role experience in months')
    numberInRange(job.last_drawn_ctc, 0, 1e10, `work_experience.${index}.last_drawn_ctc`, 'Role annual CTC in INR')
    if (job.start_date && job.end_date && (job.start_date.length === 7 || job.end_date.length === 7 ? job.end_date.slice(0, 7) < job.start_date.slice(0, 7) : job.end_date < job.start_date)) errors[`work_experience.${index}.end_date`] = 'End date must follow start date.'
  })
  if (submission) {
    if (hasWorkExperience(profile) && !hasLastDrawnCtc(profile)) errors.last_drawn_ctc = 'Add your last drawn annual CTC in INR if you have work experience.'
    if (!profile.full_name?.trim()) errors.full_name = 'Add your full name.'
    if (!profile.email?.trim()) errors.email = 'Add your email address.'
    if (!profile.phone?.trim()) errors.phone = 'Add your phone number.'
    if (!profile.current_city?.trim()) errors.current_city = 'Add your current city.'
    if (requireGraduation !== false) {
      if (!profile.academic_graduation?.degree?.trim()) errors['academic_graduation.degree'] = 'Add your graduation degree.'
      if (!present(profile.academic_graduation?.percentage) && !present(profile.academic_graduation?.cgpa)) errors['academic_graduation.percentage'] = 'Add your graduation percentage or CGPA.'
    }
  }
  return { valid: Object.keys(errors).length === 0, errors }
}

export function formatInr(value) {
  if (!present(value) || !Number.isFinite(Number(value))) return 'Not confirmed'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
}
