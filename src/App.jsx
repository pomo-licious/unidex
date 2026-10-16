import { lazy, Suspense, useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DemoProvider } from './context/DemoContext'
import { AdmissionsProvider } from './context/AdmissionsContext'
import { supabase } from './lib/supabase'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Profile = lazy(() => import('./pages/Profile'))
const CollegeDirectory = lazy(() => import('./pages/CollegeDirectory'))
const CollegeProfile = lazy(() => import('./pages/CollegeProfile'))
const AppTracker = lazy(() => import('./pages/AppTracker'))
const DeadlineCalendar = lazy(() => import('./pages/DeadlineCalendar'))
const DocumentUpload = lazy(() => import('./pages/DocumentUpload'))
const OfferCelebration = lazy(() => import('./pages/OfferCelebration'))
const ApplicationBuilder = lazy(() => import('./pages/ApplicationBuilder'))
const FeedbackSurvey = lazy(() => import('./pages/FeedbackSurvey'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const Reminders = lazy(() => import('./pages/Reminders'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const About = lazy(() => import('./pages/About'))

function PageLoading() {
  return <div role="status" aria-live="polite" className="grid min-h-[60vh] place-items-center bg-white"><div className="text-center"><div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-100 border-t-[#225feb] motion-reduce:animate-none" /><span className="text-sm text-slate-500">Opening your next step…</span></div></div>
}

function PageError() {
  return <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6"><p className="mb-4 text-xs font-semibold uppercase tracking-[.2em] text-[#225feb]">Unidex</p><h1 className="text-4xl font-semibold tracking-tight">Let’s reconnect.</h1><p className="mt-5 leading-7 text-slate-500">This page could not be opened. Your saved workspace stays in your account. Reload to try again.</p><button onClick={() => window.location.reload()} className="mt-8 w-fit rounded-full bg-[#225feb] px-7 py-3.5 font-medium text-white">Reload Unidex</button></main>
}

function ProtectedRoute({ element, user, loading }) {
  if (loading) return <PageLoading />
  return user ? element : <Navigate to="/login" replace />
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    let authEventReceived = false
    supabase.auth.getSession().then(({ data }) => { if (active && !authEventReceived) { setUser(data?.session?.user || null); setLoading(false) } }).catch(() => { if (active && !authEventReceived) setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true
      if (active) { setUser(session?.user || null); setLoading(false) }
    })
    return () => { active = false; subscription?.unsubscribe() }
  }, [])
  const protectedPage = element => <ProtectedRoute element={element} user={user} loading={loading} />
  return <ErrorBoundary FallbackComponent={PageError}><DemoProvider><AdmissionsProvider key={user?.id || 'guest'} user={user}><BrowserRouter><Suspense fallback={<PageLoading />}><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<Login />} />
    <Route path="/forgot-password" element={<Login />} />
    <Route path="/reset-password" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/onboarding" element={protectedPage(<Onboarding />)} />
    <Route path="/profile" element={protectedPage(<Profile />)} />
    <Route path="/profile/edit" element={protectedPage(<Profile />)} />
    <Route path="/colleges" element={<CollegeDirectory user={user} loading={loading} />} />
    <Route path="/college/:id" element={<CollegeProfile user={user} loading={loading} />} />
    <Route path="/tracker" element={protectedPage(<AppTracker />)} />
    <Route path="/applications" element={<Navigate to="/tracker" replace />} />
    <Route path="/application-builder" element={protectedPage(<ApplicationBuilder />)} />
    <Route path="/apply/:applicationId" element={protectedPage(<ApplicationBuilder />)} />
    <Route path="/documents" element={protectedPage(<DocumentUpload />)} />
    <Route path="/calendar" element={protectedPage(<DeadlineCalendar />)} />
    <Route path="/reminders" element={protectedPage(<Reminders />)} />
    <Route path="/offer/:college_id" element={protectedPage(<OfferCelebration />)} />
    <Route path="/feedback" element={<FeedbackSurvey />} />
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin" element={protectedPage(<AdminDashboard />)} />
    <Route path="/about" element={<About />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/terms" element={<Terms />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense></BrowserRouter></AdmissionsProvider></DemoProvider></ErrorBoundary>
}
