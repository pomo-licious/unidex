// ─────────────────────────────────────────────────────────────────────────────
// src/pages/AppTracker.jsx — Application status kanban board
//
// Shows all tracked applications as cards arranged in 5 columns by status:
//   Researching → Applied → Interview → Offer → Rejected
//
// The student can:
//   • See a summary count bar at the top (how many in each stage)
//   • Click "Move to…" on any card to change its status column
//   • Click "Add College" to track a new college (shows a modal)
//
// Currently uses MOCK_APPLICATIONS as its starting data (in local state).
// All moves and adds only affect local state — nothing is saved to Supabase yet.
//
// When wired up:
//   • Load apps with: SELECT * FROM applications WHERE student_id = ...
//   • moveApp should call: UPDATE applications SET status = ? WHERE id = ?
//   • addApp should call:  INSERT INTO applications (student_id, college_id, ...) VALUES (...)
//
// Route: /tracker
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { MOCK_APPLICATIONS, COLLEGES, STATUSES, STATUS_META, daysUntil } from '../lib/mockData'

export default function AppTracker() {
  const navigate = useNavigate()

  // ── apps — the live list of applications (starts from mock data) ───────────
  const [apps, setApps] = useState(MOCK_APPLICATIONS)

  // ── showAdd — controls whether the "Add College" modal is visible ──────────
  const [showAdd, setShowAdd] = useState(false)

  // ── newApp — form state for the add-college modal ─────────────────────────
  const [newApp, setNewApp] = useState({ college_id: '', notes: '' })

  // ── moveApp — updates the status of a single application by ID ────────────
  function moveApp(id, status) {
    // Map over all apps; only change the one matching the given ID
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  // ── addApp — creates a new application entry from the modal form ──────────
  function addApp() {
    const college = COLLEGES.find(c => c.id === newApp.college_id)
    if (!college) return   // Safety check: don't proceed if no college was selected

    // Build the new application object with a timestamp-based ID
    const entry = {
      id:         `a${Date.now()}`,  // Temporary ID — real Supabase inserts generate a UUID
      college_id: college.id,
      college:    college.name,
      status:     'Researching',     // All new applications start in the Researching column
      deadline:   college.deadline,
      notes:      newApp.notes,
    }

    // Prepend to the list (newest first) and close the modal
    setApps(prev => [entry, ...prev])
    setNewApp({ college_id: '', notes: '' })
    setShowAdd(false)
  }

  // ── byStatus — groups applications by their status for easy column rendering ──
  // Produces: { Researching: [...], Applied: [...], Interview: [...], ... }
  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = apps.filter(a => a.status === s)
    return acc
  }, {})

  // ── addableColleges — only show colleges not already tracked in the modal ──
  const alreadyTracked  = new Set(apps.map(a => a.college_id))
  const addableColleges = COLLEGES.filter(c => !alreadyTracked.has(c.id))

  return (
    <Layout>
      <div className="px-6 py-8">

        {/* ── Page header + Add College button ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
            <p className="text-sm text-gray-500 mt-1">{apps.length} college{apps.length !== 1 ? 's' : ''} tracked</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add College
          </button>
        </div>

        {/* ── Summary strip — pill for each status with count ── */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
          {STATUSES.map(s => (
            <div key={s} className={`shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${STATUS_META[s].border} bg-white`}>
              {/* Coloured dot */}
              <div className={`w-2 h-2 rounded-full ${STATUS_META[s].dot}`} />
              <span className="text-xs font-medium text-gray-700">{s}</span>
              {/* Count in the status's own colour */}
              <span className={`text-sm font-bold ${STATUS_META[s].color.split(' ')[1]}`}>{byStatus[s].length}</span>
            </div>
          ))}
        </div>

        {/* ── Add College modal ── */}
        {/* Only renders when showAdd is true */}
        {showAdd && (
          // Semi-transparent full-screen overlay — clicking outside doesn't close (intentional for MVP)
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Add College to Tracker</h3>

              <div className="space-y-3">
                {/* College selector — only shows colleges not already tracked */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">College *</label>
                  <select
                    value={newApp.college_id}
                    onChange={e => setNewApp(n => ({ ...n, college_id: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">Select a college…</option>
                    {addableColleges.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Optional notes field */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={newApp.notes}
                    onChange={e => setNewApp(n => ({ ...n, notes: e.target.value }))}
                    rows={2}
                    placeholder="Why you're applying, things to do…"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowAdd(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                {/* Disabled until a college is chosen */}
                <button onClick={addApp} disabled={!newApp.college_id}
                  className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                  Add to Tracker
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Kanban board — or empty state if no apps ── */}
        {apps.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">No applications tracked yet.</p>
            <button onClick={() => navigate('/colleges')} className="mt-2 text-sm text-indigo-600 hover:underline">
              Browse colleges →
            </button>
          </div>
        ) : (
          // Horizontal flex container — scrolls sideways if columns don't fit
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUSES.map(status => (
              // Each column is a fixed width so all 5 fit without squishing
              <div key={status} className="w-56 shrink-0 flex flex-col gap-3">

                {/* Column header: coloured dot + status name + count */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${STATUS_META[status].dot}`} />
                    <span className="text-xs font-semibold text-gray-700">{status}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-400">{byStatus[status].length}</span>
                </div>

                {/* Dashed border drop zone — contains all cards for this status */}
                <div className={`min-h-[120px] rounded-xl border-2 border-dashed ${STATUS_META[status].border} p-2 space-y-2`}>
                  {byStatus[status].map(app => (
                    <AppCard key={app.id} app={app} onMove={moveApp} />
                  ))}

                  {/* Placeholder shown in empty columns */}
                  {byStatus[status].length === 0 && (
                    <div className="h-16 flex items-center justify-center">
                      <p className="text-xs text-gray-300">Empty</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AppCard — a single application card inside a kanban column
//
// Shows: college name, deadline urgency chip, notes preview, and a
// "Move to…" dropdown that lets the student change the application's status.
//
// Props:
//   app    — the application object { id, college, status, deadline, notes }
//   onMove — callback: onMove(appId, newStatus) — called when the user picks a new status
// ─────────────────────────────────────────────────────────────────────────────
function AppCard({ app, onMove }) {
  // open — controls whether the "Move to…" dropdown is visible
  const [open, setOpen] = useState(false)

  const days = daysUntil(app.deadline)

  // All statuses except the current one — these become the dropdown options
  const nextStatuses = STATUSES.filter(s => s !== app.status)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2.5 shadow-sm hover:shadow-md transition-shadow relative">

      {/* College name */}
      <p className="text-xs font-semibold text-gray-900 leading-snug">{app.college}</p>

      {/* Deadline chip — colour changes based on urgency */}
      {/* Hidden for Offer and Rejected (deadline no longer relevant) */}
      {app.status !== 'Offer' && app.status !== 'Rejected' && (
        <span className={`inline-block text-xs px-2 py-0.5 rounded-lg font-medium
          ${days < 0  ? 'bg-gray-100 text-gray-500'   :
            days < 30 ? 'bg-rose-100 text-rose-700'   :
            days < 90 ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'}`}>
          {days < 0 ? 'Closed' : days === 0 ? 'Today!' : `${days}d left`}
        </span>
      )}

      {/* Special status chips for Offer and Rejected */}
      {app.status === 'Offer' && (
        <span className="inline-block text-xs px-2 py-0.5 rounded-lg font-medium bg-emerald-100 text-emerald-700">
          Offer received
        </span>
      )}
      {app.status === 'Rejected' && (
        <span className="inline-block text-xs px-2 py-0.5 rounded-lg font-medium bg-rose-100 text-rose-500">
          Not selected
        </span>
      )}

      {/* Notes — truncated to 2 lines */}
      {app.notes && (
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{app.notes}</p>
      )}

      {/* ── Move to… dropdown ── */}
      <div className="relative">
        {/* Toggle button — clicking opens/closes the dropdown */}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs text-gray-500 font-medium transition-colors">
          Move to…
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu — appears above the button (bottom-full) */}
        {open && (
          <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
            {nextStatuses.map(s => (
              <button
                key={s}
                onClick={() => { onMove(app.id, s); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                <div className={`w-1.5 h-1.5 rounded-full ${STATUS_META[s].dot}`} />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
