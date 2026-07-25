// ─────────────────────────────────────────────────────────────────────────────
// src/lib/collegeFit.js — College fit tier calculation
//
// Determines whether a student's CAT percentile makes a college:
//   - Out of Reach: percentile is 3+ points below cutoff
//   - Within Reach: percentile is within 3 points below to 2 points above cutoff
//   - Strong Match: percentile is 2–10 points above cutoff
//   - Safe Bet: percentile is 10+ points above cutoff
//
// Falls back to college.tier if no cutoff row exists. Handles missing percentile.
// ─────────────────────────────────────────────────────────────────────────────

export function getCollegeFit(studentPercentile, college, cutoffRow) {
  // If no CAT percentile: user hasn't added score yet
  if (studentPercentile === null || studentPercentile === undefined) {
    return {
      tier: 'unknown',
      label: 'Add CAT score',
      estimated: false,
      cutoff: null,
    }
  }

  // Determine cutoff and whether it's estimated
  let cutoff = null
  let estimated = false

  if (cutoffRow?.overall_gen) {
    cutoff = cutoffRow.overall_gen
    estimated = false
  } else if (college?.tier) {
    // Fallback: use college tier as proxy
    if (college.tier === 1) cutoff = 95
    else if (college.tier === 2) cutoff = 87
    else if (college.tier === 3) cutoff = 68
    estimated = true
  } else {
    // No data: unknown
    return {
      tier: 'unknown',
      label: 'Add CAT score',
      estimated: false,
      cutoff: null,
    }
  }

  // Calculate fit tier based on percentile vs. cutoff
  const diff = studentPercentile - cutoff

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

  return {
    tier,
    label,
    estimated,
    cutoff,
  }
}
