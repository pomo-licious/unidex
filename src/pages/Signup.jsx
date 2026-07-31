// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Signup.jsx — Account creation page (real Supabase auth)
//
// Step 1: Creates a login account (email + password) via Supabase Auth.
// Step 2: Once auth succeeds, inserts a row into the `students` table with
//         the user's name + email. Academic details are collected later in
//         the Onboarding flow.
// Step 3: Redirects to /onboarding on success.
//
// Google sign-up uses the existing shared Supabase client via OAuth. No keys
// are hardcoded — they come from environment variables in src/lib/supabase.js.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Shield, Clock, BarChart3, Quote } from 'lucide-react'
import { supabase } from '../lib/supabase'   // The single shared Supabase connection
import { getAuthErrorMessage } from '../lib/authErrors'

export default function Signup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const referredBy = useMemo(() => searchParams.get('ref'), [searchParams])

  // ── Form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    document.title = 'Create your profile · Unidex'
  }, [])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // ── Email + password sign-up ─────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    // Client-side validation before hitting Supabase
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    // Step 1: Create the auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError) {
      setError(getAuthErrorMessage(authError))
      setLoading(false)
      return
    }

    // Step 2: Insert a matching row into the `students` table
    const { error: insertError } = await supabase.from('students').insert({
      user_id: authData.user.id,
      name: form.name,
      email: form.email,
      referred_by: referredBy || null,
    })

    if (insertError) {
      console.error('Failed to create student profile:', insertError)
      setError('Account creation failed at final step. Please contact support with your email: ' + form.email)
      setLoading(false)
      return
    }

    // Step 3: Continue to onboarding to complete the profile
    navigate('/onboarding')
  }

  // ── Google sign-up (Supabase OAuth) ──────────────────────────────────────────
  async function handleGoogleSignup() {
    setError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // After Google auth completes, land on the profile/dashboard.
      // TODO: if you prefer new Google users to complete onboarding first,
      // change this to `${window.location.origin}/onboarding`.
      options: { redirectTo: window.location.origin + '/profile' },
    })
    if (oauthError) setError(oauthError.message)
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* ═══════════════════════════════════════════════════════════════════════
          LEFT PANEL — brand promise (hidden on mobile)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex w-[45%] flex-col justify-between p-12 relative"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-[#0d1525] opacity-70" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <Link to="/" className="inline-block hover:opacity-80 transition">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[#c9a84c] flex items-center justify-center">
                <span className="text-[#0d1525] text-lg font-bold">U</span>
              </div>
              <div>
                <h1 className="text-white text-2xl font-bold">UNIDEX</h1>
                <p className="text-[#c9a84c] text-xs font-semibold">MBA APPLICATION HUB</p>
              </div>
            </div>
          </Link>

          {/* Headline */}
          <div className="mt-16">
            <h2 className="text-white text-5xl font-bold leading-tight mb-4">
              One profile.<br />All your applications.
            </h2>
            <p className="text-gray-300 text-lg">
              Create your Unidex profile once and reuse it across<br />every MBA application you track.
            </p>
          </div>

          {/* Feature rows */}
          <div className="space-y-8 my-12">
            <div className="flex gap-4">
              <Shield className="w-8 h-8 text-[#c9a84c] shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-semibold text-lg">Secure &amp; private</h3>
                <p className="text-gray-400 text-sm mt-1">Your data is encrypted and always protected.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Clock className="w-8 h-8 text-[#c9a84c] shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-semibold text-lg">Never miss a deadline</h3>
                <p className="text-gray-400 text-sm mt-1">Smart reminders keep every application on track.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <BarChart3 className="w-8 h-8 text-[#c9a84c] shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-semibold text-lg">Apply with confidence</h3>
                <p className="text-gray-400 text-sm mt-1">Submit complete, accurate applications every time.</p>
              </div>
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-[#0d1525] border border-gray-700 rounded-lg p-6 space-y-4">
            <Quote className="w-6 h-6 text-[#c9a84c]" />
            <p className="text-gray-300 text-sm leading-relaxed">
              Unidex kept me organized throughout my application process. It made a complex journey feel simple and achievable.
            </p>
            <div>
              <p className="text-[#c9a84c] font-bold text-sm uppercase">— Rishabh M.</p>
              <p className="text-gray-400 text-xs">Admitted to INSEAD</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          RIGHT PANEL — sign-up form
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[55%] bg-gray-50 flex flex-col justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="flex items-center justify-center flex-1">
          <div className="w-full max-w-[420px] space-y-6 py-8">
            {/* Mobile logo */}
            <Link to="/" className="lg:hidden flex items-center justify-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-lg bg-[#c9a84c] flex items-center justify-center">
                <span className="text-[#0d1525] text-sm font-bold">U</span>
              </div>
              <span className="text-lg font-bold text-[#0d1525]">UNIDEX</span>
            </Link>

            {/* Title */}
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold text-[#0d1525]">Create your Unidex profile</h2>
              <p className="text-gray-600 text-sm">Start organizing your MBA applications from one place.</p>
              <div className="flex justify-center pt-2">
                <div className="w-16 h-1 bg-[#c9a84c] rounded-full" />
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full name */}
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">Full name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Arjun Sharma"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min. 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.confirmPassword}
                    onChange={handleChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                    placeholder="Re-enter your password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Create profile button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#0d1525] text-white font-semibold text-sm hover:bg-[#1a2844] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? 'Creating profile…' : (<>Create profile <ArrowRight className="w-4 h-4" /></>)}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-300" />
                <span className="text-xs text-gray-500 font-medium">or</span>
                <div className="flex-1 h-px bg-gray-300" />
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleSignup}
                className="w-full py-2.5 rounded-lg bg-white border-2 border-gray-300 text-gray-900 font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
            </form>

            {/* Sign in link */}
            <p className="text-center text-sm text-gray-700">
              Already have an account?{' '}
              <Link to="/login" className="text-[#c9a84c] hover:underline font-semibold">Sign in</Link>
            </p>

            {/* Legal */}
            <div className="flex items-center justify-center gap-6 text-xs text-gray-500 pt-2">
              <button onClick={() => navigate('/privacy')} className="hover:text-gray-700 transition">Privacy</button>
              <span>•</span>
              <button onClick={() => navigate('/terms')} className="hover:text-gray-700 transition">Terms</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
