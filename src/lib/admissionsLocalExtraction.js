// The persistence boundary accepts supported profile facts only. Neither OCR
// text, identity numbers, diagnostics nor arbitrary model keys reach the DB.
import { scopeAdmissionsDocumentSuggestions } from '../../supabase/functions/admissions-ai-extract/documentTargets.js'

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const identityTypes = new Set(['pan_card', 'aadhaar_card', 'passport', 'government_id'])
const idNumber = /\b(?:[A-Z]{5}\d{4}[A-Z]|[A-Z]\d{7}|\d{4}[ -]?\d{4}[ -]?\d{4})\b/i
function text(value, max = 300) {
  if (typeof value !== 'string' || value.length > max || idNumber.test(value)) return undefined
  // Strip control characters from bounded fields, not raw document text.
  // eslint-disable-next-line no-control-regex
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().replace(/\s+/g, ' ')
  return clean || undefined
}
function number(value, max, min = 0, integer = false) {
  if (value === '' || value === null || typeof value === 'boolean' || typeof value === 'object') return undefined
  const result = Number(value)
  return Number.isFinite(result) && result >= min && result <= max && (!integer || Number.isInteger(result)) ? result : undefined
}
function date(value, month = false) {
  if (typeof value !== 'string') return undefined
  if (month && /^\d{4}-\d{2}$/.test(value) && Number(value.slice(5)) >= 1 && Number(value.slice(5)) <= 12 && value <= new Date().toISOString().slice(0, 7)) return value
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const parsed = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value <= new Date().toISOString().slice(0, 10) ? value : undefined
}
const academicText = { academic_10th: ['board', 'school'], academic_12th: ['board', 'school', 'stream'], academic_graduation: ['university', 'college', 'degree', 'branch'] }
const year = value => number(value, new Date().getUTCFullYear() + 6, 1950, true)
function put(target, key, value) { if (value !== undefined) target[key] = value }
export function sanitizeLocalAdmissionsExtraction(value, documentType) {
  if (!record(value)) throw new Error('Extracted suggestions must be an object.')
  value = scopeAdmissionsDocumentSuggestions(value, documentType)
  const result = {}, identity = identityTypes.has(documentType)
  for (const key of ['full_name', 'nationality', 'current_city', ...identity ? [] : ['gender']]) {
    const candidate = text(value[key])
    if (candidate && (key !== 'full_name' && !identity || !/\d/.test(candidate))) result[key] = candidate
  }
  put(result, 'date_of_birth', date(value.date_of_birth))
  if (identity) return result
  const email = text(value.email, 254)
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) result.email = email
  const phone = typeof value.phone === 'string' ? value.phone.trim() : ''
  const phoneDigits = phone.replace(/\D/g, '')
  const indianInternational = /^\+91[\s()-]*[6-9]/.test(phone) && phoneDigits.length === 12
  if (/^\+?[\d ()-]{7,22}$/.test(phone) && phoneDigits.length >= 7 && phoneDigits.length <= 15 && (phoneDigits.length !== 12 || indianInternational)) result.phone = phone
  put(result, 'total_work_experience_months', number(value.total_work_experience_months, 720))
  put(result, 'last_drawn_ctc', number(value.last_drawn_ctc, 1e10))
  for (const [section, keys] of Object.entries(academicText)) {
    if (!record(value[section])) continue
    const source = Object.fromEntries(Object.entries(value[section])), row = {}
    for (const key of keys) put(row, key, text(source[key]))
    const yearKey = section === 'academic_graduation' ? 'year_of_passing' : 'year'
    put(row, yearKey, year(source[yearKey]))
    put(row, 'percentage', number(source.percentage, 100))
    const cgpa = number(source.cgpa, 20), scale = number(source.cgpa_scale, 100, 0.01)
    if (cgpa !== undefined && scale !== undefined && cgpa <= scale) { row.cgpa = cgpa; row.cgpa_scale = scale }
    if (Object.keys(row).length) result[section] = row
  }
  if (Array.isArray(value.exam_scores)) {
    const rows = value.exam_scores.slice(0, 20).filter(record).map(input => {
      const source = Object.fromEntries(Object.entries(input)), row = {}
      put(row, 'exam', text(source.exam, 80)); put(row, 'year', year(source.year))
      put(row, 'total_score', number(source.total_score, 2000)); put(row, 'percentile', number(source.percentile, 100))
      if (record(source.section_scores)) {
        const scores = {}
        for (const [key, score] of Object.entries(source.section_scores).slice(0, 20)) if (/^[a-zA-Z][a-zA-Z0-9_ -]{0,49}$/.test(key) && !['constructor', 'prototype', '__proto__'].includes(key)) put(scores, key, number(score, 2000))
        if (Object.keys(scores).length) row.section_scores = scores
      }
      return row
    }).filter(row => row.exam && Object.keys(row).length > 1)
    if (rows.length) result.exam_scores = rows
  }
  if (Array.isArray(value.work_experience)) {
    const rows = value.work_experience.slice(0, 30).filter(record).map(input => {
      const source = Object.fromEntries(Object.entries(input)), row = {}
      for (const key of ['company', 'designation']) put(row, key, text(source[key]))
      for (const key of ['start_date', 'end_date']) put(row, key, date(source[key], true))
      if (typeof source.current === 'boolean') row.current = source.current
      put(row, 'months', number(source.months, 720)); put(row, 'last_drawn_ctc', number(source.last_drawn_ctc, 1e10))
      return row
    }).filter(row => row.company)
    if (rows.length) result.work_experience = rows
  }
  return result
}
