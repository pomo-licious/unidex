// ─────────────────────────────────────────────────────────────────────────────
// src/pages/AppTracker.jsx — Application status kanban board (Supabase-backed)
//
// All four CRUD operations now talk directly to Supabase:
//
//   LOAD   — SELECT applications.*, colleges(name,location,type,deadlines)
//            RLS automatically filters to the logged-in student's rows only.
//
//   ADD    — INSERT into applications (student_id, college_id, status, notes)
//            Requires fetching the student's UUID first (auth.uid() → students.id)
//
//   MOVE   — UPDATE applications SET status = ? WHERE id = ?
//            Optimistic update: UI changes instantly, rolled back if Supabase rejects.
//
//   DELETE — DELETE FROM applications WHERE id = ?
//            Optimistic removal with snapshot rollback on error.
//
// Note: The `colleges` table must be seeded before the Add modal dropdown works.
// Route: /tracker
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { STATUSES, STATUS_META } from '../lib/mockData'
import { useIsDemo } from '../context/DemoContext'
import { SidebarAds } from '../components/AdBanner'
import { createDeadlineNotifications } from '../lib/notificationHelpers'
import RejectionRecoveryModal from '../components/RejectionRecoveryModal'

// ─── Helper: days from today until a date string ──────────────────────────────
// Uses the real current date (unlike the hardcoded version in mockData.js)
function daysFromNow(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)   // Strip time so comparison is date-only
  return Math.round((new Date(dateStr) - today) / (1000 * 60 * 60 * 24))
}

// ─── Helper: pick the nearest deadline from colleges.deadlines JSONB ─────────
// colleges.deadlines is an array of { round, date, type } objects
// Returns the earliest upcoming date, or the latest past date if all are closed
function nearestDeadline(deadlines) {
  if (!Array.isArray(deadlines) || deadlines.length === 0) return null
  const today = new Date().toISOString().split('T')[0]   // "YYYY-MM-DD"
  const dates = deadlines.map(d => d.date).filter(Boolean).sort()
  const future = dates.filter(d => d >= today)
  return future[0] ?? dates[dates.length - 1] ?? null   // Prefer upcoming; fall back to most recent past
}

// ─── Helper: normalise a raw Supabase application row into a flat UI object ──
// Supabase returns nested colleges: { name, location, type, deadlines }
// We flatten this so every component just reads app.college, app.deadline, etc.
function normaliseApp(row) {
  return {
    id:         row.id,
    status:     row.status,
    notes:      row.notes,
    college_id: row.college_id,
    college:    row.colleges?.name     ?? 'Unknown college',
    location:   row.colleges?.location ?? '',
    type:       row.colleges?.type     ?? '',
    deadline:   nearestDeadline(row.colleges?.deadlines),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AppTracker — main page component
// ─────────────────────────────────────────────────────────────────────────────
export default function AppTracker() {
  const navigate = useNavigate()
  const isDemo   = useIsDemo()

  // ── Data state ─────────────────────────────────────────────────────────────
  const [apps, setApps]           = useState([])        // flattened application rows
  const [allColleges, setAllColleges] = useState([])    // all colleges (for add modal)
  const [studentId, setStudentId] = useState(null)      // students.id for the logged-in user

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [newApp, setNewApp]       = useState({ college_id: '', notes: '' })
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [rejectionCollege, setRejectionCollege] = useState(null)
  const [dismissedRejections, setDismissedRejections] = useState(new Set())

  // Load dismissed rejections from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('dismissedRejections')
    if (stored) {
      try {
        setDismissedRejections(new Set(JSON.parse(stored)))
      } catch (err) {
        console.error('Failed to load dismissed rejections:', err)
      }
    }
  }, [])

  // ── loadData — fetches everything needed to render the board ──────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Step 1: confirm the user is logged in
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setError('You need to be logged in to view your applications.')
      setLoading(false)
      return
    }

    // Step 2: get the student row ID — needed for INSERT later
    // RLS on students means this only returns their own row
    const { data: studentRow, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (studentError || !studentRow) {
      console.error('Student lookup failed:', { studentError, studentRow, userId: user.id })
      setError(`No student profile found. ${studentError?.message || 'Please complete your signup first.'}`)
      setLoading(false)
      return
    }
    setStudentId(studentRow.id)

    // Step 3: fetch all applications for this student, joined with college details
    // Explicitly filter by student_id + RLS for double protection
    const { data: appRows, error: appError } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        notes,
        last_updated,
        college_id,
        colleges (
          name,
          location,
          type,
          deadlines
        )
      `)
      .eq('student_id', studentRow.id)
      .order('last_updated', { ascending: false })

    if (appError) {
      setError(`Failed to load applications: ${appError.message}`)
      setLoading(false)
      return
    }
    setApps(appRows.map(normaliseApp))

    // Step 4: fetch all colleges for the add-application modal dropdown
    // Public read — no auth needed, but will be empty until the table is seeded
    const { data: collegeRows } = await supabase
      .from('colleges')
      .select('id, name, type, location')
      .order('name')

    if (collegeRows) setAllColleges(collegeRows)

    setLoading(false)
  }, [])

  // Run loadData once when the component first mounts
  useEffect(() => { loadData() }, [loadData])

  // ── addApp — INSERT a new application row into Supabase ───────────────────
  async function addApp() {
    if (!newApp.college_id || !studentId) return
    setSaving(true)
    setSaveError(null)

    // Insert the row and immediately select it back with the college join
    // so we can add it to local state without a full re-fetch
    const { data, error: insertError } = await supabase
      .from('applications')
      .insert({
        student_id: studentId,
        college_id: newApp.college_id,
        status:     'Researching',
        notes:      newApp.notes || null,
      })
      .select(`
        id, status, notes, last_updated, college_id,
        colleges ( name, location, type, deadlines )
      `)
      .single()

    if (insertError) {
      setSaveError(insertError.message)
      setSaving(false)
      return
    }

    // Prepend the new app to local state (newest first, no full re-fetch needed)
    setApps(prev => [normaliseApp(data), ...prev])
    setNewApp({ college_id: '', notes: '' })
    setSaving(false)
    setShowAdd(false)
  }

  // ── moveApp — UPDATE status with optimistic UI ────────────────────────────
  async function moveApp(id, newStatus) {
    // Capture old status so we can roll back if Supabase rejects the update
    const app = apps.find(a => a.id === id)
    const oldStatus = app?.status

    // Optimistic update — move the card instantly in the UI
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a))

    const { error: updateError } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', id)

    // Roll back to original status if the update failed
    if (updateError) {
      setApps(prev => prev.map(a => a.id === id ? { ...a, status: oldStatus } : a))
      setError(`Failed to move card: ${updateError.message}`)
      return
    }

    // Create notifications if status changes to Applied or Interview
    if ((newStatus === 'Applied' || newStatus === 'Interview') && studentId) {
      await createDeadlineNotifications(supabase, studentId, app.college_id)
    }

    // Show rejection recovery modal if status changes to Rejected
    if (newStatus === 'Rejected' && !dismissedRejections.has(app.college_id)) {
      setRejectionCollege(app.college_id)
    }

    // Navigate to offer celebration if status changes to Offer
    if (newStatus === 'Offer') {
      setTimeout(() => navigate(`/offer/${app.college_id}`), 500)
    }
  }

  // ── handleAddFromRecovery — add college and close modal ──────────────────
  async function handleAddFromRecovery(collegeId) {
    if (!studentId) return

    try {
      const { error } = await supabase.from('applications').insert({
        student_id: studentId,
        college_id: collegeId,
        status: 'Researching',
        notes: '',
      })

      if (error) {
        setError(`Failed to add college: ${error.message}`)
        return
      }

      // Reload applications
      loadData()

      // Close modal and mark as dismissed
      handleCloseRejectionModal()
    } catch (err) {
      setError(err.message)
    }
  }

  // ── handleCloseRejectionModal — dismiss rejection and save to localStorage ──
  function handleCloseRejectionModal() {
    if (rejectionCollege) {
      const updated = new Set(dismissedRejections)
      updated.add(rejectionCollege)
      setDismissedRejections(updated)
      localStorage.setItem('dismissedRejections', JSON.stringify(Array.from(updated)))
    }
    setRejectionCollege(null)
  }

  // ── deleteApp — DELETE with optimistic removal ────────────────────────────
  async function deleteApp(id) {
    // Snapshot the full list so we can restore it if the delete fails
    const snapshot = [...apps]
    setApps(prev => prev.filter(a => a.id !== id))

    const { error: deleteError } = await supabase
      .from('applications')
      .delete()
      .eq('id', id)

    // Restore snapshot if delete failed
    if (deleteError) {
      setApps(snapshot)
      setError(`Failed to delete: ${deleteError.message}`)
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  // Group apps by status for column rendering: { Researching: [...], Applied: [...] }
  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = apps.filter(a => a.status === s)
    return acc
  }, {})

  // Next action hints for each status
  const nextActions = {
    'Researching': '👀 Study materials',
    'Applied': '⏳ Await response',
    'Interview': '📚 Prepare talking points',
    'Offer': '🎉 Congratulations',
    'Rejected': null
  }

  // Colleges the user isn't already tracking — shown in the add modal dropdown
  const trackedIds      = new Set(apps.map(a => a.college_id))
  const addableColleges = allColleges.filter(c => !trackedIds.has(c.id))

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout>
      {/* Two-column layout: kanban + right ad sidebar (demo mode only) */}
      <div className="flex items-start">
      <div className="flex-1 min-w-0 px-6 py-8">

        {/* ── Page header + Add button ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
            <p className="text-sm text-gray-500 mt-1">
              {loading
                ? 'Loading…'
                : `${apps.length} college${apps.length !== 1 ? 's' : ''} tracked`}
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add College
          </button>
        </div>

        {/* ── Error banner — dismissible ── */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600 font-bold">✕</button>
          </div>
        )}

        {/* ── Loading spinner ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
            <p className="text-sm text-gray-400">Loading your applications…</p>
          </div>

        ) : (
          <>
            {/* ── Status summary pills ── */}
            <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
              {STATUSES.map(s => (
                <div key={s}
                  className={`shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${STATUS_META[s].border} bg-white`}>
                  <div className={`w-2 h-2 rounded-full ${STATUS_META[s].dot}`} />
                  <span className="text-xs font-medium text-gray-700">{s}</span>
                  <span className={`text-sm font-bold ${STATUS_META[s].color.split(' ')[1]}`}>
                    {byStatus[s].length}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Progress Summary Cards ── */}
            {apps.length > 0 && (
              <div className="grid md:grid-cols-4 gap-3 mb-8">
                {[
                  { label: 'Applied', count: byStatus['Applied'].length, color: 'bg-blue-100 text-blue-700' },
                  { label: 'Target', count: apps.length, color: 'bg-indigo-100 text-indigo-700' },
                  { label: 'In Progress', count: byStatus['Interview'].length, color: 'bg-amber-100 text-amber-700' },
                  { label: 'Offers', count: byStatus['Offer'].length, color: 'bg-green-100 text-green-700' },
                ].map((stat, idx) => (
                  <div key={idx} className={`${stat.color} rounded-lg p-3 text-center border border-current/20`}>
                    <p className="text-2xl font-bold">{stat.count}</p>
                    <p className="text-xs font-medium mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Empty state ── */}
            {apps.length === 0 ? (
              <div className="text-center py-32">
                <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-6" />
                <h2 className="text-xl text-slate-600 font-semibold mb-2">No applications yet</h2>
                <p className="text-slate-400 mb-8">Add colleges from the directory to start tracking your MBA journey.</p>
                <button
                  onClick={() => navigate('/colleges')}
                  className="px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors">
                  Browse colleges →
                </button>
              </div>

            ) : (
              /* ── Kanban board — horizontally scrollable ── */
              <div className="flex gap-4 overflow-x-auto pb-4">
                {STATUSES.map(status => (
                  <div key={status} className="w-56 shrink-0 flex flex-col gap-3">

                    {/* Column header: dot + name + count */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${STATUS_META[status].dot}`} />
                        <span className="text-xs font-semibold text-gray-700">{status}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-400">{byStatus[status].length}</span>
                    </div>

                    {/* Dashed drop zone */}
                    <div className={`min-h-[120px] rounded-xl border-2 border-dashed ${STATUS_META[status].border} p-2 space-y-2`}>
                      {byStatus[status].map(app => (
                        <AppCard key={app.id} app={app} onMove={moveApp} onDelete={deleteApp} nextActions={nextActions} />
                      ))}
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
          </>
        )}

        {/* ── Rejection Recovery modal ── */}
        {rejectionCollege && (
          <RejectionRecoveryModal
            studentId={studentId}
            collegeId={rejectionCollege}
            onClose={handleCloseRejectionModal}
            onAddCollege={handleAddFromRecovery}
          />
        )}

        {/* ── Add College modal ── */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Add College to Tracker</h3>

              {/* Save error */}
              {saveError && (
                <p className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                  {saveError}
                </p>
              )}

              <div className="space-y-3">
                {/* College selector */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">College *</label>
                  {addableColleges.length === 0 ? (
                    // Colleges table not yet seeded — show friendly message
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                      <p className="text-xs text-amber-700 font-medium">No colleges available yet</p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        The college database needs to be seeded first.
                        <button onClick={() => navigate('/colleges')} className="ml-1 underline">
                          Browse the directory →
                        </button>
                      </p>
                    </div>
                  ) : (
                    <select
                      value={newApp.college_id}
                      onChange={e => setNewApp(n => ({ ...n, college_id: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      <option value="">Select a college…</option>
                      {addableColleges.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Notes */}
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
                <button
                  onClick={() => { setShowAdd(false); setSaveError(null) }}
                  className="flex-1 py-2 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={addApp}
                  disabled={!newApp.college_id || saving}
                  className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                  {saving ? 'Adding…' : 'Add to Tracker'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

        {/* Right ad sidebar — only visible for demo@unidex.in, hidden on mobile */}
        {isDemo && (
          <div className="w-72 shrink-0 px-4 py-8 hidden lg:block">
            <SidebarAds />
          </div>
        )}
      </div>
    </Layout>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AppCard — single kanban card
//
// Props:
//   app      — flat application object: { id, college, status, notes, deadline, type }
//   onMove   — (id, newStatus) called when user picks a status from the dropdown
//   onDelete — (id) called when user confirms deletion
// ─────────────────────────────────────────────────────────────────────────────
function AppCard({ app, onMove, onDelete, nextActions = {} }) {
  const navigate = useNavigate()
  const isDemo   = useIsDemo()

  // menuOpen — whether the "Move to…" status dropdown is visible
  const [menuOpen, setMenuOpen]           = useState(false)

  // confirmDelete — shows an inline "Remove this? Yes / No" prompt before deleting
  const [confirmDelete, setConfirmDelete] = useState(false)

  // sopOpen — whether the SOP checklist is expanded
  const [sopOpen, setSopOpen] = useState(false)

  // sopState — the 5-item checklist for SOP steps
  const [sopState, setSopState] = useState(() => {
    // Parse notes to extract SOP checklist if it exists
    try {
      const data = JSON.parse(app.notes || '{}')
      return data.sop || [false, false, false, false, false]
    } catch {
      return [false, false, false, false, false]
    }
  })

  const days         = daysFromNow(app.deadline)
  const nextStatuses = STATUSES.filter(s => s !== app.status)
  const sopDone      = sopState.filter(Boolean).length

  // ── saveSop — updates the SOP state in Supabase ──────────────────────────────
  async function saveSop(newSop) {
    setSopState(newSop)

    // Merge with existing notes: parse, update sop, serialize
    let data = {}
    try {
      data = JSON.parse(app.notes || '{}')
    } catch {
      data = {}
    }
    data.sop = newSop
    const merged = JSON.stringify(data)

    const { error } = await supabase
      .from('applications')
      .update({ notes: merged })
      .eq('id', app.id)

    if (error) {
      console.error('Failed to save SOP:', error)
    }
  }

  // ── toggleSopStep — flip a single checklist item ────────────────────────────
  function toggleSopStep(index) {
    const newSop = [...sopState]
    newSop[index] = !newSop[index]
    saveSop(newSop)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2.5 shadow-sm hover:shadow-md transition-shadow relative">

      {/* College name + delete icon */}
      <div className="flex items-start justify-between gap-1">
        <span
          onClick={() => navigate(`/college/${app.college_id}`)}
          className="text-xs font-semibold text-gray-900 leading-snug cursor-pointer hover:text-indigo-600 hover:underline transition-colors">
          {app.college}
        </span>
        <button
          onClick={() => setConfirmDelete(true)}
          title="Remove application"
          className="shrink-0 p-0.5 text-gray-300 hover:text-rose-400 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Inline delete confirmation — avoids a separate modal for a small action */}
      {confirmDelete && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 flex items-center justify-between gap-2">
          <p className="text-xs text-rose-700">Remove this?</p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-2 py-0.5 rounded bg-white border border-rose-200 text-rose-600 hover:bg-rose-50">
              No
            </button>
            <button
              onClick={() => onDelete(app.id)}
              className="text-xs px-2 py-0.5 rounded bg-rose-500 text-white hover:bg-rose-600">
              Yes
            </button>
          </div>
        </div>
      )}

      {/* Deadline urgency chip — hidden for Offer and Rejected cards */}
      {app.status !== 'Offer' && app.status !== 'Rejected' && days !== null && (
        <span className={`inline-block text-xs px-2 py-0.5 rounded-lg font-medium
          ${days < 0  ? 'bg-gray-100 text-gray-500'   :
            days < 30 ? 'bg-rose-100 text-rose-700'   :
            days < 90 ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'}`}>
          {days < 0 ? 'Closed' : days === 0 ? 'Today!' : `${days}d left`}
        </span>
      )}

      {/* Terminal status chips */}
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

      {/* Next Action Hint */}
      {nextActions[app.status] && (
        <p className="text-xs text-gray-600 mt-2 italic">💡 {nextActions[app.status]}</p>
      )}

      {/* Notes — extract text from stored JSON */}
      {(() => {
        try {
          const data = JSON.parse(app.notes || '{}')
          const textNotes = data.text || app.notes
          return textNotes && <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{textNotes}</p>
        } catch {
          return app.notes && <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{app.notes}</p>
        }
      })()}

      {/* SOP Checklist */}
      <div className="border-t border-gray-100 pt-2">
        {/* Collapsed view: show toggle + progress */}
        {!sopOpen ? (
          <button
            onClick={() => setSopOpen(true)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs text-gray-500 font-medium transition-colors">
            SOP Checklist {sopDone > 0 && <span className="text-gray-400">· {sopDone}/5 done</span>}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        ) : (
          /* Expanded view: checklist items */
          <div className="space-y-1.5">
            {[
              'Research college thoroughly',
              'First SOP draft written',
              'Peer review done',
              'Mentor review done',
              'Final SOP submitted',
            ].map((step, i) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sopState[i] || false}
                  onChange={() => toggleSopStep(i)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={`text-xs ${sopState[i] ? 'text-gray-500 line-through' : 'text-gray-600'}`}>
                  {step}
                </span>
              </label>
            ))}
            <button
              onClick={() => setSopOpen(false)}
              className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ✕ close
            </button>
          </div>
        )}
      </div>

      {/* Apply Now button — demo accounts only */}
      {isDemo ? (
        <button
          onClick={() => navigate(`/apply/${app.id}`)}
          className="w-full px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-xs font-medium text-emerald-700 transition-colors border border-emerald-200">
          Apply Now →
        </button>
      ) : (
        <button
          disabled
          title="Coming soon"
          className="w-full px-2 py-1.5 rounded-lg bg-gray-50 text-xs font-medium text-gray-400 cursor-not-allowed opacity-50">
          Apply Now →
        </button>
      )}

      {/* Move to… dropdown */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs text-gray-500 font-medium transition-colors">
          Move to…
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown — floats above the button */}
        {menuOpen && (
          <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
            {nextStatuses.map(s => (
              <button
                key={s}
                onClick={() => { onMove(app.id, s); setMenuOpen(false) }}
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
