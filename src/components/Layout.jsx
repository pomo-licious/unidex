import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, ChevronRight, FilePenLine, Files, GraduationCap, HelpCircle, LayoutDashboard, LogIn, LogOut, Menu, MessageSquare, ShieldCheck, X, ListChecks, ArrowUpRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Brand from './Brand'

const NAV = [
  { to: '/profile', label: 'Overview', icon: LayoutDashboard },
  { to: '/colleges', label: 'Explore colleges', icon: GraduationCap },
  { to: '/tracker', label: 'My applications', icon: ListChecks },
  { to: '/application-builder', label: 'Application form', icon: FilePenLine },
  { to: '/documents', label: 'My documents', icon: Files },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/reminders', label: 'Reminders', icon: Bell },
]

export default function Layout({ children }) {
  const [sessionUser, setSessionUser] = useState(null)
  const [student, setStudent] = useState(null)
  const [notificationCount, setNotificationCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const activeLabel = NAV.find(item => location.pathname.startsWith(item.to))?.label || (location.pathname.startsWith('/admin') ? 'Team workspace' : 'Unidex')

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      setSessionUser(data?.session?.user || null)
      if (error) setSessionError('Your session could not be checked. Please sign in again.')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (active) setSessionUser(session?.user || null)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    let active = true
    async function loadWorkspace() {
      if (!sessionUser?.id) { setStudent(null); setNotificationCount(0); return }
      const { data, error } = await supabase.from('students').select('id, name').eq('user_id', sessionUser.id).maybeSingle()
      if (!active) return
      if (error) { setSessionError('Some workspace details could not be loaded.'); return }
      setStudent(data)
      if (!data?.id) return
      const today = new Date()
      const sevenDays = new Date(today)
      sevenDays.setDate(sevenDays.getDate() + 7)
      const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('student_id', data.id).eq('sent', false).gte('due_date', localDate(today)).lte('due_date', localDate(sevenDays))
      if (active) setNotificationCount(count || 0)
    }
    loadWorkspace().catch(() => { if (active) setSessionError('Some workspace details could not be loaded.') })
    return () => { active = false }
  }, [sessionUser?.id])

  useEffect(() => {
    const close = event => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])

  async function handleLogout() {
    setSigningOut(true)
    const { error } = await supabase.auth.signOut()
    setSigningOut(false)
    if (error) { setSessionError('Sign out did not complete. Please try again.'); return }
    setMenuOpen(false)
    navigate('/')
  }

  const displayName = student?.name || sessionUser?.user_metadata?.full_name || 'Your workspace'

  return <div className="min-h-screen bg-[#f7f9fc] text-[#10264c]">
    <a href="#workspace-main" className="sr-only z-[70] rounded-full bg-white px-5 py-3 text-sm text-[#225feb] focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
    {menuOpen && <button type="button" className="fixed inset-0 z-40 bg-[#10264c]/35 backdrop-blur-sm lg:hidden" aria-label="Close menu" onClick={() => setMenuOpen(false)}/>}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-[#10264c] px-5 pb-5 pt-8 transition-transform duration-300 motion-reduce:transition-none lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Workspace navigation">
      <div className="flex items-center justify-between px-3"><Brand light className="[&>img]:w-[156px]"/><button type="button" onClick={() => setMenuOpen(false)} className="rounded-lg p-2 text-white/70 lg:hidden" aria-label="Close menu"><X className="h-5 w-5"/></button></div>
      <p className="mb-5 mt-12 px-4 text-[10px] font-semibold uppercase tracking-[.2em] text-[#8da7ce]">Your next chapter</p>
      <nav className="space-y-1.5">{NAV.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `group flex items-center gap-3.5 rounded-xl px-4 py-3 text-[13px] font-medium transition ${isActive ? 'bg-white text-[#10264c] shadow-lg shadow-black/5' : 'text-[#bdcee7] hover:bg-white/10 hover:text-white'}`}><Icon className="h-[18px] w-[18px]" strokeWidth={1.7}/><span>{label}</span>{to === '/reminders' && notificationCount > 0 && <span className="ml-auto rounded-full bg-[#ff762e] px-1.5 py-0.5 text-[9px] text-white">{notificationCount > 9 ? '9+' : notificationCount}</span>}</NavLink>)}</nav>
      <div className="mt-auto pt-8"><div className="mx-2 mb-5 rounded-2xl border border-white/10 bg-white/[.04] p-4"><div className="flex items-center gap-2 text-[11px] font-medium text-white"><span className="h-1.5 w-1.5 rounded-full bg-[#ff762e]"/>A little more clarity.</div><p className="mt-2 text-[11px] leading-5 text-[#a4bbdc]">Bring your options, documents and next steps together.</p></div><div className="flex items-center gap-2 px-4 text-[11px] text-[#a4bbdc]"><Link to="/feedback" onClick={() => setMenuOpen(false)} className="flex items-center gap-1.5 hover:text-white"><MessageSquare className="h-3 w-3"/>Feedback</Link><span className="text-white/20">·</span><Link to={sessionUser?.app_metadata?.role === 'admin' ? '/admin' : '/admin/login'} onClick={() => setMenuOpen(false)} className="hover:text-white">Team access</Link></div><div className="mt-5 border-t border-white/10 px-3 pt-5">{sessionUser ? <div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#2c4770] text-sm font-semibold text-white">{displayName.charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{displayName}</p><p className="mt-1 text-[10px] text-[#91aacd]">MBA applicant</p></div><button onClick={handleLogout} disabled={signingOut} aria-label="Sign out" className="rounded-lg p-2 text-[#a4bbdc] hover:bg-white/10 hover:text-white disabled:opacity-50"><LogOut className="h-4 w-4"/></button></div> : <Link to="/login" className="flex items-center justify-between text-xs font-semibold text-white">Sign in to your workspace <LogIn className="h-4 w-4"/></Link>}</div></div>
    </aside>
    <div className="min-w-0 lg:pl-[264px]"><header className="sticky top-0 z-30 flex h-[76px] items-center justify-between gap-4 border-b border-[#e8edf5] bg-white/95 px-5 backdrop-blur-xl sm:px-8"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-label="Open workspace menu" className="rounded-lg p-2 text-[#10264c] lg:hidden"><Menu className="h-5 w-5"/></button><div className="flex min-w-0 items-center gap-2 text-xs"><Link to="/" className="hidden text-[#94a3b8] sm:block">Unidex</Link><ChevronRight className="hidden h-3 w-3 text-[#bdc8d9] sm:block"/><span className="truncate font-medium text-[#526982]">{activeLabel}</span></div></div><div className="flex items-center gap-3 sm:gap-5"><Link to="/reminders" className="relative rounded-full border border-[#e3e9f3] p-2.5 text-[#7186a5] hover:border-[#225feb] hover:text-[#225feb]" aria-label={notificationCount ? `${notificationCount} upcoming reminders` : 'View reminders'}><Bell className="h-4 w-4" strokeWidth={1.7}/>{notificationCount > 0 && <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-[#ff762e]"/>}</Link>{sessionUser ? <a href="mailto:hello@unidex.co.in" className="hidden items-center gap-2 text-xs text-[#718098] sm:flex"><HelpCircle className="h-4 w-4"/>Need a hand?</a> : <Link to="/login" className="inline-flex items-center gap-2 rounded-full bg-[#225feb] px-4 py-2.5 text-xs font-semibold text-white">Sign in <ArrowUpRight className="h-3.5 w-3.5"/></Link>}</div></header>
    {sessionError && <div className="flex items-center justify-between gap-3 border-b border-[#dce6f8] bg-[#edf3ff] px-6 py-3 text-xs text-[#526982]" role="status">{sessionError}<button onClick={() => setSessionError('')} aria-label="Dismiss session message"><X className="h-3.5 w-3.5"/></button></div>}
    <main id="workspace-main" className="min-w-0 pb-14 focus:outline-none" tabIndex={-1}>{children}</main><footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e8edf5] px-6 py-6 text-[11px] text-[#94a3b8] sm:px-8"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5"/>Your next step, considered.</span><div className="flex gap-5"><Link to="/about">About</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div></footer></div>
  </div>
}
