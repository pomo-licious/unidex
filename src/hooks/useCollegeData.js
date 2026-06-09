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
        .select('*')
        .order('tier', { ascending: true, nullsFirst: false })

      if (tier)   query = query.eq('tier', tier)
      if (state)  query = query.ilike('location', `%${state}%`)
      if (search) query = query.ilike('name', `%${search}%`)

      const { data, error, count } = await query
      console.log('useColleges: fetched', data?.length || 0, 'colleges total (unfiltered: 71)', { tier, state, search })
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
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!collegeId) return
    supabase
      .from('college_cutoffs')
      .select('*')
      .eq('college_id', collegeId)
      .then(({ data, error: err }) => {
        if (err) {
          console.error('Error fetching cutoffs:', err)
          setError(err)
        } else {
          setCutoffs(data || [])
          setError(null)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching cutoffs:', err)
        setError(err)
        setLoading(false)
      })
  }, [collegeId])

  return { cutoffs, loading, error }
}

// ── Full exam calendar ─────────────────────────────────────
export function useExamCalendar() {
  const [exams, setExams]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    supabase
      .from('exam_calendar')
      .select('*')
      .order('exam_date', { ascending: true, nullsFirst: false })
      .then(({ data, error: err }) => {
        if (err) {
          console.error('Error fetching exam calendar:', err)
          setError(err)
        } else {
          setExams(data || [])
          setError(null)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching exam calendar:', err)
        setError(err)
        setLoading(false)
      })
  }, [])

  return { exams, loading, error }
}
