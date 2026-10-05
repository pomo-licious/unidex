// ─────────────────────────────────────────────────────────────────────────────
// src/lib/collegeFit.js — College fit tier calculation
//
// Single source of truth for "does this college fit this student's score,"
// shared by CollegeDirectory (browse/search) and Profile (target colleges card).
// Keeping the tier math and its display colors in one place means both pages
// stay in sync automatically — no risk of two screens disagreeing on a label.
//
// Exam-aware: a student has ONE primary exam + percentile (CAT, XAT, …). The
// engine compares that percentile against the college's cutoff FOR THAT EXAM.
// If the college has no cutoff row for the student's exam, it falls back to a
// tier-based estimate and marks the result estimated:true (UI shows "· est.").
//
// Fit bands (percentile − cutoff):
//   diff <  -3            -> Out of Reach
//   -3 <= diff <  +2      -> Within Reach
//   +2 <= diff < +10      -> Strong Match
//   diff >= +10           -> Safe Bet
//
// Returns tier 'unknown' whenever there isn't enough data to compare.
// ─────────────────────────────────────────────────────────────────────────────

const UNKNOWN_FIT = Object.freeze({
  tier: 'unknown',
  label: 'Add exam score',
  estimated: false,
  cutoff: null,
  exam: null,
})

// Tier proxy cutoffs (CAT-percentile scale) used only when no real
// college_cutoffs row exists for the student's exam.
const TIER_CUTOFF_ESTIMATE = { 1: 95, 2: 87, 3: 68 }

// Normalise the student score argument. Accepts either:
//   - a number  -> legacy callers, treated as a CAT percentile, or
//   - an object { exam, percentile } (exam may also arrive as exam_type).
function resolveStudentScore(studentScore) {
  if (studentScore !== null && typeof studentScore === 'object') {
    return {
      exam: (studentScore.exam || studentScore.exam_type || 'CAT'),
      percentile: studentScore.percentile,
    }
  }
  return { exam: 'CAT', percentile: studentScore }
}

// Pick the cutoff row matching the student's exam. Accepts an array of rows
// (preferred) or a single row (legacy). Falls back to a lone untagged row so
// older single-CAT-row callers keep working.
function pickCutoffRow(cutoffRows, exam) {
  const rows = Array.isArray(cutoffRows) ? cutoffRows : (cutoffRows ? [cutoffRows] : [])
  const want = (exam || 'CAT').toUpperCase()
  return (
    rows.find(r => (r?.exam_type || '').toUpperCase() === want) ||
    (rows.length === 1 && !rows[0]?.exam_type ? rows[0] : null)
  )
}

export function getCollegeFit(studentScore, college, cutoffRows) {
  const { exam, percentile } = resolveStudentScore(studentScore)

  // Coerce to a number — handles null/undefined/'' (missing score) and stray
  // strings from JSONB fields (e.g. academic_background.cat_percentile).
  const pct = percentile === null || percentile === undefined || percentile === ''
    ? NaN
    : Number(percentile)

  if (Number.isNaN(pct)) return UNKNOWN_FIT

  // Prefer the real cutoff for the exam the student actually sat; otherwise
  // estimate from the college tier and flag it.
  let cutoff = null
  let estimated = false

  const examRow = pickCutoffRow(cutoffRows, exam)

  if (examRow?.overall_gen != null) {
    cutoff = examRow.overall_gen
    estimated = false
  } else if (college?.tier && TIER_CUTOFF_ESTIMATE[college.tier] !== undefined) {
    // No cutoff for this exam at this college — fall back to the tier proxy.
    // Any tier outside 1–3 has no proxy, so it stays "unknown" rather than
    // comparing against a null cutoff.
    cutoff = TIER_CUTOFF_ESTIMATE[college.tier]
    estimated = true
  } else {
    return UNKNOWN_FIT
  }

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

  return { tier, label, estimated, cutoff, exam }
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
