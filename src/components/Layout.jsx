// ─────────────────────────────────────────────────────────────────────────────
// src/components/Layout.jsx — Shared sidebar shell (wraps Profile, Colleges, Tracker)
//
// Every main app page (except Onboarding/Signup) uses this Layout as its
// outer wrapper. It renders a fixed left sidebar with the logo, nav links,
// a CAT exam countdown widget, and the current user's name + role at the bottom.
// The page's own content goes into the <main> area on the right.
//
// Usage: wrap any page in <Layout>...</Layout> to get the sidebar automatically.
// ─────────────────────────────────────────────────────────────────────────────

import { NavLink, useNavigate } from 'react-router-dom'
import { MOCK_STUDENT } from '../lib/mockData'

// ─── Sidebar navigation items ────────────────────────────────────────────────
// Each item has a URL path, a display label, and an inline SVG icon.
// Adding a new page to the nav = add one object here.
const NAV = [
  {
    to: '/profile',
    label: 'My Profile',
    // Person/user icon
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    to: '/colleges',
    label: 'Colleges',
    // Building/institution icon
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    to: '/tracker',
    label: 'Applications',
    // Checklist/clipboard icon
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
]

// ─── Layout component ─────────────────────────────────────────────────────────
// Accepts `children` — whatever the page puts inside <Layout>...</Layout>
export default function Layout({ children }) {
  const navigate = useNavigate()

  // Generate initials from the student's name (e.g. "Arjun Sharma" → "AS")
  const initials = MOCK_STUDENT.name.split(' ').map(n => n[0]).join('')

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Fixed left sidebar ── */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 z-10">

        {/* Logo and tagline */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">U</span>
            </div>
            <span className="text-lg font-bold text-gray-900">Unidex</span>
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-9">MBA Application Hub</p>
        </div>

        {/* Navigation links — NavLink auto-highlights the active route */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              // isActive is true when the current URL matches this link's path
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'         // highlighted when on this page
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'  // default + hover state
                }`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}

          {/* CAT exam countdown widget */}
          <div className="pt-4 mt-4 border-t border-gray-100">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">CAT 2026</p>
            <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs font-semibold text-amber-700">CAT Exam</p>
              <p className="text-xs text-amber-600 mt-0.5">~153 days away</p>
            </div>
          </div>
        </nav>

        {/* User chip at the bottom of the sidebar — shows name and role */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            {/* Avatar circle with initials */}
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{MOCK_STUDENT.name}</p>
              <p className="text-xs text-gray-400 truncate">{MOCK_STUDENT.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content area — everything to the right of the sidebar ── */}
      {/* ml-60 = left margin equal to sidebar width so content doesn't overlap */}
      <main className="ml-60 flex-1 min-h-screen">
        {children}
      </main>
    </div>
  )
}
