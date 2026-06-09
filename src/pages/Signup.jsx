// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Signup.jsx — Account creation page (real Supabase auth)
//
// This is the ONLY page that talks directly to Supabase Auth.
// Step 1: Creates a login account (email + password) via Supabase Auth.
// Step 2: Once auth succeeds, inserts a row into the `students` table with
//         the user's name and academic details.
// Step 3: Redirects to /colleges on success.
//
// This page is separate from Onboarding (which is the more detailed profile
// setup). Signup is the bare minimum to create an account.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'   // The single shared Supabase connection
import { getAuthErrorMessage } from '../lib/authErrors'

export default function Signup() {
  const navigate = useNavigate()   // Used to redirect to another page after success
  const [searchParams] = useSearchParams()
  const referredBy = useMemo(() => searchParams.get('ref'), [searchParams])

  // ── Form state — all field values live here ────────────────────────────────
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    gpa: '',
    cat_percentile: '',
    work_exp_yrs: '',
    grad_year: '',
  })

  // Loading = true while waiting for Supabase to respond (shows spinner text on button)
  const [loading, setLoading] = useState(false)

  // Error = any message returned by Supabase if something goes wrong
  const [error, setError]   = useState(null)

  // ── handleChange — updates a single field in the form state when the user types ──
  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    // Spread operator (...form) copies all existing values, then overwrites just the changed field
  }

  // ── handleSubmit — runs when the user clicks "Create account" ─────────────
  async function handleSubmit(e) {
    e.preventDefault()       // Prevent the browser's default form submission (page reload)
    setLoading(true)
    setError(null)

    // ── Step 1: Create the auth account (email + password login) ──
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    // If Supabase returns an error (e.g. email already used), show it and stop
    if (authError) {
      setError(getAuthErrorMessage(authError))
      setLoading(false)
      return
    }

    // ── Step 2: Insert a matching row into the `students` database table ──
    // We link it to the auth account via user_id so RLS policies work correctly
    const { error: insertError } = await supabase.from('students').insert({
      user_id: authData.user.id,    // ID from the auth account just created
      name:    form.name,
      email:   form.email,
      referred_by: referredBy || null,  // Track who referred this user (if any)
      academic_background: {
        // Convert text inputs to proper numbers; use null if the field was left blank
        gpa:            form.gpa            ? parseFloat(form.gpa)            : null,
        cat_percentile: form.cat_percentile ? parseFloat(form.cat_percentile) : null,
        work_exp_yrs:   form.work_exp_yrs   ? parseInt(form.work_exp_yrs)     : null,
        grad_year:      form.grad_year      ? parseInt(form.grad_year)        : null,
      },
    })

    // If the database insert fails (e.g. duplicate email), show the error
    if (insertError) {
      setError(getAuthErrorMessage(insertError))
      setLoading(false)
      return
    }

    // ── Step 3: Everything succeeded — go to college discovery ──
    navigate('/colleges')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
        <p className="text-sm text-gray-500 mb-6">Track your MBA applications in one place.</p>

        {/* Error banner — only visible when error state is set */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <form className="space-y-4">

          {/* Required fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input name="name" type="text" required value={form.name} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Arjun Sharma" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input name="email" type="email" required value={form.email} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="arjun@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input name="password" type="password" required minLength={6} value={form.password} onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Min. 6 characters" />
          </div>

          {/* Optional academic fields — stored in the `academic_background` JSONB column */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">
            Academic background (optional)
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GPA / CGPA</label>
              <input name="gpa" type="number" step="0.01" min="0" max="10" value={form.gpa} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="8.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CAT percentile</label>
              <input name="cat_percentile" type="number" step="0.01" min="0" max="100" value={form.cat_percentile} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="95.5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work exp (yrs)</label>
              <input name="work_exp_yrs" type="number" min="0" max="20" value={form.work_exp_yrs} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grad year</label>
              <input name="grad_year" type="number" min="2000" max="2030" value={form.grad_year} onChange={handleChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="2022" />
            </div>
          </div>

          {/* Submit button — shows "Creating account…" while loading */}
          <button type="button" onClick={handleSubmit} disabled={loading}
            className="w-full mt-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        {/* Link to login page (not yet built) */}
        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline font-medium">Log in</Link>
        </p>
      </div>
    </div>
  )
}
