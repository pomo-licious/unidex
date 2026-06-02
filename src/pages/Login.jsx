// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Login.jsx — Sign in for existing users
//
// Authenticates against Supabase auth.users using email + password.
// On success, redirects to /tracker (user's application dashboard).
// On error, displays the Supabase error message.
//
// Route: /login
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // ── handleLogin — authenticate with Supabase ──────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    // Success — redirect to tracker
    navigate('/tracker')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo + branding */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-lg font-bold">U</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Unidex</h1>
          <p className="text-sm text-gray-500 mt-1">MBA Application Hub</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Sign in to your account</h2>
            <p className="text-sm text-gray-500 mt-1">Access your applications and deadlines</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Sign up link */}
          <p className="text-center text-xs text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-indigo-600 hover:text-indigo-700 font-semibold">
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
