import { normalizeProfileOnboarding } from './admissionsOnboarding'

export const PROFILE_SCHEMA_VERSION = 1

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

export function isAiImportPath(path) {
  if (!Array.isArray(path) || !path.length || path.length > 4 || path.some(part => typeof part === 'string' && !safeKey(part))) return false
  const [section, index, field, key] = path
  if (path.length === 1) return PERSONAL_IMPORT_FIELDS.includes(section)
  if (path.length === 2) return Object.hasOwn(ACADEMIC_IMPORT_FIELDS, section) && ACADEMIC_IMPORT_FIELDS[section].includes(index)
  if (section === 'exam_scores' && rowIndex(index, 20)) {
    if (path.length === 3) return ['exam', 'year', 'total_score', 'percentile'].includes(field)
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
    exam_scores: [], work_experience: [], total_work_experience_months: '', last_drawn_ctc: '',
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
    profile_photo_document_id: typeof value.profile_photo_document_id === 'string' && UUID.test(value.profile_photo_document_id) ? value.profile_photo_document_id : null,
    ai_imports: normalizeAiImports(value.ai_imports),
    ...(Object.hasOwn(value, 'onboarding') ? { onboarding: normalizeProfileOnboarding(value.onboarding) } : {}),
    preferences: { ...defaults.preferences, ...(isRecord(value.preferences) ? value.preferences : {}) },
  }
}

const present = value => value !== null && value !== undefined && String(value).trim() !== ''
export const hasProfileValue = present

export function getProfileProgress(profile = {}) {
  profile = normalizeAdmissionsProfile(profile)
  const marks = academic => present(academic?.percentage) || present(academic?.cgpa)
  const sections = [
    { key: 'personal', label: 'Personal details', complete: Boolean(profile.full_name && profile.email && profile.phone && profile.current_city) },
    { key: 'school', label: 'School academics', complete: marks(profile.academic_10th) && marks(profile.academic_12th) },
    { key: 'graduation', label: 'Graduation', complete: Boolean(profile.academic_graduation?.degree && marks(profile.academic_graduation)) },
    { key: 'exams', label: 'Entrance exams', complete: (profile.exam_scores || []).some(exam => exam.exam && (present(exam.percentile) || present(exam.total_score))) },
    { key: 'experience', label: 'Experience', complete: present(profile.total_work_experience_months) || (profile.work_experience || []).some(job => job.company && job.designation) },
    { key: 'preferences', label: 'Your preferences', complete: Boolean(profile.preferences?.programme && profile.preferences?.study_mode) },
  ]
  const completed = sections.filter(section => section.complete).length
  return { score: Math.round(completed / sections.length * 100), percentage: Math.round(completed / sections.length * 100), completed, total: sections.length, sections }
}

export function validateAdmissionsProfile(profile = {}, { submission = false } = {}) {
  const original = profile
  profile = normalizeAdmissionsProfile(profile)
  const errors = {}
  if (original?.profile_photo_document_id != null && original.profile_photo_document_id !== '' && (typeof original.profile_photo_document_id !== 'string' || !UUID.test(original.profile_photo_document_id))) errors.profile_photo_document_id = 'Choose an uploaded profile photograph.'
  if (original?.ai_imports !== undefined && (!Array.isArray(original.ai_imports) || original.ai_imports.length > 100 || original.ai_imports.some(entry => !isRecord(entry) || !UUID.test(entry.document_id || '') || typeof entry.file_name !== 'string' || !entry.file_name.trim() || entry.file_name.length > 255 || !isImportTimestamp(entry.imported_at) || typeof entry.reviewed !== 'boolean' || !Array.isArray(entry.fields) || !entry.fields.length || entry.fields.length > 200 || entry.fields.some(field => !isImportField(field))))) errors.ai_imports = 'AI import history is invalid or too large. Reload the latest profile before saving.'
  const numberInRange = (value, min, max, path, label) => {
    if (present(value) && (!Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max)) errors[path] = `${label} must be between ${min} and ${max}.`
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
    if (!profile.full_name?.trim()) errors.full_name = 'Add your full name.'
    if (!profile.email?.trim()) errors.email = 'Add your email address.'
    if (!profile.phone?.trim()) errors.phone = 'Add your phone number.'
    if (!profile.current_city?.trim()) errors.current_city = 'Add your current city.'
    if (!profile.academic_graduation?.degree?.trim()) errors['academic_graduation.degree'] = 'Add your graduation degree.'
    if (!present(profile.academic_graduation?.percentage) && !present(profile.academic_graduation?.cgpa)) errors['academic_graduation.percentage'] = 'Add your graduation percentage or CGPA.'
  }
  return { valid: Object.keys(errors).length === 0, errors }
}

export function formatInr(value) {
  if (!present(value) || !Number.isFinite(Number(value))) return 'Not confirmed'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
}
