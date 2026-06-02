// hooks/useCollegeData.js
// Fetches colleges, cutoffs and exam calendar from Supabase
// Usage: import { useColleges, useExamCalendar, useCollegeCutoffs } from '../hooks/useCollegeData'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ── All colleges with placement stats ──────────────────────
export function useColleges({ tier, state, search } = {}) {
  const [colleges, setColleges] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      let query = supabase
        .from('colleges')
        .select(`
          id, name, type, location, avg_fees, nirf_rank,
          accreditation, batch_size,
          placement_avg_lpa, placement_median_lpa,
          placement_highest_lpa, placement_pct,
          top_recruiters, deadlines, tier
        `, { count: 'exact' })
        .order('nirf_rank', { ascending: true, nullsFirst: false })

      if (tier)   query = query.eq('tier', tier)
      if (state)  query = query.ilike('location', `%${state}%`)
      if (search) query = query.ilike('name', `%${search}%`)

      const { data, error, count } = await query
      console.log('useColleges: fetched', count || data?.length || 0, 'colleges', { tier, state, search })
      setColleges(data || [])
      setError(error)
      setLoading(false)
    }
    fetch()
  }, [tier, state, search])

  return { colleges, loading, error }
}

// ── Cutoffs for a single college ──────────────────────────
export function useCollegeCutoffs(collegeId) {
  const [cutoffs, setCutoffs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!collegeId) return
    supabase
      .from('college_cutoffs')
      .select('*')
      .eq('college_id', collegeId)
      .then(({ data }) => { setCutoffs(data || []); setLoading(false) })
  }, [collegeId])

  return { cutoffs, loading }
}

// ── Full exam calendar ─────────────────────────────────────
export function useExamCalendar() {
  const [exams, setExams]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('exam_calendar')
      .select('*')
      .order('exam_date', { ascending: true, nullsFirst: false })
      .then(({ data }) => { setExams(data || []); setLoading(false) })
  }, [])

  return { exams, loading }
}
