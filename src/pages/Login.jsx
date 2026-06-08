import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Clock, BarChart3, Quote } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      if (signInError.message?.toLowerCase().includes('rate limit') ||
          signInError.message?.toLowerCase().includes('wait') ||
          signInError.message?.toLowerCase().includes('second')) {
        setError('Too many attempts. Please wait a moment and try again.')
      } else {
        setError(signInError.message)
      }
      setLoading(false)
      return
    }

    navigate('/profile')
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* ═══════════════════════════════════════════════════════════════════════════════
          LEFT PANEL — 45% width on desktop, hidden on mobile
          ═══════════════════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex w-[45%] flex-col justify-between p-12 relative"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Dark navy overlay */}
        <div className="absolute inset-0 bg-[#0d1525] opacity-70" />

        {/* Content inside overlay */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Top: Logo + branding */}
          <div className="space-y-4">
            {/* Shield icon + logo text */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[#c9a84c] flex items-center justify-center">
                <span className="text-[#0d1525] text-lg font-bold">U</span>
              </div>
              <div>
                <h1 className="text-white text-2xl font-bold">UNIDEX</h1>
                <p className="text-[#c9a84c] text-xs font-semibold">MBA APPLICATION HUB</p>
              </div>
            </div>

            {/* Hero text — large, white, bold */}
            <div className="mt-16">
              <h2 className="text-white text-5xl font-bold leading-tight mb-4">
                Your MBA journey,<br />organized and simplified.
              </h2>
              <p className="text-gray-300 text-lg">
                Unidex helps you manage applications,<br />deadlines, and documents — all in one place.
              </p>
            </div>
          </div>

          {/* Middle: Three feature rows */}
          <div className="space-y-8 my-12">
            {/* Feature 1: Shield */}
            <div className="flex gap-4">
              <Shield className="w-8 h-8 text-[#c9a84c] shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-semibold text-lg">Secure & private</h3>
                <p className="text-gray-400 text-sm mt-1">Your data is encrypted and always protected.</p>
              </div>
            </div>

            {/* Feature 2: Clock */}
            <div className="flex gap-4">
              <Clock className="w-8 h-8 text-[#c9a84c] shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-semibold text-lg">Stay on track</h3>
                <p className="text-gray-400 text-sm mt-1">Never miss a deadline with smart reminders and timelines.</p>
              </div>
            </div>

            {/* Feature 3: Bar chart */}
            <div className="flex gap-4">
              <BarChart3 className="w-8 h-8 text-[#c9a84c] shrink-0 mt-1" />
              <div>
                <h3 className="text-white font-semibold text-lg">Make informed decisions</h3>
                <p className="text-gray-400 text-sm mt-1">Compare schools, track progress, and move forward with clarity.</p>
              </div>
            </div>
          </div>

          {/* Bottom: Testimonial card */}
          <div className="bg-[#0d1525] border border-gray-700 rounded-lg p-6 space-y-4">
            <Quote className="w-6 h-6 text-[#c9a84c]" />
            <p className="text-gray-300 text-sm leading-relaxed">
              "Unidex kept me organized throughout my application process. It made a complex journey feel simple and achievable."
            </p>
            <div>
              <p className="text-[#c9a84c] font-bold text-sm uppercase">Rishabh M.</p>
              <p className="text-gray-400 text-xs">Admitted to IIM Ahmedabad</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════════
          RIGHT PANEL — 55% width on desktop, full width on mobile
          ═══════════════════════════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[55%] bg-gray-50 flex flex-col justify-between p-6 lg:p-12 overflow-y-auto">
        {/* Login form card — vertically centered */}
        <div className="flex items-center justify-center min-h-screen lg:min-h-0 flex-1">
          <div className="w-full max-w-[420px] space-y-6">
            {/* Title + subtitle */}
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold text-[#0d1525]">Welcome back</h2>
              <p className="text-gray-600 text-sm">Sign in to continue your MBA journey</p>

              {/* Gold underline accent */}
              <div className="flex justify-center pt-2">
                <div className="w-16 h-1 bg-[#c9a84c] rounded-full" />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Login form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email input */}
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin(e)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Password input with show/hide */}
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin(e)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-[#c9a84c]"
                  />
                  <span className="text-gray-700 font-medium">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-[#c9a84c] hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>

              {/* Sign in button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-[#0d1525] text-white font-semibold text-sm hover:bg-[#1a2844] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? 'Signing in…' : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-300" />
                <span className="text-xs text-gray-500 font-medium">or</span>
                <div className="flex-1 h-px bg-gray-300" />
              </div>

              {/* Google button */}
              <button
                type="button"
                onClick={async () => {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: window.location.origin + '/profile' }
                  })
                  if (error) setError(error.message)
                }}
                className="w-full py-2.5 rounded-lg bg-white border-2 border-gray-300 text-gray-900 font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
            </form>

            {/* Sign up link */}
            <p className="text-center text-sm text-gray-700">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/signup')}
                className="text-[#c9a84c] hover:underline font-semibold"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>

        {/* Dashboard preview card */}
        <div className="mt-12 lg:mt-0 lg:pb-12">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg max-w-[420px] mx-auto w-full">
            <div className="space-y-6">
              {/* Card header */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900">Your dashboard at a glance</h3>
                <p className="text-sm text-gray-600">Everything you need to manage your applications.</p>
              </div>

              {/* Mock dashboard */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4 text-xs">
                {/* Welcome message */}
                <div>
                  <p className="font-semibold text-gray-900">Good morning, Student 👋</p>
                  <p className="text-gray-600 text-xs mt-0.5">Here's what's happening with your applications.</p>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded border border-gray-200 p-2 text-center">
                    <p className="font-bold text-gray-900">5</p>
                    <p className="text-gray-600 text-xs">Applications</p>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-2 text-center">
                    <p className="font-bold text-gray-900">3</p>
                    <p className="text-gray-600 text-xs">Deadlines</p>
                  </div>
                  <div className="bg-white rounded border border-gray-200 p-2 text-center">
                    <p className="font-bold text-gray-900">2</p>
                    <p className="text-gray-600 text-xs">Shortlisted</p>
                  </div>
                </div>

                {/* Deadlines section */}
                <div className="border-t border-gray-200 pt-3 space-y-2">
                  <p className="font-semibold text-gray-900">Upcoming deadlines</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">IIM Ahmedabad</span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-semibold">45d</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">XLRI Jamshedpur</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">62d</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-medium">ISB Hyderabad</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">78d</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Security message */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-8 lg:mt-0">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
          </svg>
          <span>Bank-level security. Your data is safe with us.</span>
        </div>
      </div>
    </div>
  )
}
