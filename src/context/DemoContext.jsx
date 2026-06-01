// ─────────────────────────────────────────────────────────────────────────────
// src/context/DemoContext.jsx — Investor demo mode flag
//
// When the logged-in user is demo@unidex.in, isDemo = true.
// This unlocks ad banners across the app for investor presentations.
// All other users (real students + user research sessions) see no ads.
//
// Usage:
//   const isDemo = useIsDemo()   ← anywhere inside <DemoProvider>
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const DEMO_EMAIL = 'demo@unidex.co.in'

const DemoContext = createContext(false)

// DemoProvider — wraps the whole app in App.jsx
export function DemoProvider({ children }) {
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    // Check the current session on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsDemo(user?.email === DEMO_EMAIL)
    })

    // Update whenever the user logs in or out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsDemo(session?.user?.email === DEMO_EMAIL)
    })

    return () => subscription.unsubscribe()
  }, [])

  return <DemoContext.Provider value={isDemo}>{children}</DemoContext.Provider>
}

// useIsDemo — hook to read the flag in any component
export const useIsDemo = () => useContext(DemoContext)
