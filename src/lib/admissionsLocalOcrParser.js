// Deliberately conservative: only printed, labelled facts become suggestions.
// No raw OCR text or government identity numbers leave this parser.
const ID_TYPES = new Set(['pan_card', 'aadhaar_card', 'passport', 'government_id'])
const ACADEMIC_TYPES = new Set(['academic_10th', 'academic_12th', 'academic_graduation'])
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const EXAMS = ['CUET-PG', 'GMAT', 'NMAT', 'CMAT', 'SNAP', 'ATMA', 'CAT', 'XAT', 'MAT', 'GRE', 'SAT']
const clean = value => String(value || '').replace(/\p{Cc}/gu, '').replace(/\s+/g, ' ').trim()
const identityNumber = value => /\b[A-Z]{5}[0-9]{4}[A-Z]\b|\b[A-Z][0-9]{7}\b|(?:\d[ -]?){12}/i.test(value)
const validWords = value => value && value.length <= 180 && !identityNumber(value) && !/\d/.test(value) && /\p{L}/u.test(value) && /^[\p{L}\p{M} .,'’()&/-]+$/u.test(value)
const numeric = (value, min, max) => /^\d+(?:\.\d+)?$/.test(clean(value)) && Number(value) >= min && Number(value) <= max ? Number(value) : null
const single = values => {
  const unique = [...new Map(values.filter(value => value !== null && value !== undefined && value !== '').map(value => [String(value).trim().toLowerCase(), value])).values()]
  return unique.length === 1 ? unique[0] : null
}

export function parsePrintedDate(input, { monthAllowed = false } = {}) {
  const value = clean(input).replace(/,/g, '')
  let parts
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(value)) parts = value.split(/[-/]/).map(Number)
  else if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(value)) {
    const [a, b, year] = value.split(/[-/.]/).map(Number)
    // Indian DD/MM/YYYY is not assumed for ambiguous purely numeric dates.
    if (a <= 12 && b <= 12 && a !== b) return null
    parts = b > 12 ? [year, a, b] : [year, b, a]
  } else {
    const match = value.match(/^(\d{1,2})[ -]([A-Za-z]{3,9})[ -](\d{4})$/)
    const reverse = value.match(/^([A-Za-z]{3,9})[ -](\d{1,2})[ -](\d{4})$/)
    if (match) parts = [Number(match[3]), MONTHS[match[2].slice(0, 3).toLowerCase()], Number(match[1])]
    else if (reverse) parts = [Number(reverse[3]), MONTHS[reverse[1].slice(0, 3).toLowerCase()], Number(reverse[2])]
    else if (monthAllowed) {
      const month = value.match(/^(\d{4})-(\d{2})$/)
      const named = value.match(/^([A-Za-z]{3,9})[ -](\d{4})$/)
      if (month) parts = [Number(month[1]), Number(month[2]), 1]
      else if (named) parts = [Number(named[2]), MONTHS[named[1].slice(0, 3).toLowerCase()], 1]
      if (parts?.[1] >= 1 && parts[1] <= 12 && parts[0] >= 1900 && parts[0] <= 2100) return `${parts[0]}-${String(parts[1]).padStart(2, '0')}`
    }
  }
  if (!parts || parts.some(part => !Number.isInteger(part)) || parts[0] < 1900 || parts[0] > 2100) return null
  const result = `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`
  const date = new Date(`${result}T00:00:00Z`)
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === result ? result : null
}

function linesOf(text) {
  return String(text || '').slice(0, 150_000).split(/\r?\n/).map(clean).filter(Boolean)
}
function labelled(lines, labels) {
  const expression = new RegExp(`^(?:${labels})\\s*(?:[:：=|–—-]\\s*|$)(.*)$`, 'i')
  const values = []
  lines.forEach((line, index) => {
    const match = line.match(expression)
    if (!match) return
    const value = clean(match[1] || lines[index + 1])
    if (value && !identityNumber(value) && !/^[^:：=]{1,70}[:：=]/.test(value)) values.push(value)
  })
  return values
}
const pick = (lines, labels, transform = clean) => single(labelled(lines, labels).map(transform))
const year = value => /^\d{4}$/.test(value) && Number(value) >= 1950 && Number(value) <= new Date().getUTCFullYear() + 6 ? Number(value) : null
const percentage = value => numeric(value.replace(/\s*%$/, ''), 0, 100)

function academicFacts(lines, category) {
  const isGraduation = category === 'academic_graduation'
  const result = {}
  for (const [field, labels] of isGraduation ? [['university', '(?:name of (?:the )?)?university'], ['college', '(?:name of (?:the )?)?(?:college|institution)'], ['degree', '(?:degree|qualification|programme|program)'], ['branch', '(?:branch|speciali[sz]ation)']] : [['board', '(?:(?:name of (?:the )?)?board|board of (?:secondary|senior secondary) education)'], ['school', '(?:name of (?:the )?)?(?:school|institution)'], ...(category === 'academic_12th' ? [['stream', '(?:stream|group)']] : [])]) {
    const value = pick(lines, labels, value => value.length <= 200 && !identityNumber(value) ? value : null)
    if (value) result[field] = value
  }
  const completionYear = pick(lines, '(?:(?:year of )?(?:passing|completion)|(?:passing|completion) year|examination year|exam year|year)', year)
  if (completionYear) result[isGraduation ? 'year_of_passing' : 'year'] = completionYear
  const marks = pick(lines, '(?:(?:overall|aggregate|final|total) )?(?:percentage|percentage of marks|marks percentage)|(?:overall|aggregate|final|total) marks percentage', percentage)
  if (marks !== null) result.percentage = marks
  const cgpas = labelled(lines, '(?:cumulative grade point average|cumulative gpa|overall cgpa|final cgpa|cgpa|gpa)')
  const cgpa = single(cgpas.map(value => {
    const match = value.match(/^(\d+(?:\.\d+)?)(?:\s*(?:\/|out of|on a scale of)\s*(\d+(?:\.\d+)?))?$/i)
    return match ? numeric(match[1], 0, 20) : null
  }))
  const scale = single([...cgpas.map(value => {
    const match = value.match(/^\d+(?:\.\d+)?\s*(?:\/|out of|on a scale of)\s*(\d+(?:\.\d+)?)$/i)
    return match ? numeric(match[1], 1, 100) : null
  }), ...labelled(lines, '(?:cgpa (?:grading )?scale|gpa scale|grading scale)').map(value => numeric(value, 1, 100))])
  if (cgpa !== null && (scale === null || cgpa <= scale)) result.cgpa = cgpa
  if (scale !== null && (cgpa === null || cgpa <= scale)) result.cgpa_scale = scale
  return result
}

function examFacts(lines) {
  const text = lines.join('\n')
  const names = EXAMS.filter(exam => new RegExp(`\\b${exam}\\b`, 'i').test(text))
  // Mixed scorecards need separate reviews; never assign one score to many exams.
  if (names.length !== 1) return []
  const row = { exam: names[0], section_scores: {} }
  const printedYear = pick(lines, '(?:exam(?:ination)? year|test year|year)', year)
  const headingYears = lines.slice(0, 6).flatMap(line => new RegExp(`\\b${names[0]}\\s*[-:]?\\s*(20\\d{2})\\b`, 'i').exec(line)?.[1] || [])
  const examYear = single([printedYear, ...headingYears.map(year)])
  if (examYear) row.year = examYear
  const score = pick(lines, '(?:(?:overall|total) (?:scaled )?score|scaled score|composite score)', value => numeric(value, 0, 2000))
  const rank = pick(lines, '(?:(?:overall|total) percentile|percentile rank|overall percentile rank)', percentage)
  if (score !== null) row.total_score = score
  if (rank !== null) row.percentile = rank
  const sectionCandidates = new Map()
  for (const line of lines) {
    const match = line.match(/^(VARC|DILR|QA|verbal(?: reasoning)?|quantitative(?: reasoning)?|data insights|analytical writing|reading and writing|math(?:ematics)?)\s+(?:(scaled)\s+)?(score|percentile)\s*[:=|–—-]\s*(\d+(?:\.\d+)?)\s*%?$/i)
    if (!match) continue
    const value = numeric(match[4], 0, match[3].toLowerCase() === 'percentile' ? 100 : 1000)
    const key = `${match[1].toUpperCase()} ${match[3].toLowerCase()}`
    if (!sectionCandidates.has(key)) sectionCandidates.set(key, [])
    if (value !== null) sectionCandidates.get(key).push(value)
  }
  for (const [key, values] of sectionCandidates) { const value = single(values); if (value !== null) row.section_scores[key] = value }
  return score !== null || rank !== null || Object.keys(row.section_scores).length ? [row] : []
}

function annualCtc(value) {
  const match = clean(value).match(/^(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d+)?)\s*(lakh(?:s)?|lac(?:s)?|crore(?:s)?|LPA)?\s*(?:per annum|p\.?a\.?|annual(?:ly)?|\/\s*(?:year|yr))?$/i)
  if (!match || !/(?:LPA|per annum|p\.?a\.?|annual|\/\s*(?:year|yr))/i.test(value)) return null
  const n = Number(match[1].replace(/,/g, '')) * (/^(?:lakh|lac|LPA)/i.test(match[2] || '') ? 100_000 : /^crore/i.test(match[2] || '') ? 10_000_000 : 1)
  return Number.isFinite(n) && n >= 0 && n <= 1e10 ? n : null
}
function workFacts(lines) {
  const company = pick(lines, '(?:employer|company(?: name)?|organi[sz]ation(?: name)?)', value => value.length <= 180 && !identityNumber(value) ? value : null)
  const designation = pick(lines, '(?:designation|job title|position|role)', value => value.length <= 180 && !identityNumber(value) ? value : null)
  const result = {}
  const ctc = single([pick(lines, '(?:(?:last drawn|current) )?(?:ctc|cost to company)', annualCtc), pick(lines, '(?:(?:last )?annual (?:ctc|cost to company)|annual compensation)', value => annualCtc(`${value} annually`))])
  if (ctc !== null) result.last_drawn_ctc = ctc
  const months = single([pick(lines, '(?:total (?:work )?experience)', value => {
    const match = value.match(/^(\d+)\s*months?$/i)
    return match ? numeric(match[1], 0, 720) : null
  }), pick(lines, 'total (?:work )?experience (?:in months|\\(months\\))', value => numeric(value.replace(/ months?$/i, ''), 0, 720))])
  if (months !== null) result.total_work_experience_months = months
  if (company && designation) {
    const row = { company, designation }
    const start = pick(lines, '(?:start date|date of joining|employment start)', value => parsePrintedDate(value, { monthAllowed: true }))
    const endValues = labelled(lines, '(?:end date|date of leaving|employment end)')
    const end = single(endValues.map(value => parsePrintedDate(value, { monthAllowed: true })))
    if (start) row.start_date = start
    if (end && (!start || end >= start)) row.end_date = end
    if (endValues.length && endValues.every(value => /^(?:present|current|ongoing)$/i.test(value))) row.current = true
    if (ctc !== null) row.last_drawn_ctc = ctc
    result.work_experience = [row]
  }
  return result
}

function parsePage(text, category) {
  const lines = linesOf(text)
  const result = {}
  const name = pick(lines, '(?:(?:full|candidate(?:’s|\'s)?|student(?:’s|\'s)?|applicant(?:’s|\'s)?) name|name of (?:the )?(?:candidate|student|applicant)|name)', value => validWords(value) && value.split(' ').length <= 12 ? value : null)
  const surname = pick(lines, 'surname', value => validWords(value) ? value : null)
  const given = pick(lines, 'given names?', value => validWords(value) ? value : null)
  if (name) result.full_name = name
  else if (category === 'passport' && surname && given) result.full_name = `${given} ${surname}`
  const dob = pick(lines, '(?:date of birth|birth date|d\\.?o\\.?b\\.?)', value => parsePrintedDate(value))
  if (dob) result.date_of_birth = dob
  for (const [field, labels] of [['nationality', '(?:nationality|citizenship)'], ['current_city', '(?:current city|city of residence|city)']]) {
    const value = pick(lines, labels, value => validWords(value) ? value : null)
    if (value) result[field] = value
  }
  if (ID_TYPES.has(category)) return result
  const email = single(lines.flatMap(line => line.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []))
  if (email && email.length <= 254) result.email = email
  const phone = pick(lines, '(?:phone(?: number)?|mobile(?: number)?|contact(?: number)?|telephone)', value => {
    const digits = value.replace(/[ +()-]/g, '')
    return !identityNumber(value) && /^\d{10}$/.test(digits) ? digits : /^\+91[ -]?[6-9]\d{9}$/.test(value) ? value.replace(/[ -]/g, '') : null
  })
  if (phone) result.phone = phone
  if (ACADEMIC_TYPES.has(category)) {
    const title = lines.slice(0, 10).join(' ')
    const wrongSchool = category === 'academic_10th' && /(?:class|standard)\s*(?:12|XII)\b|(?:senior|higher) secondary/i.test(title) || category === 'academic_12th' && /(?:class|standard)\s*(?:10|X)\b|\bsecondary school certificate\b/i.test(title.replace(/(?:senior|higher) secondary school certificate/gi, ''))
    if (!wrongSchool) {
      const academic = academicFacts(lines, category)
      if (Object.keys(academic).length) result[category] = academic
    }
  }
  if (category === 'exam_score') result.exam_scores = examFacts(lines)
  if (['resume', 'work_experience'].includes(category)) Object.assign(result, workFacts(lines))
  return result
}

function mergeFacts(pages) {
  const candidates = new Map()
  const add = (path, value) => {
    if (Array.isArray(value)) return
    if (value && typeof value === 'object') return Object.entries(value).forEach(([key, next]) => add([...path, key], next))
    const key = JSON.stringify(path)
    if (!candidates.has(key)) candidates.set(key, [])
    candidates.get(key).push(value)
  }
  const result = {}, warnings = []
  pages.forEach(page => Object.entries(page).forEach(([key, value]) => add([key], value)))
  let conflicts = 0
  for (const [key, values] of candidates) {
    const value = single(values)
    if (value === null) { conflicts++; continue }
    const path = JSON.parse(key)
    let target = result
    path.forEach((part, index) => { if (index === path.length - 1) target[part] = value; else { target[part] ??= {}; target = target[part] } })
  }
  for (const section of ['exam_scores', 'work_experience']) {
    const rows = pages.flatMap(page => page[section] || [])
    const groups = new Map()
    rows.forEach(row => {
      const key = section === 'exam_scores' ? `${row.exam}|${row.year || ''}` : `${row.company.toLowerCase()}|${row.designation.toLowerCase()}|${row.start_date || ''}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(row)
    })
    const combined = []
    for (const values of groups.values()) {
      const merged = mergeFacts(values)
      if (merged.warnings.length) conflicts++
      else if (Object.keys(merged.extracted_data).length) combined.push(merged.extracted_data)
    }
    if (combined.length) result[section] = combined.slice(0, section === 'exam_scores' ? 20 : 30)
  }
  if (conflicts) warnings.push('Conflicting printed values were left out. Check the original document and enter them manually.')
  return { extracted_data: result, warnings }
}

export function parseLocalAdmissionsText(pages, document = {}) {
  const entries = (Array.isArray(pages) ? pages : [pages]).slice(0, 5)
  if (document.document_type === 'photo') return { extracted_data: {}, warnings: ['Profile photographs are assigned directly, without text extraction.'] }
  const result = mergeFacts(entries.map(page => parsePage(typeof page === 'string' ? page : page?.text, document.document_type)))
  result.warnings.push('Free local extraction reads printed English labels. Handwriting, complex tables and unlabelled facts may need manual entry. Review every imported value.')
  return result
}
