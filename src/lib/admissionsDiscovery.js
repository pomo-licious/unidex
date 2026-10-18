import { hasCollegePhoto } from '../data/collegeImages.js'
import { matchCollege } from './admissionsMatching.js'

const groupOrder = { recommended: 0, needs_review: 1, other: 2 }
const eligibilityOrder = { meets_known_criteria: 0, unknown: 1, review_required: 2 }
const budgetOrder = { within_budget: 0, not_set: 0, unknown_fees: 1, over_budget: 2 }
const preferenceOrder = { aligned: 0, not_set: 0, unknown: 1, conflict: 2 }
const feeCap = value => {
  if (value === null || value === undefined || !['number', 'string'].includes(typeof value) || typeof value === 'string' && !value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function profileForDiscovery(profile, filterBudget = 'all') {
  const filter = feeCap(filterBudget)
  if (filter === null) return profile || {}
  const saved = feeCap(profile?.preferences?.max_fees_inr)
  const maximum = saved === null ? filter : Math.min(saved, filter)
  return { ...profile, preferences: { ...profile?.preferences, max_fees_inr: maximum } }
}

function institutionDetails(college) {
  const details = { ...college }
  // The institution carries a representative programme for older callers.
  // Remove that entire programme contract before selecting a different one:
  // an omitted rule is unknown, not a licence to reuse another programme's rule.
  for (const programme of college.programmes || []) {
    for (const key of Object.keys(programme)) delete details[key]
  }
  delete details.programme_key
  delete details.selected_programme
  delete details.selectedProgrammeId
  delete details.selectedProgrammeName
  return details
}

export function collegeWithProgramme(college, programme) {
  if (!programme) return college
  const { name, ...details } = programme
  return { ...institutionDetails(college), ...details, id: college.id, name: college.name, type: college.type, programmeType: programme.type, programme: name, programme_key: programme.id, selected_programme: programme }
}

export function compareCollegeFit(a, b) {
  return (groupOrder[a.match.recommendationGroup] ?? 1) - (groupOrder[b.match.recommendationGroup] ?? 1)
    || (eligibilityOrder[a.match.eligibility] ?? 1) - (eligibilityOrder[b.match.eligibility] ?? 1)
    || (preferenceOrder[a.match.preference?.status] ?? 1) - (preferenceOrder[b.match.preference?.status] ?? 1)
    || (budgetOrder[a.match.budget?.status] ?? 1) - (budgetOrder[b.match.budget?.status] ?? 1)
}

// A student's explicit or saved programme always wins over an automatic choice.
// If a saved programme leaves the current catalogue, retain its saved details so
// that opening discovery cannot silently rewrite an existing application plan.
export function chooseDiscoveryProgramme(college, profile, programmeId, savedSnapshot) {
  const savedId = savedSnapshot?.programme_key || savedSnapshot?.selectedProgrammeId || savedSnapshot?.selected_programme?.id
  const requestedId = programmeId || savedId
  const requested = college.programmes?.find(programme => programme.id === requestedId)
  if (requested) return collegeWithProgramme(college, requested)
  if (requestedId && savedId === requestedId) {
    return { ...institutionDetails(college), ...savedSnapshot, id: college.id, name: college.name, type: college.type, programmes: college.programmes, programme_key: savedId, programmeUnavailable: true }
  }
  const candidates = (college.programmes || []).map(programme => {
    const candidate = collegeWithProgramme(college, programme)
    return { ...candidate, match: matchCollege(profile, candidate) }
  })
  return candidates.sort((a, b) => compareCollegeFit(a, b)
    || (b.match.score ?? -1) - (a.match.score ?? -1)
    || b.match.confidence.percentage - a.match.confidence.percentage)[0] || college
}

export function sortDiscoveryColleges(colleges, sort = 'match') {
  return [...colleges].sort((a, b) => {
    if (sort === 'fees') return (a.feesInr ?? Infinity) - (b.feesInr ?? Infinity) || a.name.localeCompare(b.name)
    if (sort === 'city') return a.city.localeCompare(b.city) || a.name.localeCompare(b.name)
    if (sort !== 'match') return a.name.localeCompare(b.name)
    return compareCollegeFit(a, b)
      || Number(hasCollegePhoto(b)) - Number(hasCollegePhoto(a))
      || (b.match.score ?? -1) - (a.match.score ?? -1)
      || b.match.confidence.percentage - a.match.confidence.percentage
      || a.name.localeCompare(b.name)
  })
}

export function discoveryGroupDetails(group) {
  if (group === 'recommended') return { title: 'Recommended for you', detail: 'Your profile aligns with the assessed programme criteria and any fee budget you have set.' }
  if (group === 'other') return { title: 'Other colleges', detail: 'These options remain open to explore. A known requirement, preference or fee budget needs attention before you apply.' }
  return { title: 'Worth exploring · details to confirm', detail: 'More applicant or programme information is needed for a confident recommendation. Open the fit explanation to see what is missing.' }
}
