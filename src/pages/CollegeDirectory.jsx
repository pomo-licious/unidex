// ─────────────────────────────────────────────────────────────────────────────
// src/pages/CollegeDirectory.jsx — Browse and search MBA colleges
//
// Displays all 12 colleges as cards in a grid. The student can:
//   • Search by college name or city (live filtering as they type)
//   • Filter by college type (IIM / IIT / Private / Government)
//   • See their fit score per college based on CAT percentile
//   • Add or remove colleges from their application tracker
//
// Currently reads from COLLEGES + MOCK_STUDENT (fake data).
// The "tracked" state starts pre-populated from MOCK_APPLICATIONS so that
// colleges already in the tracker show as "✓ Added".
//
// When wired up: replace MOCK_STUDENT with the real auth user's student row,
// and replace the toggle function with a Supabase insert/delete on `applications`.
//
// Route: /colleges
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { COLLEGES, MOCK_APPLICATIONS, MOCK_STUDENT, TYPE_META, fitLabel, daysUntil, formatFees } from '../lib/mockData'

const TYPES = ['All', 'IIM', 'IIT', 'Private', 'Government']

export default function CollegeDirectory() {
  const navigate = useNavigate()

  // Pull the student's CAT percentile for fit calculations
  const catPct = MOCK_STUDENT.academic_background.cat_percentile

  // ── search — what the user has typed in the search box ────────────────────
  const [search, setSearch] = useState('')

  // ── typeFilter — currently active category filter button ──────────────────
  const [typeFilter, setType] = useState('All')

  // ── tracked — Set of college IDs the student is already tracking ──────────
  // A Set is like an array but faster to check membership (has/add/delete)
  // Pre-populated from MOCK_APPLICATIONS so existing tracked colleges start as "✓ Added"
  const [tracked, setTracked] = useState(
    new Set(MOCK_APPLICATIONS.map(a => a.college_id))
  )

  // ── toggleTrack — adds or removes a college from the tracked Set ──────────
  function toggleTrack(id) {
    setTracked(prev => {
      const next = new Set(prev)          // Copy the existing Set (don't mutate state directly)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── filtered — colleges that pass both the type filter and search query ────
  const filtered = COLLEGES.filter(c => {
    const matchType   = typeFilter === 'All' || c.type === typeFilter
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        c.location.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  return (
    <Layout>
      <div className="px-6 py-8">

        {/* ── Page header ── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">MBA Colleges</h1>
          <p className="text-sm text-gray-500 mt-1">Browse top programs · add to your tracker in one click</p>
        </div>

        {/* ── Search bar + type filter pills ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search input — updates `search` state on every keystroke */}
          <div className="relative flex-1">
            {/* Magnifying glass icon positioned inside the input */}
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search colleges or cities…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {/* Type filter buttons — clicking one sets typeFilter state */}
          <div className="flex gap-2 flex-wrap">
            {TYPES.map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors
                  ${typeFilter === t ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── Result count + shortcut to tracker ── */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-500">
            {filtered.length} college{filtered.length !== 1 ? 's' : ''} found
          </p>
          {/* Only shows if at least one college is tracked */}
          {tracked.size > 0 && (
            <button onClick={() => navigate('/tracker')}
              className="text-xs text-indigo-600 font-medium hover:underline">
              {tracked.size} tracked → View tracker
            </button>
          )}
        </div>

        {/* ── College grid — or empty state if no results ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">No colleges match your search.</p>
            {/* Clear filters button resets both search text and type filter */}
            <button onClick={() => { setSearch(''); setType('All') }}
              className="mt-2 text-sm text-indigo-600 hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          // Responsive grid: 1 column on mobile, 2 on tablet, 3 on desktop
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(college => {
              const fit       = fitLabel(catPct, college.cutoff)   // "Strong match", "Good fit", or "Reach"
              const days      = daysUntil(college.deadline)         // Days until application deadline
              const isTracked = tracked.has(college.id)             // Is this college already in the tracker?

              return (
                <div key={college.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4 hover:border-indigo-200 hover:shadow-sm transition-all">

                  {/* Card header: type badge, college name, location, fit score */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_META[college.type].color}`}>
                        {college.type}
                      </span>
                      <h3 className="text-sm font-bold text-gray-900 mt-2 leading-snug">{college.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{college.location}</p>
                    </div>
                    {/* Fit label — only shown if the student has a CAT percentile on file */}
                    {catPct > 0 && (
                      <span className={`text-xs font-semibold shrink-0 ${fit.color}`}>{fit.label}</span>
                    )}
                  </div>

                  {/* Stats row: fees, cutoff, seats */}
                  <div className="grid grid-cols-3 gap-2">
                    <Stat label="Total fees" value={formatFees(college.avg_fees)} />
                    <Stat label="Cutoff"     value={college.cutoff_label} suffix="%ile" />
                    <Stat label="Seats"      value={`${college.seats}`} />
                  </div>

                  {/* Deadline section with urgency chip */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400">Application deadline</p>
                      <p className="text-xs font-semibold text-gray-700 mt-0.5">
                        {/* Format date as "15 Nov 2026" style */}
                        {new Date(college.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {/* Deadline chip: green if >90 days, amber if 30–90, red if <30, gray if closed */}
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg
                      ${days < 0  ? 'bg-gray-100 text-gray-500'   :
                        days < 30 ? 'bg-rose-100 text-rose-700'   :
                        days < 90 ? 'bg-amber-100 text-amber-700' :
                                    'bg-emerald-100 text-emerald-700'}`}>
                      {days < 0 ? 'Closed' : `${days}d left`}
                    </span>
                  </div>

                  {/* Add/Remove tracker button — toggles between filled/outline style */}
                  <button
                    onClick={() => toggleTrack(college.id)}
                    className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors
                      ${isTracked
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                    {isTracked ? '✓ Added to Tracker' : '+ Add to Tracker'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}

// ─── Stat — small labelled number tile used inside each college card ──────────
function Stat({ label, value, suffix = '' }) {
  return (
    <div className="bg-gray-50 rounded-lg px-2 py-2 text-center">
      <p className="text-xs font-bold text-gray-800">
        {value}
        {suffix && <span className="font-normal text-gray-400 text-xs ml-0.5">{suffix}</span>}
      </p>
      <p className="text-xs text-gray-400 mt-0.5 leading-tight">{label}</p>
    </div>
  )
}
