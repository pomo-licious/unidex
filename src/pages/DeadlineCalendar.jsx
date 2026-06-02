// ─────────────────────────────────────────────────────────────────────────────
// src/pages/DeadlineCalendar.jsx — Monthly deadline calendar
//
// Shows all application deadlines for colleges the student either:
//   a) has in their target_colleges list, or
//   b) has an application row for
//
// Deadlines are sourced from colleges.deadlines JSONB (the separate `deadlines`
// table exists in the schema but is not yet seeded; JSONB has real data).
//
// Each date cell shows coloured dots per deadline type.
// Clicking a date reveals a detail panel with college + round + type.
//
// Route: /calendar
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

// ─── Deadline type → colour mapping ──────────────────────────────────────────
const TYPE_META = {
  CAT:       { dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700'     },
  GMAT:      { dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700' },
  GRE:       { dot: 'bg-violet-500', badge: 'bg-violet-100 text-violet-700' },
  SOP:       { dot: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700'   },
  Interview: { dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700'   },
  Result:    { dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600'     },
}

const DOW   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

// ─── buildGrid — returns an array of day numbers (1–31) padded with nulls ────
// so the grid starts on the correct day-of-week column
function buildGrid(year, month) {
  const firstDow    = new Date(year, month, 1).getDay()  // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDow; i++)    cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0)         cells.push(null)
  return cells
}

// ─── toIso — formats year/month(0-based)/day as "YYYY-MM-DD" ─────────────────
function toIso(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DeadlineCalendar() {
  const now = new Date()

  // ── View state — which month is showing ───────────────────────────────────
  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  // ── Data state ─────────────────────────────────────────────────────────────
  // flat list: [{ college_name, college_type, round, date, type }, ...]
  const [deadlines, setDeadlines] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  // ── Selected date — ISO string of the clicked day cell ────────────────────
  const [selected, setSelected] = useState(null)

  // ── loadDeadlines — fetches colleges + unnests their deadline JSONB ────────
  const loadDeadlines = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Step 1: confirm the user is logged in
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      setError('Please log in to view your deadline calendar.')
      setLoading(false)
      return
    }

    // Step 2: get the student row to read target_colleges
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('id, target_colleges')
      .eq('user_id', user.id)
      .single()

    if (studentErr || !student) {
      setError('No student profile found. Please complete your profile first.')
      setLoading(false)
      return
    }

    // Step 3: get college_ids from existing applications (RLS auto-filters)
    const { data: apps } = await supabase
      .from('applications')
      .select('college_id')

    const appCollegeIds = (apps || []).map(a => a.college_id)
    const targetNames   = student.target_colleges || []

    // If student has nothing tracked yet, show empty state
    if (targetNames.length === 0 && appCollegeIds.length === 0) {
      setDeadlines([])
      setLoading(false)
      return
    }

    // Step 4: fetch colleges by name (target list) and by id (applications)
    // Run both in parallel — one or both queries may be empty
    const [byNameRes, byIdRes] = await Promise.all([
      targetNames.length > 0
        ? supabase.from('colleges').select('id, name, type, deadlines').in('name', targetNames)
        : Promise.resolve({ data: [] }),
      appCollegeIds.length > 0
        ? supabase.from('colleges').select('id, name, type, deadlines').in('id', appCollegeIds)
        : Promise.resolve({ data: [] }),
    ])

    // Merge and deduplicate by college id
    const combined = [...(byNameRes.data || []), ...(byIdRes.data || [])]
    const seen = new Set()
    const unique = combined.filter(c => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })

    // Step 5: flatten each college's deadlines JSONB into a single array
    // colleges.deadlines = [{ round, date, type }, ...]
    const flat = unique.flatMap(college =>
      (college.deadlines || [])
        .filter(d => d.date)  // skip entries with no date
        .map(d => ({
          college_name: college.name,
          college_type: college.type,
          round:        d.round  || '–',
          date:         d.date,
          type:         d.type   || 'Result',
        }))
    )

    setDeadlines(flat)
    setLoading(false)
  }, [])

  useEffect(() => { loadDeadlines() }, [loadDeadlines])

  // ── Derived: group deadlines by ISO date ──────────────────────────────────
  const byDate = deadlines.reduce((acc, d) => {
    if (!acc[d.date]) acc[d.date] = []
    acc[d.date].push(d)
    return acc
  }, {})

  const grid  = buildGrid(viewYear, viewMonth)
  const today = toIso(now.getFullYear(), now.getMonth(), now.getDate())

  // ── Month navigation ───────────────────────────────────────────────────────
  function prevMonth() {
    setSelected(null)
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    setSelected(null)
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const selectedDeadlines = selected ? (byDate[selected] || []) : []

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="px-6 py-8 max-w-3xl mx-auto">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Deadline Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Deadlines for your target colleges and tracked applications
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Loading spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
            <p className="text-sm text-gray-400">Loading your deadlines…</p>
          </div>

        ) : deadlines.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📅</p>
            <p className="text-sm font-semibold text-gray-700">No deadlines found</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              Add colleges to your target list or tracker to see their deadlines here.
            </p>
          </div>

        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

            {/* ── Month navigation header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <button onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors font-medium">
                ←
              </button>
              <h2 className="text-sm font-bold text-gray-900">
                {MONTHS[viewMonth]} {viewYear}
              </h2>
              <button onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-colors font-medium">
                →
              </button>
            </div>

            {/* ── Day-of-week column labels ── */}
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
              {DOW.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">
                  {d}
                </div>
              ))}
            </div>

            {/* ── Calendar grid ── */}
            <div className="grid grid-cols-7">
              {grid.map((day, i) => {
                const iso         = day ? toIso(viewYear, viewMonth, day) : null
                const dayDeadlines = iso ? (byDate[iso] || []) : []
                const isToday     = iso === today
                const isSelected  = iso === selected
                const hasEvents   = dayDeadlines.length > 0

                return (
                  <div key={i}
                    onClick={() => day && setSelected(isSelected ? null : iso)}
                    className={`min-h-[68px] p-1.5 border-b border-r border-gray-100 transition-colors
                      ${!day ? 'bg-gray-50/50' : hasEvents ? 'cursor-pointer hover:bg-indigo-50' : 'cursor-default'}
                      ${isSelected ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-300' : ''}
                    `}>
                    {day && (
                      <>
                        {/* Date number */}
                        <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1 mx-auto
                          ${isToday ? 'bg-indigo-600 text-white' : 'text-gray-700'}`}>
                          {day}
                        </div>
                        {/* Deadline dots — max 3 shown, +N for overflow */}
                        {dayDeadlines.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 justify-center">
                            {dayDeadlines.slice(0, 3).map((d, j) => (
                              <div key={j}
                                className={`w-1.5 h-1.5 rounded-full ${(TYPE_META[d.type] || TYPE_META.Result).dot}`}
                                title={`${d.college_name} · ${d.round} · ${d.type}`}
                              />
                            ))}
                            {dayDeadlines.length > 3 && (
                              <span className="text-[9px] text-gray-400 leading-tight">
                                +{dayDeadlines.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── Selected date detail panel ── */}
            {selected && (
              <div className="border-t border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-700">
                    {/* Parse as local date to avoid UTC offset shifting the day */}
                    {new Date(selected + 'T00:00:00').toLocaleDateString('en-IN', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                  <button onClick={() => setSelected(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                    ✕ close
                  </button>
                </div>

                {selectedDeadlines.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No deadlines on this day.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDeadlines.map((d, i) => {
                      const meta = TYPE_META[d.type] || TYPE_META.Result
                      return (
                        <div key={i}
                          className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                          <span className="text-sm font-medium text-gray-800 flex-1 min-w-0 truncate">
                            {d.college_name}
                          </span>
                          <span className="text-xs text-gray-400 shrink-0">{d.round}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${meta.badge}`}>
                            {d.type}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Legend ── */}
            <div className="border-t border-gray-100 px-6 py-3 flex flex-wrap gap-4 bg-gray-50/50">
              {Object.entries(TYPE_META).map(([type, meta]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
                  <span className="text-[11px] text-gray-500">{type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
