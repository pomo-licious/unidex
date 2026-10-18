const text = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
const percentage = value => {
  if (!['string', 'number'].includes(typeof value) || typeof value === 'string' && !value.trim()) return null
  const result = Number(value)
  return Number.isFinite(result) && result >= 0 && result <= 100 ? result : null
}
const sourceUrl = value => {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null } catch { return null }
}

function selectedProgramme(college) {
  if (!college || college.programmeUnavailable) return null
  const id = college.programme_key || college.selectedProgrammeId || college.selected_programme?.id
  if (!id) return college
  if (college.selected_programme?.id === id && typeof college.selected_programme.eligibility === 'string') return college.selected_programme
  return (Array.isArray(college.programmes) ? college.programmes : []).find(programme => programme?.id === id) || null
}

// This reads an existing workbook statement; it does not verify the source or
// infer a university-wide default. Ambiguous alternatives remain prose only.
export function getGraduationEligibilityReference(college) {
  const programme = selectedProgramme(college)
  if (!programme) return null
  const programmeId = college.programme_key || college.selectedProgrammeId || college.selected_programme?.id || college.representativeProgrammeId || (programme.id?.startsWith('programme-') ? programme.id : null)
  const hasStructured = programme.minGraduationPercent !== null && programme.minGraduationPercent !== undefined && String(programme.minGraduationPercent).trim() !== ''
  const structured = percentage(programme.minGraduationPercent)
  if (hasStructured) return structured === null ? null : {
    value: structured, source: 'structured', sourceUrl: sourceUrl(programme.eligibilitySourceUrl),
    verificationStatus: programme.eligibilityVerificationStatus || 'confirmation_required',
    programmeId,
  }
  const eligibility = text(programme.eligibility)
  const url = sourceUrl(programme.eligibilitySourceUrl)
  if (!eligibility || !url) return null
  // Multiple percentages, category concessions, alternate credentials and
  // specialist postgraduate routes need explicit structured modelling.
  if (/\b(?:category|categories|reserved|reservation|relaxation|concession|divyang|sc|st|obc|ews|pwd|ph|ca|cs|cma|icwa|icwai|mbbs|bds|bams|bums|bhms|hca|master(?:['’]s)?)\b|chartered accountant|company secretar|cost (?:and |& )?works accountant|health.?care/i.test(eligibility)) return null
  if (/\bclass\s*(?:x|xii|10|12)\b|\b(?:ssc|hsc|10th|12th)\b|\b(?:expected|approximate|estimated|indicative|desirable)\b/i.test(eligibility)) return null
  const percentages = [...eligibility.matchAll(/(?:\d+(?:\.\d+)?)\s*(?:%|per\s*cent|percent(?:age)?\b)/gi)]
  if (percentages.length !== 1) return null
  if (/\b\d+(?:\.\d+)?\s*(?:cgpa|gpa)\b|\b(?:cgpa|gpa)\s*(?:of\s*|≥\s*|>=\s*)?\d/i.test(eligibility)) return null
  // Keep the explicit bachelor degree and minimum operator in one clause.
  // No CGPA-to-percentage conversion or unspoken 50% default is permitted.
  const clause = eligibility.match(/\bbachelor(?:['’]s)?\s+degree\b[^.;:\n%]{0,150}?(?:≥|>=|at\s+least|minimum(?:\s+of)?)\s*(\d+(?:\.\d+)?)\s*(?:%|per\s*cent|percent(?:age)?\b)/i)
  if (!clause) return null
  const clauseContext = eligibility.slice(clause.index).split(/[.;:\n]/)[0]
  if (/\b(?:entrance|test|exam|interview|selection|cat|gmat|gre|mat|xat)\b/i.test(clauseContext)) return null
  const value = percentage(clause[1])
  if (value === null || value <= 0) return null
  return {
    value, source: 'imported_eligibility', sourceUrl: url,
    verificationStatus: programme.eligibilityVerificationStatus || 'research_import_requires_cycle_check',
    programmeId,
    excerpt: clause[0],
    caveat: 'Read from imported workbook eligibility text. The linked source, category conditions and admissions cycle still need confirmation; this is not a newly verified rule.',
  }
}
