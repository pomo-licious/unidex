// ─────────────────────────────────────────────────────────────────────────────
// src/lib/mockData.js — Fake data and shared helper functions
//
// All the concept screens (Profile, Colleges, Tracker) run on fake/hardcoded
// data so you can see and test the UI without needing a real logged-in user or
// a live database. When you wire up Supabase later, you'll replace these
// imports with real database queries — the page components won't change much.
//
// This file also exports small helper functions used across multiple pages
// (e.g. "how many days until this deadline?" or "format ₹2500000 as ₹25L").
// ─────────────────────────────────────────────────────────────────────────────


// ─── College list (12 top MBA programmes) ────────────────────────────────────
// Each college object has: id, name, type, location, avg_fees (in rupees),
// application deadline, CAT percentile cutoff (numeric for comparison),
// a display label for the cutoff, and total seat count.
export const COLLEGES = [
  { id: '1',  name: 'IIM Ahmedabad',        type: 'IIM',        location: 'Ahmedabad, Gujarat',      avg_fees: 2500000, deadline: '2026-11-15', cutoff: 99,   cutoff_label: '99+',      seats: 385 },
  { id: '2',  name: 'IIM Bangalore',         type: 'IIM',        location: 'Bengaluru, Karnataka',    avg_fees: 2400000, deadline: '2026-11-20', cutoff: 99,   cutoff_label: '99+',      seats: 405 },
  { id: '3',  name: 'IIM Calcutta',          type: 'IIM',        location: 'Kolkata, West Bengal',    avg_fees: 2300000, deadline: '2026-11-18', cutoff: 99,   cutoff_label: '99',       seats: 460 },
  { id: '4',  name: 'IIM Lucknow',           type: 'IIM',        location: 'Lucknow, Uttar Pradesh',  avg_fees: 1900000, deadline: '2026-11-25', cutoff: 97,   cutoff_label: '97',       seats: 493 },
  { id: '5',  name: 'IIM Kozhikode',         type: 'IIM',        location: 'Kozhikode, Kerala',       avg_fees: 2000000, deadline: '2026-11-22', cutoff: 95,   cutoff_label: '95',       seats: 420 },
  { id: '6',  name: 'XLRI Jamshedpur',       type: 'Private',    location: 'Jamshedpur, Jharkhand',   avg_fees: 2700000, deadline: '2026-11-30', cutoff: 95,   cutoff_label: '95 (XAT)', seats: 240 },
  { id: '7',  name: 'ISB Hyderabad',         type: 'Private',    location: 'Hyderabad, Telangana',    avg_fees: 4500000, deadline: '2026-10-15', cutoff: null, cutoff_label: '720 GMAT', seats: 920 },
  { id: '8',  name: 'MDI Gurgaon',           type: 'Government', location: 'Gurugram, Haryana',       avg_fees: 2100000, deadline: '2026-12-05', cutoff: 95,   cutoff_label: '95',       seats: 240 },
  { id: '9',  name: 'IIT Bombay (SJMSOM)',   type: 'IIT',        location: 'Mumbai, Maharashtra',     avg_fees: 900000,  deadline: '2026-12-01', cutoff: 98,   cutoff_label: '98',       seats: 120 },
  { id: '10', name: 'IIT Delhi (DMS)',        type: 'IIT',        location: 'New Delhi',               avg_fees: 800000,  deadline: '2026-11-30', cutoff: 97,   cutoff_label: '97',       seats: 60  },
  { id: '11', name: 'FMS Delhi',             type: 'Government', location: 'New Delhi',               avg_fees: 200000,  deadline: '2026-12-20', cutoff: 98.5, cutoff_label: '98.5',     seats: 216 },
  { id: '12', name: 'SPJIMR Mumbai',         type: 'Private',    location: 'Mumbai, Maharashtra',     avg_fees: 2000000, deadline: '2026-12-10', cutoff: 85,   cutoff_label: '85',       seats: 240 },
]


// ─── Fake student profile (used by Profile, Colleges, Tracker pages) ─────────
// Replace this with a real Supabase query once auth is wired up.
export const MOCK_STUDENT = {
  name: 'Arjun Sharma',
  email: 'arjun@example.com',
  phone: '+91 98765 43210',
  city: 'Mumbai',
  company: 'Deloitte',
  role: 'Business Analyst',
  cat_year: '2026',
  degree: 'B.Tech (Computer Science)',
  academic_background: {
    gpa: 8.4,
    cat_percentile: 97.6,
    work_exp_yrs: 3,
    grad_year: 2022,
  },
  // List of college names this student has shortlisted
  target_colleges: ['IIM Ahmedabad', 'IIM Bangalore', 'XLRI Jamshedpur', 'FMS Delhi'],
}


// ─── Fake applications (used by Profile overview and AppTracker kanban) ───────
// Each entry represents one college the student is actively tracking.
// Replace with a real Supabase query (SELECT * FROM applications WHERE student_id = ...)
export const MOCK_APPLICATIONS = [
  { id: 'a1', college_id: '2',  college: 'IIM Bangalore',       status: 'Researching', deadline: '2026-11-20', notes: 'Need to draft SOP. Check WAT topics from previous years.' },
  { id: 'a2', college_id: '1',  college: 'IIM Ahmedabad',       status: 'Applied',     deadline: '2026-11-15', notes: 'Submitted R1. Waiting for shortlist announcement in Jan.' },
  { id: 'a3', college_id: '11', college: 'FMS Delhi',           status: 'Applied',     deadline: '2026-12-20', notes: 'Very competitive. Low fees make it a must-apply.' },
  { id: 'a4', college_id: '6',  college: 'XLRI Jamshedpur',     status: 'Interview',   deadline: '2026-11-30', notes: 'PI scheduled Dec 12. Prep: HR + Ethics cases.' },
  { id: 'a5', college_id: '9',  college: 'IIT Bombay (SJMSOM)', status: 'Offer',       deadline: '2026-12-01', notes: 'Offer received! Acceptance deadline Jan 15, 2027.' },
  { id: 'a6', college_id: '8',  college: 'MDI Gurgaon',         status: 'Rejected',    deadline: '2026-12-05', notes: 'Waitlisted R1, rejected after R2 shortlist.' },
]


// ─── Application status list (order matters — left to right in kanban) ────────
export const STATUSES = ['Researching', 'Applied', 'Interview', 'Offer', 'Rejected']


// ─── Colour/style lookup tables ───────────────────────────────────────────────
// Instead of writing colour classes inline on every card, we look them up here
// by status name or college type. Keeps the pages clean and consistent.

// STATUS_META: colours and dot colour for each application stage
export const STATUS_META = {
  Researching: { color: 'bg-gray-100 text-gray-700',          dot: 'bg-gray-400',    border: 'border-gray-200'   },
  Applied:     { color: 'bg-blue-100 text-blue-700',           dot: 'bg-blue-500',    border: 'border-blue-200'   },
  Interview:   { color: 'bg-amber-100 text-amber-700',         dot: 'bg-amber-500',   border: 'border-amber-200'  },
  Offer:       { color: 'bg-emerald-100 text-emerald-700',     dot: 'bg-emerald-500', border: 'border-emerald-200'},
  Rejected:    { color: 'bg-rose-100 text-rose-700',           dot: 'bg-rose-400',    border: 'border-rose-200'   },
}

// TYPE_META: badge colours for each college category (IIM, IIT, Private, Government)
export const TYPE_META = {
  IIM:        { color: 'bg-indigo-100 text-indigo-700' },
  IIT:        { color: 'bg-purple-100 text-purple-700' },
  Private:    { color: 'bg-orange-100 text-orange-700' },
  Government: { color: 'bg-teal-100 text-teal-700'    },
}


// ─── Helper functions ─────────────────────────────────────────────────────────

// fitLabel — compares the student's CAT percentile to the college's cutoff
// and returns a human-readable verdict + colour: "Strong match", "Good fit", or "Reach"
export function fitLabel(studentPercentile, cutoff) {
  // If the college uses GMAT instead of CAT, skip the comparison
  if (!cutoff) return { label: 'GMAT', color: 'text-gray-500' }

  const gap = studentPercentile - cutoff          // positive = above cutoff, negative = below

  if (gap >= 1)  return { label: 'Strong match', color: 'text-emerald-600' }  // safely above
  if (gap >= -2) return { label: 'Good fit',     color: 'text-amber-600'   }  // within 2 percentile points
  return           { label: 'Reach',             color: 'text-rose-500'    }  // more than 2 below
}

// daysUntil — calculates how many days from today until a given date string
// Returns a negative number if the deadline has already passed
export function daysUntil(dateStr) {
  const today  = new Date('2026-06-01')    // Hardcoded to project start date; swap for new Date() in production
  const target = new Date(dateStr)
  return Math.round((target - today) / (1000 * 60 * 60 * 24))  // Convert milliseconds → days
}

// formatFees — converts a raw rupee number (e.g. 2500000) to a readable "₹25L" string
export function formatFees(n) {
  return `₹${(n / 100000).toFixed(0)}L`   // Divide by 1 lakh (100,000) and append "L"
}
