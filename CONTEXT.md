# Unidex — Project Context

## What is Unidex
MBA college discovery, application tracking, and deadline management 
for Indian students. Solo build, pre-MVP, Week 1 of 10.

## Stack
- Frontend: React + Tailwind + Vite
- Backend: Supabase (auth + database + RLS)
- AI: Anthropic API (claude-sonnet-4-20250514)
- Deploy: Vercel (frontend) + Railway (backend later)
- Editor: VS Code + Claude Code extension

## Data models

### students
- id: uuid (PK)
- user_id: uuid (FK → auth.users, cascade delete)
- name: text
- email: text (unique)
- academic_background: jsonb → { gpa, cat_percentile, work_exp_yrs, grad_year }
- target_colleges: text[]
- created_at: timestamptz

### colleges
- id: uuid (PK)
- name: text (unique)
- type: text → 'IIM' | 'IIT' | 'Private' | 'Government'
- location: text
- avg_fees: numeric (INR, total programme)
- deadlines: jsonb → [{ round, date, type }]
- website_url: text
- created_at: timestamptz

### applications
- id: uuid (PK)
- student_id: uuid (FK → students, cascade delete)
- college_id: uuid (FK → colleges, cascade delete)
- status: text → 'Researching' | 'Applied' | 'Interview' | 'Offer' | 'Rejected'
- notes: text
- last_updated: timestamptz (auto-updated via trigger)

### deadlines
- id: uuid (PK)
- college_id: uuid (FK → colleges, cascade delete)
- round: text → 'R1' | 'R2' | 'Final'
- date: date
- type: text → 'CAT' | 'GMAT' | 'GRE' | 'SOP' | 'Interview' | 'Result'

## RLS rules
- students: users can only read/write their own row (auth.uid() = user_id)
- colleges: public read, no user writes (seeded manually by admin)
- applications: users can only read/write rows where student_id belongs to them
- deadlines: public read

## Coding rules (always follow these)
- Functional components and hooks only — no class components
- Tailwind only — no custom CSS files
- Every Supabase call needs loading state + error state
- Use the supabase client from src/lib/supabase.js — never create a new client
- Anthropic model is always claude-sonnet-4-20250514
- Keep components in src/pages/ (full pages) and src/components/ (reusable bits)

## File structure (target)
unidex/
├── src/
│   ├── lib/
│   │   └── supabase.js        ← Supabase client
│   ├── pages/
│   │   ├── Signup.jsx         ← signup + student row creation
│   │   ├── CollegeDirectory.jsx ← browse + filter colleges
│   │   └── AppTracker.jsx     ← kanban tracker
│   ├── components/            ← reusable UI pieces
│   ├── App.jsx                ← routing
│   └── main.jsx
├── supabase/
│   └── schema.sql             ← full DB schema (already written)
├── AGENTS.md                  ← agent routing rules
├── CONTEXT.md                 ← this file
├── .env                       ← VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
└── .gitignore                 ← must include .env

## Repo & deploy
- GitHub: https://github.com/pomo-licious/unidex (public, main protected)
- Vercel: https://biz-sable.vercel.app (auto-deploys on push to main)

## What's done
- [x] Schema designed and written (supabase/schema.sql)
- [x] Implementation plan laid out (10 steps)
- [x] AGENTS.md written with agent routing + coding rules
- [x] React project created (Vite + React)
- [x] Tailwind v4 installed and configured
- [x] Supabase project created (project: Biz, eu-west-1)
- [x] schema.sql run in Supabase — all 4 tables + RLS live
- [x] src/lib/supabase.js created
- [x] Signup.jsx built (real Supabase auth)
- [x] Onboarding.jsx built (3-step wizard)
- [x] Profile.jsx built (concept screen)
- [x] CollegeDirectory.jsx built
- [x] AppTracker.jsx built (kanban)
- [x] Routing wired in App.jsx
- [x] Pushed to GitHub + Vercel auto-deploy connected
- [x] CATALOGUE.md + inline comments on all files

## What to build next (in order)
1. Run supabase/schema.sql in Supabase SQL Editor
2. Create .env with your Supabase URL and anon key
3. Create src/lib/supabase.js
4. Build src/pages/Signup.jsx
5. Build src/pages/CollegeDirectory.jsx
6. Build src/pages/AppTracker.jsx
7. Wire routing in App.jsx
8. Test full flow: signup → colleges → add application → tracker
9. Push to GitHub

## Business model
Free → ₹500–1,000 premium → college analytics fee (B2B)
North star: 50+ active profiles with tracked applications by Week 10

## Competitors to beat
CollegeDekho, Shiksha, MBA Universe, PaGaLGuY, Yocket, TIME/IMS/CL
Core pain points we solve: deadline scatter, SOP chaos, shortlisting guesswork
