// ─────────────────────────────────────────────────────────────────────────────
// src/lib/supabase.js — Supabase database client (single shared instance)
//
// Supabase is the backend: it handles user login/logout and stores all data
// (students, colleges, applications, deadlines) in a Postgres database.
// This file creates ONE connection to Supabase and exports it. Every other
// file that needs to talk to the database imports `supabase` from here —
// never creates its own connection. This keeps credentials in one place.
//
// The two environment variables come from the .env file at the project root.
// They are safe to use in the browser — the anon key is a public read key.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

// Read the project URL and public key from environment variables (.env file)
// The ?? '' fallback prevents a crash if the env file is missing (e.g. on CI)
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL      ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

// Create and export the single Supabase client used by the whole app
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
