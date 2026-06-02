// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Profile.jsx — Student profile view
//
// Displays everything about the logged-in student in one place:
// their personal details, academic stats, target colleges with fit scores,
// a summary of where each application stands, and an AI form-fill teaser.
//
// Currently reads from MOCK_STUDENT / MOCK_APPLICATIONS (fake data).
// When wired up: replace those imports with a Supabase query using the
// logged-in user's ID to fetch their real student row and applications.
//
// Route: /profile
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { MOCK_APPLICATIONS, STATUS_META, STATUSES, COLLEGES, TYPE_META, fitLabel } from '../lib/mockData'

export default function Profile() {
  const navigate = useNavigate()

  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)

  // Fetch real student data on mount
  useEffect(() => {
    async function loadStudent() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Not logged in')
          setLoading(false)
          return
        }

        const { data, error: fetchErr } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (fetchErr || !data) {
          setError(fetchErr?.message || 'Student profile not found')
          setLoading(false)
          return
        }

        setStudent(data)
        setLoading(false)
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }

    loadStudent()
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin mx-auto" />
            <p className="text-sm text-gray-400 mt-3">Loading profile…</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !student) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-600 font-medium">{error || 'Profile not found'}</p>
          </div>
        </div>
      </Layout>
    )
  }

  // Shorthand aliases to keep the JSX readable
  const s  = student
  const ab = s.academic_background || {}

  // Generate avatar initials from full name
  const initials = s.name?.split(' ').map(n => n[0]).join('') || 'U'

  // ── statusCounts — count how many applications are in each status ──────────
  // Produces { Researching: 1, Applied: 2, Interview: 1, Offer: 1, Rejected: 1 }
  const statusCounts = STATUSES.reduce((acc, st) => {
    acc[st] = MOCK_APPLICATIONS.filter(a => a.status === st).length
    return acc
  }, {})

  // ── targetCollegeData — look up full college objects for the student's shortlist ──
  // Matches names from target_colleges array against the full COLLEGES list
  const targetCollegeData = COLLEGES.filter(c => s.target_colleges.includes(c.name))

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* ── Profile header card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">

              {/* Avatar with initials */}
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-2xl font-bold text-white shrink-0">
                {initials}
              </div>

              <div>
                <h1 className="text-xl font-bold text-gray-900">{s.name}</h1>
                <p className="text-sm text-gray-600 mt-0.5">{s.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {ab.grad_year && (
                    <>
                      <span className="text-xs bg-indigo-50 text-indigo-600 font-medium px-2 py-0.5 rounded-full">Batch {ab.grad_year}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Edit button — navigates back to onboarding to re-fill the form */}
            <button onClick={() => navigate('/onboarding')}
              className="shrink-0 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Edit Profile
            </button>
          </div>
        </div>

        {/* ── Stats row — 4 key numbers displayed as cards ── */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'CAT Percentile', value: `${ab.cat_percentile}`, unit: '%ile' },
            { label: 'CGPA',           value: `${ab.gpa}`,            unit: '/10'  },
            { label: 'Work Exp',       value: `${ab.work_exp_yrs}`,   unit: 'yrs'  },
            { label: 'Batch',          value: `${ab.grad_year}`,      unit: ''     },
          ].map(({ label, value, unit }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 px-4 py-4 text-center">
              <p className="text-xl font-bold text-gray-900">
                {value}<span className="text-xs font-normal text-gray-400 ml-0.5">{unit}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Target Colleges list with fit scores ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Target Colleges</h2>
            {/* Link to college directory to add more */}
            <button onClick={() => navigate('/colleges')}
              className="text-xs text-indigo-600 font-medium hover:underline">
              + Add colleges
            </button>
          </div>

          <div className="space-y-2">
            {targetCollegeData.map(college => {
              // Calculate fit based on student's percentile vs college cutoff
              const fit = fitLabel(ab.cat_percentile, college.cutoff)
              return (
                <div key={college.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    {/* College type badge */}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_META[college.type].color}`}>
                      {college.type}
                    </span>
                    <span className="text-sm font-medium text-gray-800">{college.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {/* Fit verdict and cutoff percentile on the right */}
                    <span className={`font-medium ${fit.color}`}>{fit.label}</span>
                    <span className="text-gray-400">{college.cutoff_label}%ile</span>
                  </div>
                </div>
              )
            })}
          </div>

          {s.target_colleges.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No colleges added yet.</p>
          )}
        </div>

        {/* ── Application overview — count per status ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Application Overview</h2>
            <button onClick={() => navigate('/tracker')} className="text-xs text-indigo-600 font-medium hover:underline">
              View tracker →
            </button>
          </div>

          {/* 5 status boxes — greyed out if count is 0 */}
          <div className="grid grid-cols-5 gap-2">
            {STATUSES.map(status => (
              <div key={status}
                className={`rounded-xl border p-3 text-center ${STATUS_META[status].border} ${statusCounts[status] > 0 ? '' : 'opacity-50'}`}>
                <p className="text-2xl font-bold text-gray-900">{statusCounts[status]}</p>
                {/* Status label — takes the text colour from STATUS_META */}
                <p className={`text-xs font-medium mt-1 ${STATUS_META[status].color.split(' ')[1]}`}>{status}</p>
              </div>
            ))}
          </div>

          {/* Empty state — shown if no applications exist yet */}
          {MOCK_APPLICATIONS.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400">No applications tracked yet.</p>
              <button onClick={() => navigate('/colleges')} className="mt-2 text-sm text-indigo-600 font-medium hover:underline">
                Browse colleges →
              </button>
            </div>
          )}
        </div>

        {/* ── AI Form Fill teaser banner ── */}
        {/* This feature (Anthropic API auto-fill) is planned for Month 5 in the roadmap */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">AI Form Fill — coming soon</p>
            <p className="text-indigo-200 text-xs mt-1">Claude will auto-fill your SOP and application forms using your profile.</p>
          </div>
          <button className="shrink-0 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors">
            Join waitlist
          </button>
        </div>

      </div>
    </Layout>
  )
}
