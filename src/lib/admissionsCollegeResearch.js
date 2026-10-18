const SECTIONS = [
  { key: 'admissions', title: 'Admissions, tests and applications', pattern: /admiss|eligib|exam|test|cut.?off|document|application|deadline|selection|interview|gmat|cat\b|gre\b/i },
  { key: 'fees', title: 'Fees, funding and living costs', pattern: /fee|tuition|scholar|fund|living|hostel|refund|cost|budget/i },
  { key: 'careers', title: 'Placements and career paths', pattern: /placement|ctc|salary|recruit|role|career|internship|employ/i },
  { key: 'programme', title: 'Programme, campus and contacts', pattern: null },
]

export function researchValue(value) {
  if (value === null || value === undefined || value === '') return 'Not available in the current research'
  if (Array.isArray(value)) return value.map(researchValue).join(' · ')
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key}: ${researchValue(item)}`).join(' · ')
  return String(value)
}

export function isStudentResearchField(label, value) {
  if (/(?:\bformula\b|\bcalculation\s+(?:low|high)\b|\b(?:low|high)\s+parameter\b|\binternal\s+student\s+tier\b)/i.test(label)) return false
  if (/^(?:id|(?:college|institution|programme|record|worksheet|source)\s+ids?|consolidated\s+programme\s+ids|numeric\s+reference\s+programme|first\s+calculation\s+programme|(?:scenario\s+)?baseline\s+eligible|eligible\s+baseline)$/i.test(String(label).trim())) return false
  const text = typeof value === 'string' ? value.trim() : ''
  // A worksheet expression is not a student-facing explanation of a fee.
  return !(/^=(?:[A-Z]+\(|\$?[A-Z]{1,3}\$?\d)/i.test(text) || /^\$?[A-Z]{1,3}\$?\d+(?:\s*[+*/^:-]\s*\$?[A-Z0-9.$]+)*$/i.test(text))
}

export function isIllustrativeResearchField(label) {
  return /^\d+\s*Y\s+at\s+[\d.]+%/i.test(label) || /salary\s+(?:scenario|projection)|career\s+(?:scenario|projection)/i.test(label)
}

export function studentResearchLabel(label) {
  const scenario = String(label).match(/^(\d+)Y\s+at\s+([\d.]+)%\s+LPA$/i)
  return scenario ? `${scenario[1]}-year illustration · ${scenario[2]}% annual growth (LPA)` : label
}

export function studentResearchValue(value) {
  return researchValue(value).replace(/\s*\[NCR-\d+\]/g, '').replace(/\bNumeric reference:\s*/gi, '')
}

// Preserve the complete research payload while presenting useful facts and
// qualifications without spreadsheet formulas or internal record identifiers.
export function groupCollegeResearch(research) {
  const sections = SECTIONS.map(section => ({ key: section.key, title: section.title, fields: [] }))
  for (const [label, value] of Object.entries(research?.fields || {})) {
    if (!isStudentResearchField(label, value)) continue
    const index = SECTIONS.findIndex(section => !section.pattern || section.pattern.test(label))
    sections[index].fields.push({ label, value: studentResearchValue(value) })
  }
  return sections.filter(section => section.fields.length)
}
