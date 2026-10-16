import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AuthShell, inputClass, primaryClass } from '../components/Brand'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => { document.title = 'Team access · Unidex' }, [])
  async function handleLogin(event) {
    event.preventDefault(); setError(''); setLoading(true)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError) throw new Error('We could not sign you in with those details. Please check your email and password.')
      if (data?.user?.app_metadata?.role !== 'admin') {
        const { error: signOutError } = await supabase.auth.signOut()
        if (signOutError) throw new Error('This account has no team access. Please sign out before trying another account.')
        throw new Error('This account does not have team access. Please use your administrator account.')
      }
      navigate('/admin', { replace: true })
    } catch (err) { setError(err.message || 'Sign in did not complete. Please try again.') } finally { setLoading(false) }
  }
  return <AuthShell title={'A clearer view.\nBehind the scenes.'}><div className="mb-8 grid h-12 w-12 place-items-center rounded-2xl bg-[#edf3ff]"><ShieldCheck className="h-6 w-6 text-[#225feb]" strokeWidth={1.5}/></div><p className="mb-4 text-[10px] font-semibold uppercase tracking-[.2em] text-[#225feb]">Unidex team</p><h2 className="text-[36px] font-semibold leading-tight tracking-[-.05em]">Welcome behind<br/>the experience.</h2><p className="mb-9 mt-4 text-sm leading-7 text-[#8796ad]">Sign in with your authorized administrator account to review feedback and product insights.</p><form onSubmit={handleLogin} className="space-y-6"><div><label htmlFor="admin-email" className="mb-2 block text-xs font-semibold text-[#617696]">Work email</label><input id="admin-email" type="email" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} disabled={loading} className={inputClass} placeholder="you@unidex.co.in"/></div><div><label htmlFor="admin-password" className="mb-2 block text-xs font-semibold text-[#617696]">Password</label><input id="admin-password" type="password" required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={loading} className={inputClass} placeholder="Enter your password"/></div>{error && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-xs leading-6 text-red-700">{error}</div>}<button type="submit" disabled={loading} className={`${primaryClass} w-full`}>{loading ? <><Loader2 className="h-4 w-4 animate-spin"/>Signing in…</> : <>Sign in to team workspace <ArrowRight className="h-4 w-4"/></>}</button></form><p className="mt-8 text-[10px] leading-6 text-[#a1aec1]">Team permissions are controlled by the server. Student accounts cannot access administrator data.</p></AuthShell>
}
