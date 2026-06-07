import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@unidex.co.in')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Sign in with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Invalid credentials')
        setLoading(false)
        return
      }

      // Check if user has admin role
      const { data: { user } } = await supabase.auth.getUser()
      const isAdmin = user?.app_metadata?.role === 'admin'

      if (!isAdmin) {
        // Sign out immediately if not admin
        await supabase.auth.signOut()
        setError('Access denied — admin only')
        setLoading(false)
        return
      }

      // Navigate to admin dashboard
      navigate('/admin', { replace: true })
    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col">
      {/* Header */}
      <div className="p-6">
        <span className="text-sm text-slate-500">⚙ Unidex Admin</span>
      </div>

      {/* Login card */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-[#0F2040] border border-slate-700 rounded-2xl p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
            <p className="text-sm text-red-400">Restricted to authorised personnel only</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-[#0A1628] border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="admin@unidex.co.in"
              />
            </div>

            {/* Password input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-[#0A1628] border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="••••••••"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Signing in…' : 'Sign in to admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
