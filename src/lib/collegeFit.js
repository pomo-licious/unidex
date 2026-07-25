// ─────────────────────────────────────────────────────────────────────────────
// src/lib/collegeFit.js — College fit tier calculation
//
// Single source of truth for "does this college fit this student's CAT score,"
// shared by CollegeDirectory (browse/search) and Profile (target colleges card).
// Keeping the tier math and its display colors in one place means both pages
// stay in sync automatically — no risk of two screens disagreeing on a label.
//
// Determines whether a student's CAT percentile makes a college:
//   - Out of Reach: percentile is 3+ points below cutoff
//   - Within Reach: percentile is within 3 points below to 2 points above cutoff
//   - Strong Match: percentile is 2–10 points above cutoff
//   - Safe Bet: percentile is 10+ points above cutoff
//
// Falls back to college.tier as an estimated cutoff when no real cutoff row
// exists. Returns tier 'unknown' whenever there isn't enough data to compare.
// ─────────────────────────────────────────────────────────────────────────────

const UNKNOWN_FIT = Object.freeze({
  tier: 'unknown',
  label: 'Add CAT score',
  estimated: false,
  cutoff: null,
})

// Tier proxy cutoffs used only when no real college_cutoffs row exists.
const TIER_CUTOFF_ESTIMATE = { 1: 95, 2: 87, 3: 68 }

export function getCollegeFit(studentPercentile, college, cutoffRow) {
  // Coerce to a number up front — handles null/undefined/'' (missing score)
  // and stray strings from JSONB fields (e.g. academic_background.cat_percentile).
  const pct = studentPercentile === null || studentPercentile === undefined || studentPercentile === ''
    ? NaN
    : Number(studentPercentile)

  if (Number.isNaN(pct)) return UNKNOWN_FIT

  // Determine cutoff and whether it's estimated
  let cutoff = null
  let estimated = false

  if (cutoffRow?.overall_gen) {
    cutoff = cutoffRow.overall_gen
    estimated = false
  } else if (college?.tier && TIER_CUTOFF_ESTIMATE[college.tier] !== undefined) {
    // Fallback: use college tier as proxy. Any tier outside 1–3 has no
    // proxy defined, so it falls through to "unknown" below rather than
    // silently comparing against a null cutoff.
    cutoff = TIER_CUTOFF_ESTIMATE[college.tier]
    estimated = true
  } else {
    return UNKNOWN_FIT
  }

  // Calculate fit tier based on percentile vs. cutoff
  const diff = pct - cutoff

  let tier, label
  if (diff < -3) {
    tier = 'out_of_reach'
    label = 'Out of Reach'
  } else if (diff < 2) {
    tier = 'within_reach'
    label = 'Within Reach'
  } else if (diff < 10) {
    tier = 'strong_match'
    label = 'Strong Match'
  } else {
    tier = 'safe_bet'
    label = 'Safe Bet'
  }

  return { tier, label, estimated, cutoff }
}

// ─────────────────────────────────────────────────────────────────────────────
// getFitStyle — Tailwind color classes for a fit tier's pill/badge.
// Shared so every screen renders the same tier in the same color.
// ─────────────────────────────────────────────────────────────────────────────
const FIT_STYLES = {
  out_of_reach: { bg: 'bg-rose-100', text: 'text-rose-700' },
  within_reach: { bg: 'bg-amber-100', text: 'text-amber-700' },
  strong_match: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  safe_bet: { bg: 'bg-blue-100', text: 'text-blue-700' },
  unknown: { bg: 'bg-slate-100', text: 'text-slate-700' },
}

export function getFitStyle(tier) {
  return FIT_STYLES[tier] || FIT_STYLES.unknown
}
