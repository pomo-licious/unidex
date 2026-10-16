import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getAuthErrorMessage } from '../lib/authErrors'
import { AuthShell, inputClass, primaryClass } from '../components/Brand'

export default function Signup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => { document.title = 'Create your profile · Unidex' }, [])
  const change = e => setForm(current => ({ ...current, [e.target.name]: e.target.value }))

  async function handleSubmit(event) {
    event.preventDefault(); setError(''); setMessage('')
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return }
    if (form.password.length < 8) { setError('Choose a password with at least 8 characters.'); return }
    setLoading(true)
    try {
      const referredBy = searchParams.get('ref')
      const { data, error: authError } = await supabase.auth.signUp({ email: form.email.trim(), password: form.password, options: { data: { full_name: form.name.trim(), ...(referredBy ? { referred_by: referredBy } : {}) }, emailRedirectTo: `${window.location.origin}/onboarding` } })
      if (authError) throw authError
      if (!data?.user) throw new Error('Account creation did not complete. Please try again.')
      // A confirmation-required signup has no session yet. Profile completion
      // then happens after verification, rather than attempting an RLS-blocked write.
      if (!data.session) { setMessage('Check your inbox to verify your email. Then sign in to finish your profile.'); return }
      // Onboarding saves the canonical admissions profile after authentication.
      navigate('/onboarding')
    } catch (err) { setError(getAuthErrorMessage(err) || err.message || 'Account creation failed. Please try again.') }
    finally { setLoading(false) }
  }

  async function handleGoogle() {
    setError(''); setLoading(true)
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/onboarding` } })
      if (oauthError) throw oauthError
    } catch (err) { setError(getAuthErrorMessage(err) || err.message) }
    finally { setLoading(false) }
  }

  return <AuthShell title={'Your ambition.\nA clearer first step.'}><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#225feb]">One profile. Every application.</p><h2 className="mt-5 text-[44px] font-medium leading-[1.08] tracking-[-.06em]">Start here.</h2><p className="mb-8 mt-4 text-sm leading-7 text-[#718098]">Make room for your next chapter. Create your Unidex account.</p>
    {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-6 text-red-700">{error}</div>}{message && <div role="status" className="mb-5 flex items-start gap-3 rounded-xl border border-[#d4e2ff] bg-[#f0f5ff] p-4 text-xs leading-6 text-[#225feb]"><Check className="mt-1 h-4 w-4 shrink-0"/>{message}</div>}
    <form onSubmit={handleSubmit} className="space-y-4"><div><label htmlFor="signup-name" className="mb-2 block text-xs font-semibold text-[#52637c]">Full name</label><input id="signup-name" name="name" autoComplete="name" value={form.name} onChange={change} required placeholder="Your full name" className={inputClass}/></div><div><label htmlFor="signup-email" className="mb-2 block text-xs font-semibold text-[#52637c]">Email address</label><input id="signup-email" type="email" name="email" autoComplete="email" value={form.email} onChange={change} required placeholder="you@example.com" className={inputClass}/></div><div><label htmlFor="signup-password" className="mb-2 block text-xs font-semibold text-[#52637c]">Password</label><div className="relative"><input id="signup-password" type={showPassword ? 'text' : 'password'} name="password" autoComplete="new-password" minLength={8} value={form.password} onChange={change} required placeholder="At least 8 characters" className={`${inputClass} pr-12`}/><button type="button" aria-label={showPassword ? 'Hide passwords' : 'Show passwords'} onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8]">{showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div></div><div><label htmlFor="signup-confirm" className="mb-2 block text-xs font-semibold text-[#52637c]">Confirm password</label><input id="signup-confirm" type={showPassword ? 'text' : 'password'} name="confirmPassword" autoComplete="new-password" value={form.confirmPassword} onChange={change} required placeholder="Re-enter your password" className={inputClass}/></div><p className="py-1 text-[11px] leading-6 text-[#8795aa]">By creating an account, you agree to our <Link to="/terms" className="text-[#52637c] underline underline-offset-2">Terms</Link> and <Link to="/privacy" className="text-[#52637c] underline underline-offset-2">Privacy Policy</Link>.</p><button disabled={loading} className={`${primaryClass} w-full`}>{loading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <>Create your profile <ArrowRight className="h-4 w-4"/></>}</button></form>
    <div className="my-6 flex items-center gap-4"><span className="h-px flex-1 bg-[#e8edf5]"/><span className="text-[11px] text-[#9aa7bb]">or continue with</span><span className="h-px flex-1 bg-[#e8edf5]"/></div><button type="button" onClick={handleGoogle} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-full border border-[#dce4f0] py-3.5 text-sm font-medium text-[#52637c] hover:bg-[#f7f9fc] disabled:opacity-50"><span aria-hidden="true" className="font-bold text-[#225feb]">G</span>Google</button><p className="mt-7 text-center text-xs text-[#718098]">Already have an account? <Link to="/login" className="ml-1 font-semibold text-[#225feb]">Sign in</Link></p>
  </AuthShell>
}
