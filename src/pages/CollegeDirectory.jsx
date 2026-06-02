// pages/CollegeDirectory.jsx
// Full college discovery page with search, tier filter, and detail drawer

import { useState } from 'react'
import { useColleges, useCollegeCutoffs } from '../hooks/useCollegeData'

const TIERS = ['All', 'Tier 1', 'Tier 2', 'Tier 3']

const TIER_STYLES = {
  'Tier 1': 'bg-blue-50 text-blue-700 border border-blue-200',
  'Tier 2': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Tier 3': 'bg-slate-100 text-slate-600 border border-slate-200',
}

export default function CollegeDirectory() {
  const [search, setSearch]       = useState('')
  const [tier, setTier]           = useState('All')
  const [selected, setSelected]   = useState(null)

  const { colleges, loading } = useColleges({
    tier:   tier === 'All' ? undefined : tier,
    search: search || undefined,
  })

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">College Directory</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {loading ? '...' : `${colleges.length} colleges`} · real placement + cutoff data
        </p>

        {/* Search + filter */}
        <div className="mt-4 flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search colleges…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-48 px-3 py-2 text-sm border border-slate-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <div className="flex gap-2">
            {TIERS.map(t => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  tier === t
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 bg-white rounded-xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {colleges.map(c => (
              <CollegeCard key={c.id} college={c} onClick={() => setSelected(c)} />
            ))}
          </div>
        )}

        {!loading && colleges.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">No colleges found</p>
            <p className="text-sm mt-1">Try a different search or filter</p>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <CollegeDrawer college={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

// ── College card ───────────────────────────────────────────
function CollegeCard({ college: c, onClick }) {
  const nextDeadline = getNextDeadline(c.deadlines)

  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-xl border border-slate-200 p-5
                 hover:border-blue-300 hover:shadow-md transition-all duration-150 group"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h2 className="font-semibold text-slate-900 text-sm leading-tight group-hover:text-blue-700 transition-colors">
            {c.name}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{c.location}</p>
        </div>
        {c.nirf_rank && (
          <span className="shrink-0 text-xs bg-amber-50 text-amber-700 border border-amber-200
                           px-2 py-0.5 rounded-full font-medium">
            #{c.nirf_rank} NIRF
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat label="Avg LPA" value={c.placement_avg_lpa ? `₹${c.placement_avg_lpa}L` : '–'} />
        <Stat label="Fees" value={c.avg_fees ? `₹${(c.avg_fees/100000).toFixed(0)}L` : '–'} />
        <Stat label="Batch" value={c.batch_size || '–'} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIER_STYLES[c.tier] || TIER_STYLES['Tier 3']}`}>
          {c.tier || 'Tier 2'}
        </span>
        {nextDeadline ? (
          <span className="text-xs text-slate-400">
            Next deadline: <span className="text-slate-600 font-medium">{nextDeadline}</span>
          </span>
        ) : (
          <span className="text-xs text-slate-300">Deadline TBD</span>
        )}
      </div>
    </button>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg px-2 py-1.5 text-center">
      <p className="text-xs font-semibold text-slate-800">{value}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}

// ── College detail drawer ──────────────────────────────────
function CollegeDrawer({ college: c, onClose }) {
  const { cutoffs, loading: cutoffsLoading } = useCollegeCutoffs(c.id)
  const catCutoff = cutoffs.find(x => x.exam_type === 'CAT')

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-start gap-3">
          <div className="flex-1">
            <h2 className="font-bold text-slate-900 text-lg leading-tight">{c.name}</h2>
            <p className="text-sm text-slate-400">{c.location} · {c.type}</p>
          </div>
          <button onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl font-light mt-0.5">×</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatBlock label="Avg Package" value={c.placement_avg_lpa ? `₹${c.placement_avg_lpa} LPA` : '–'} />
            <StatBlock label="Median Package" value={c.placement_median_lpa ? `₹${c.placement_median_lpa} LPA` : '–'} />
            <StatBlock label="Highest Package" value={c.placement_highest_lpa ? `₹${c.placement_highest_lpa} LPA` : '–'} />
            <StatBlock label="Total Fees" value={c.avg_fees ? `₹${(c.avg_fees/100000).toFixed(1)}L` : '–'} />
          </div>

          {/* Accreditations */}
          {c.accreditation?.length > 0 && (
            <div>
              <SectionTitle>Accreditations</SectionTitle>
              <div className="flex gap-2 flex-wrap mt-2">
                {c.accreditation.map(a => (
                  <span key={a} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Top recruiters */}
          {c.top_recruiters?.length > 0 && (
            <div>
              <SectionTitle>Top Recruiters</SectionTitle>
              <div className="flex gap-2 flex-wrap mt-2">
                {c.top_recruiters.map(r => (
                  <span key={r} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CAT cutoffs */}
          <div>
            <SectionTitle>CAT Cutoffs (2025-27)</SectionTitle>
            {cutoffsLoading ? (
              <div className="h-20 bg-slate-100 rounded-lg animate-pulse mt-2" />
            ) : catCutoff ? (
              <div className="mt-2 rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <tr>
                      {['Category','Overall','VARC','DILR','QA'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { cat: 'General', overall: catCutoff.overall_gen, varc: catCutoff.varc_gen, dilr: catCutoff.dilr_gen, qa: catCutoff.qa_gen },
                      { cat: 'OBC',     overall: catCutoff.overall_obc },
                      { cat: 'SC',      overall: catCutoff.overall_sc },
                      { cat: 'ST',      overall: catCutoff.overall_st },
                    ].map(row => (
                      <tr key={row.cat} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-700">{row.cat}</td>
                        <td className="px-3 py-2 text-slate-800">{row.overall ? `${row.overall}%ile` : '–'}</td>
                        <td className="px-3 py-2 text-slate-500">{row.varc ? `${row.varc}` : '–'}</td>
                        <td className="px-3 py-2 text-slate-500">{row.dilr ? `${row.dilr}` : '–'}</td>
                        <td className="px-3 py-2 text-slate-500">{row.qa ? `${row.qa}` : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {catCutoff.notes && (
                  <p className="text-xs text-slate-400 px-3 py-2 border-t border-slate-100">
                    {catCutoff.notes}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 mt-2">No cutoff data available</p>
            )}
          </div>

          {/* Deadlines */}
          {c.deadlines?.length > 0 && (
            <div>
              <SectionTitle>Application Deadlines</SectionTitle>
              <div className="mt-2 space-y-2">
                {c.deadlines.map((d, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <span className="text-sm font-medium text-slate-700">{d.round}</span>
                      <span className="text-xs text-slate-400 ml-2">{d.type}</span>
                    </div>
                    <span className={`text-sm font-medium ${isUpcoming(d.date) ? 'text-blue-600' : 'text-slate-400'}`}>
                      {formatDate(d.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helper components ──────────────────────────────────────
function SectionTitle({ children }) {
  return <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{children}</h3>
}

function StatBlock({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-lg font-bold text-slate-900 mt-0.5">{value}</p>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────
function getNextDeadline(deadlines) {
  if (!deadlines?.length) return null
  const today = new Date()
  const future = deadlines
    .filter(d => new Date(d.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  return future[0] ? formatDate(future[0].date) : null
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isUpcoming(dateStr) {
  return new Date(dateStr) >= new Date()
}
