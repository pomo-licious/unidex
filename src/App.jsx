// ─────────────────────────────────────────────────────────────────────────────
// src/App.jsx — URL router / navigation hub
//
// This file is the map of the entire app. It links each URL path (e.g. /profile)
// to the page component that should be rendered at that URL.
// When a user clicks a nav link, the router swaps out the visible page without
// doing a full browser refresh — that's what makes it feel like a fast app.
// ─────────────────────────────────────────────────────────────────────────────

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DemoProvider } from './context/DemoContext'

// ── Import every page component ──
import Signup          from './pages/Signup'
import Onboarding      from './pages/Onboarding'
import Profile         from './pages/Profile'
import CollegeDirectory from './pages/CollegeDirectory'
import AppTracker      from './pages/AppTracker'

export default function App() {
  return (
    // DemoProvider checks auth and exposes isDemo flag to all components
    <DemoProvider>
    // BrowserRouter enables URL-based navigation throughout the whole app
    <BrowserRouter>
      <Routes>
        {/* Visiting "/" (root) immediately redirects to the onboarding wizard */}
        <Route path="/"           element={<Navigate to="/onboarding" replace />} />

        {/* Auth page — creates a real Supabase account (email + password) */}
        <Route path="/signup"     element={<Signup />} />

        {/* Profile setup wizard — 3-step form to capture student details */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Student profile view — shows stats, target colleges, app summary */}
        <Route path="/profile"    element={<Profile />} />

        {/* College directory — browse, search, filter and add colleges */}
        <Route path="/colleges"   element={<CollegeDirectory />} />

        {/* Application tracker — kanban board to track all applications */}
        <Route path="/tracker"    element={<AppTracker />} />
      </Routes>
    </BrowserRouter>
    </DemoProvider>
  )
}
