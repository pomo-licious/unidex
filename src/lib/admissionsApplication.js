import { DELHI_NCR_COLLEGES } from '../data/delhiNcrColleges.js'
import { hasCompletedProfessionalEntryRoute } from './admissionsMatching.js'
import { validateAdmissionsProfile } from './admissionsProfile.js'

const isRecord = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const institutionId = college => college?.id || college?.college_id || 'unknown-college'
const selectedId = college => college?.selectedProgrammeId || college?.programme_key || college?.programme_id || college?.selected_programme?.id || college?.representativeProgrammeId || null
const sourceUrl = value => {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null } catch { return null }
}
const hasAnswer = value => value !== null && value !== undefined && (typeof value !== 'string' || value.trim() !== '') && (!Array.isArray(value) || value.length > 0)
const optionValues = field => (Array.isArray(field.options) ? field.options : []).map(option => isRecord(option) ? option.value : option)
const allowedOption = (value, options) => options.some(option => typeof value !== 'object' && value !== null && String(option) === String(value))

// Prefer current sourced programme facts over a saved institution's older
// representative fields. An explicit unknown programme must remain unknown.
export function programmeForSnapshot(college, catalogue = DELHI_NCR_COLLEGES) {
  if (!isRecord(college)) return null
  const current = catalogue.find(item => item.id === institutionId(college))
  const programmeId = selectedId(college) || current?.representativeProgrammeId || college.selected_programme?.id || null
  const candidates = Array.isArray(current?.programmes) ? current.programmes : Array.isArray(college.programmes) ? college.programmes : []
  if (programmeId) {
    return candidates.find(programme => programme.id === programmeId)
      || (!current && college.selected_programme?.id === programmeId ? college.selected_programme : null)
  }
  return null
}

// An institution's stale snapshot cannot establish an alternative entry route.
// Require an explicit selection still present in the current programme list,
// and a current sourced completed-qualification route for every selection.
export function validateAdmissionsApplicationProfile(profile, colleges, catalogue = DELHI_NCR_COLLEGES) {
  const selections = Array.isArray(colleges) ? colleges : []
  const alternativeEntry = selections.length > 0 && selections.every(college => {
    const current = catalogue.find(item => item.id === institutionId(college))
    const programmeId = college?.selectedProgrammeId || college?.programme_key || college?.programme_id || college?.selected_programme?.id
    const programme = programmeId && current?.programmes?.find(item => item.id === programmeId)
    return Boolean(programme && hasCompletedProfessionalEntryRoute(profile, programme))
  })
  return validateAdmissionsProfile(profile, { submission: true, requireGraduation: !alternativeEntry })
}

export function answerKey(college) {
  const programmeId = selectedId(college) || college?.selected_programme?.id || 'unconfirmed'
  return `${institutionId(college)}:${programmeId}`
}

export function deadlineFor(college, catalogue = DELHI_NCR_COLLEGES) {
  const programme = programmeForSnapshot(college, catalogue)
  const deadline = programme?.deadline
  const date = deadline?.date
  const validDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(new Date(`${date}T00:00:00Z`).getTime())
    && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date
  if (deadline?.verificationStatus === 'verified_current_cycle' && validDate && sourceUrl(deadline.sourceUrl)) return deadline
  return {
    ...(isRecord(deadline) ? deadline : {}), date: null,
    label: 'Confirm the current application deadline with the institution',
    verificationStatus: 'confirmation_required',
    sourceUrl: sourceUrl(deadline?.sourceUrl || college?.applicationUrl || college?.website),
    timeZone: deadline?.timeZone || 'Asia/Kolkata',
  }
}

export function specificFields(college, catalogue = DELHI_NCR_COLLEGES) {
  const programme = programmeForSnapshot(college, catalogue)
  const fields = Array.isArray(programme?.specificFields) ? programme.specificFields : []
  return fields.filter(field => isRecord(field) && typeof field.key === 'string' && field.key && field.label)
    .map(field => ({ ...field, required: Boolean(field.required && sourceUrl(field.sourceUrl)) }))
}

// Capturing a draft does not submit to an institution. Validate only the
// sourced field definitions for the exact selected programme and answer key.
export function validateCollegeAnswers(colleges, answers = {}, catalogue = DELHI_NCR_COLLEGES) {
  const errors = {}
  for (const college of Array.isArray(colleges) ? colleges : []) {
    const key = answerKey(college)
    const values = isRecord(answers?.[key]) ? answers[key] : {}
    for (const field of specificFields(college, catalogue)) {
      const value = values[field.key]
      const path = `${key}.${field.key}`
      const label = `“${field.label}” for ${college.name || 'the selected programme'}`
      if (field.type === 'checkbox') {
        if (field.required && value !== true) errors[path] = `Confirm ${label}.`
        else if (hasAnswer(value) && typeof value !== 'boolean') errors[path] = `Use the checkbox to answer ${label}.`
        continue
      }
      if (!hasAnswer(value)) {
        if (field.required) errors[path] = `Complete ${label}.`
        continue
      }
      if (field.type === 'multiselect') {
        if (!Array.isArray(value) || !value.every(item => allowedOption(item, optionValues(field)))) errors[path] = `Choose the listed options for ${label}.`
      } else if (field.type === 'select') {
        if (Array.isArray(value) || !allowedOption(value, optionValues(field))) errors[path] = `Choose a listed option for ${label}.`
      } else if (typeof value === 'object') {
        errors[path] = `Enter a single value for ${label}.`
      } else if (field.type === 'number' && !Number.isFinite(Number(value))) {
        errors[path] = `Enter a valid number for ${label}.`
      }
    }
  }
  return { valid: Object.keys(errors).length === 0, errors }
}
