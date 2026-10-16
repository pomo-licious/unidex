import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getAuthErrorMessage } from '../lib/authErrors'
import { AuthShell, inputClass, primaryClass } from '../components/Brand'

export default function Login() {
  const { pathname } = useLocation()
  // These aliases share a component type; remount the form when the route changes
  // so a previous reset/login mode and its sensitive inputs cannot carry across.
  return <LoginForm key={pathname} />
}

function LoginForm() {
  const location = useLocation()
  const navigate = useNavigate()
  const callbackHasError = location.pathname === '/reset-password' &&
    [new URLSearchParams(location.search), new URLSearchParams(location.hash.replace(/^#/, ''))]
      .some(params => params.has('error') || params.has('error_code'))
  const [mode, setMode] = useState(() => location.pathname === '/forgot-password' ? 'request' : location.pathname === '/reset-password' ? 'update' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(() => callbackHasError ? 'This reset link is invalid or has expired. Request a new link below.' : '')
  const [message, setMessage] = useState('')
  const [recoverySession, setRecoverySession] = useState(false)

  useEffect(() => {
    document.title = mode === 'login' ? 'Sign in · Unidex' : 'Reset your password · Unidex'
  }, [mode])

  useEffect(() => {
    let active = true
    let recoveryEventReceived = false
    const invalidLinkMessage = 'This reset link is invalid or has expired. Request a new link below.'
    const lookupErrorMessage = 'We could not verify this reset link. Check your connection or request a new link below.'
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || callbackHasError) return
      if (event === 'PASSWORD_RECOVERY') {
        recoveryEventReceived = true
        setMode('update')
        setRecoverySession(!!session)
        setError(session ? '' : invalidLinkMessage)
        setMessage('')
      }
    })
    if (location.pathname === '/reset-password' && mode === 'update' && !callbackHasError) {
      supabase.auth.getSession().then(({ data, error: sessionError }) => {
        // A newer recovery event wins over an earlier in-flight session lookup.
        if (!active || recoveryEventReceived) return
        setRecoverySession(!sessionError && !!data?.session)
        if (sessionError) setError(lookupErrorMessage)
        else if (!data?.session) setError(invalidLinkMessage)
      }).catch(() => {
        if (!active || recoveryEventReceived) return
        setRecoverySession(false)
        setError(lookupErrorMessage)
      })
    }
    return () => { active = false; subscription.unsubscribe() }
  }, [location.pathname, callbackHasError, mode])

  function changeMode(next) { setMode(next); setError(''); setMessage(''); setPassword(''); setConfirmPassword('') }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'request') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
        if (resetError) throw resetError
        setMessage('If an account exists for this email, a password reset link will arrive shortly. Check your inbox and spam folder.')
      } else if (mode === 'update') {
        if (!recoverySession) throw new Error('Open the password reset link from your email to continue. You can request a new link below.')
        if (password.length < 8) throw new Error('Choose a password with at least 8 characters.')
        if (password !== confirmPassword) throw new Error('Passwords do not match.')
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) throw updateError
        setPassword(''); setConfirmPassword('')
        setMessage('Your password has been updated. Your workspace is ready.')
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) throw loginError
        navigate('/profile')
      }
    } catch (err) { setError(getAuthErrorMessage(err) || err.message || 'Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  async function handleGoogle() {
    setError(''); setLoading(true)
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/profile` } })
      if (oauthError) throw oauthError
    } catch (err) { setError(getAuthErrorMessage(err) || err.message) }
    finally { setLoading(false) }
  }

  return <AuthShell><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#225feb]">Your ambition, in one place</p><h2 className="mt-5 text-[44px] font-medium leading-[1.08] tracking-[-.06em] text-[#10264c]">{mode === 'login' ? 'Welcome back.' : mode === 'request' ? 'A fresh start.' : 'Make it yours.'}</h2><p className="mb-9 mt-4 text-sm leading-7 text-[#718098]">{mode === 'login' ? 'Sign in and pick up where you left off.' : mode === 'request' ? 'Enter your email. We’ll send a link to reset your password.' : 'Choose a new password for your Unidex account.'}</p>
    {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-6 text-red-700" role="alert">{error}</div>}
    {message && <div className="mb-5 flex gap-3 rounded-xl border border-[#d4e2ff] bg-[#f0f5ff] p-4 text-xs leading-6 text-[#225feb]" role="status"><Check className="mt-1 h-4 w-4 shrink-0"/><span>{message}</span></div>}
    <form onSubmit={handleSubmit} className="space-y-5">
      {mode !== 'update' && <div><label htmlFor="login-email" className="mb-2.5 block text-xs font-semibold text-[#52637c]">Email address</label><input id="login-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass}/></div>}
      {mode !== 'request' && <div><div className="mb-2.5 flex items-center justify-between"><label htmlFor="login-password" className="block text-xs font-semibold text-[#52637c]">{mode === 'update' ? 'New password' : 'Password'}</label>{mode === 'login' && <button type="button" onClick={() => changeMode('request')} className="text-[11px] font-medium text-[#225feb]">Forgot password?</button>}</div><div className="relative"><input id="login-password" type={showPassword ? 'text' : 'password'} required autoComplete={mode === 'update' ? 'new-password' : 'current-password'} minLength={mode === 'update' ? 8 : undefined} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'update' ? 'At least 8 characters' : 'Your password'} className={`${inputClass} pr-12`}/><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8]">{showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div></div>}
      {mode === 'update' && <div><label htmlFor="confirm-password" className="mb-2.5 block text-xs font-semibold text-[#52637c]">Confirm password</label><input id="confirm-password" type={showPassword ? 'text' : 'password'} required autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass}/></div>}
      <button type="submit" disabled={loading || (mode === 'update' && !recoverySession)} className={`${primaryClass} w-full`}>{loading ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <>{mode === 'login' ? 'Sign in' : mode === 'request' ? 'Send reset link' : 'Save new password'}<ArrowRight className="h-4 w-4"/></>}</button>
    </form>
    {mode === 'login' ? <><div className="my-6 flex items-center gap-4"><span className="h-px flex-1 bg-[#e8edf5]"/><span className="text-[11px] text-[#9aa7bb]">or continue with</span><span className="h-px flex-1 bg-[#e8edf5]"/></div><button type="button" onClick={handleGoogle} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-full border border-[#dce4f0] bg-white py-3.5 text-sm font-medium text-[#52637c] hover:bg-[#f7f9fc] disabled:opacity-50"><span aria-hidden="true" className="text-base font-bold text-[#225feb]">G</span>Google</button><p className="mt-8 text-center text-xs text-[#718098]">New to Unidex? <Link to="/signup" className="ml-1 font-semibold text-[#225feb]">Create your profile</Link></p></> : <div className="mt-7 flex flex-wrap items-center justify-between gap-4 text-xs"><button type="button" onClick={() => { changeMode('login'); navigate('/login', { replace: true }) }} className="font-semibold text-[#225feb]">Back to sign in</button>{mode === 'update' && <button type="button" onClick={() => changeMode('request')} className="text-[#718098]">Request a new link</button>}{mode === 'update' && message && <Link to="/profile" className="font-semibold text-[#225feb]">Open your workspace →</Link>}</div>}
  </AuthShell>
}
