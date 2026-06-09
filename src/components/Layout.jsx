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

import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useIsDemo } from '../context/DemoContext'
import { NewsTicker } from './NewsTicker'
import { supabase } from '../lib/supabase'

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
  {
    to: '/calendar',
    label: 'Calendar',
    // Calendar/date icon
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: '/documents',
    label: 'Documents',
    // Documents/file icon
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

// ─── Layout component ─────────────────────────────────────────────────────────
// Accepts `children` — whatever the page puts inside <Layout>...</Layout>
export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isDemo   = useIsDemo()
  const [user, setUser] = useState(null)
  const [student, setStudent] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [daysUntilCAT, setDaysUntilCAT] = useState(0)

  // Listen to auth state changes with proper cleanup
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  // Fetch student data when user ID changes
  useEffect(() => {
    if (!user) {
      setStudent(null)
      return
    }

    async function loadStudent() {
      try {
        const { data } = await supabase
          .from('students')
          .select('name')
          .eq('user_id', user.id)
          .single()

        if (data) setStudent(data)
      } catch (err) {
        console.error('Failed to load student:', err)
      }
    }

    loadStudent()
  }, [user?.id])

  // Load upcoming notifications (next 7 days, unsent)
  useEffect(() => {
    if (!user) return

    async function loadNotifications() {
      try {
        const today = new Date().toISOString().split('T')[0]
        const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const { data } = await supabase
          .from('notifications')
          .select('id, message, due_date, sent')
          .eq('sent', false)
          .gte('due_date', today)
          .lte('due_date', sevenDaysLater)
          .order('due_date', { ascending: true })

        setNotifications(data || [])
      } catch (err) {
        console.error('Failed to load notifications:', err)
      }
    }

    loadNotifications()
  }, [user?.id])

  // Calculate days until CAT exam
  useEffect(() => {
    const catDate = new Date('2026-11-30')
    catDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const days = Math.ceil((catDate - today) / (1000 * 60 * 60 * 24))
    setDaysUntilCAT(Math.max(0, days))
  }, [])

  // Generate initials from the student's name
  const name = student?.name || 'U'
  const initials = name.split(' ').map(n => n[0]).join('')

  // ── handleLogout — sign out and redirect to login ──
  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

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

          {/* Notification bell */}
          <div className="pt-4 mt-4 border-t border-gray-100 relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="text-xs font-medium text-gray-600">Reminders</span>
              </div>
              {notifications.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {showNotifications && (
              <div className="absolute bottom-full mb-2 left-0 w-56 bg-white rounded-lg border border-gray-200 shadow-lg z-20">
                <div className="p-3 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-900">Upcoming Reminders</p>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-3 text-xs text-gray-500 text-center">No reminders</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map(notif => (
                      <div
                        key={notif.id}
                        className="px-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer"
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('notifications')
                              .update({ sent: true })
                              .eq('id', notif.id)

                            if (!error) {
                              setNotifications(prev => prev.filter(n => n.id !== notif.id))
                            } else {
                              console.error('Failed to mark notification as sent:', error)
                            }
                          } catch (err) {
                            console.error('Error updating notification:', err)
                          }
                        }}
                      >
                        <p className="text-xs text-gray-800">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{notif.due_date}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </nav>

        {/* User chip at the bottom of the sidebar — shows name and logout button */}
        <div className="px-4 py-4 border-t border-gray-100 space-y-3">
          <div className="flex items-center gap-3">
            {/* Avatar circle with initials */}
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{student?.name || 'Loading…'}</p>
            </div>
          </div>
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-700 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content area — everything to the right of the sidebar ── */}
      {/* ml-60 = left margin equal to sidebar width so content doesn't overlap */}
      <main className="ml-60 flex-1 min-h-screen flex flex-col">
        {/* CAT countdown banner — shown only if user is logged in and not on public routes */}
        {user && !['/', '/login', '/signup'].includes(location.pathname) && daysUntilCAT > 0 && (
          <div className="h-9 bg-amber-50 border-b border-amber-200 flex items-center justify-center text-sm text-amber-900 px-6">
            <span>📅 CAT 2026 — {daysUntilCAT} days away · </span>
            <a href="/calendar" className="underline font-medium hover:text-amber-800 ml-1">View deadline calendar →</a>
          </div>
        )}

        {/* Live news ticker — visible on all authenticated pages */}
        <NewsTicker />
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  )
}
