// ─────────────────────────────────────────────────────────────────────────────
// src/App.jsx — URL router / navigation hub
//
// This file is the map of the entire app. It links each URL path (e.g. /profile)
// to the page component that should be rendered at that URL.
// When a user clicks a nav link, the router swaps out the visible page without
// doing a full browser refresh — that's what makes it feel like a fast app.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DemoProvider } from './context/DemoContext'
import { supabase } from './lib/supabase'

// ── Import every page component ──
import LandingPage       from './pages/LandingPage'
import Login             from './pages/Login'
import Signup            from './pages/Signup'
import Onboarding        from './pages/Onboarding'
import Profile           from './pages/Profile'
import CollegeDirectory  from './pages/CollegeDirectory'
import CollegeProfile    from './pages/CollegeProfile'
import AppTracker        from './pages/AppTracker'
import DeadlineCalendar  from './pages/DeadlineCalendar'
import DocumentUpload    from './pages/DocumentUpload'
import OfferCelebration  from './pages/OfferCelebration'
import ApplyNow          from './pages/ApplyNow'
import FeedbackSurvey    from './pages/FeedbackSurvey'
import AdminLogin        from './pages/AdminLogin'
import AdminDashboard    from './pages/AdminDashboard'
import Applications      from './pages/Applications'
import Reminders         from './pages/Reminders'

// ── ProtectedRoute — redirects to /login if user is not authenticated ──
function ProtectedRoute({ element, user, loading }) {
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    )
  }
  return user ? element : <Navigate to="/login" replace />
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is currently logged in
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      setUser(user || null)
      setLoading(false)
    }).catch(() => {
      setUser(null)
      setLoading(false)
    })

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
    })

    return () => subscription?.unsubscribe()
  }, [])

  return (
    <DemoProvider>
      <BrowserRouter>
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={
            loading ? (
              <div className="min-h-screen flex items-center justify-center bg-[#0A1628]">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
              </div>
            ) : (
              <LandingPage />
            )
          } />

          {/* Public auth pages */}
          <Route path="/login"      element={<Login />} />
          <Route path="/signup"     element={<Signup />} />

          {/* Onboarding — can access before full profile setup */}
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Public college browsing (with guest mode) */}
          <Route path="/colleges"   element={<CollegeDirectory user={user} loading={loading} />} />
          <Route path="/college/:id" element={<CollegeProfile user={user} loading={loading} />} />

          {/* Public feedback survey */}
          <Route path="/feedback"   element={<FeedbackSurvey />} />

          {/* Admin login (public, but checks role after auth) */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected routes — require authentication */}
          <Route path="/profile"    element={<ProtectedRoute element={<Profile />} user={user} loading={loading} />} />
          <Route path="/tracker"    element={<ProtectedRoute element={<AppTracker />} user={user} loading={loading} />} />
          <Route path="/applications" element={<ProtectedRoute element={<Applications />} user={user} loading={loading} />} />
          <Route path="/reminders"  element={<ProtectedRoute element={<Reminders />} user={user} loading={loading} />} />
          <Route path="/calendar"   element={<ProtectedRoute element={<DeadlineCalendar />} user={user} loading={loading} />} />
          <Route path="/documents"  element={<ProtectedRoute element={<DocumentUpload />} user={user} loading={loading} />} />
          <Route path="/apply/:applicationId" element={<ProtectedRoute element={<ApplyNow />} user={user} loading={loading} />} />
          <Route path="/offer/:college_id" element={<ProtectedRoute element={<OfferCelebration />} user={user} loading={loading} />} />
          <Route path="/admin"      element={<ProtectedRoute element={<AdminDashboard />} user={user} loading={loading} />} />
        </Routes>
      </BrowserRouter>
    </DemoProvider>
  )
}
