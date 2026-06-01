# Unidex — File Catalogue

> Written for someone who is building with AI assistance and wants to understand
> what every file does without having to read the code.
>
> **Rule:** Every time a new file is created, add it here before ending the session.

---

## How the project is organised

```
biz/
├── src/                   ← All React app code lives here
│   ├── lib/               ← Shared utilities (database client, fake data)
│   ├── pages/             ← Full-screen pages (one file per route/URL)
│   ├── components/        ← Reusable UI pieces used by multiple pages
│   ├── App.jsx            ← URL router — maps /path to the right page
│   ├── main.jsx           ← App entry point (first file that runs)
│   └── index.css          ← Global CSS (just loads Tailwind)
├── supabase/
│   └── schema.sql         ← Database table definitions
├── AGENTS.md              ← How the AI agents are routed and should behave
├── CATALOGUE.md           ← This file
├── CONTEXT.md             ← Project overview, stack, data models, checklist
├── .env                   ← Secret keys (never commit this to GitHub)
├── .gitignore             ← Files Git should ignore (.env, node_modules, etc.)
├── package.json           ← Project dependencies and npm scripts
└── vite.config.js         ← Build tool configuration
```

---

## Config & Setup

### `vite.config.js`
**What it is:** Build tool configuration.

Vite is the tool that compiles and packages all the React code into a website
browsers can load. This file tells it to use two plugins: one for React/JSX
support, and one for Tailwind CSS. You almost never need to change this.

---

### `package.json`
**What it is:** Project manifest and dependency list.

Lists every third-party library the project uses (React, Tailwind, Supabase JS,
React Router, etc.) and defines the npm scripts (`npm run dev`, `npm run build`).
When you run `npm install`, this is the file npm reads. Do not edit manually —
use `npm install <package-name>` instead.

---

### `.env`
**What it is:** Secret environment variables (never commit to GitHub).

Contains two keys that connect the app to your Supabase backend:
- `VITE_SUPABASE_URL` — the URL of your Supabase project
- `VITE_SUPABASE_ANON_KEY` — the public read key

These are read at build time by Vite. Any variable starting with `VITE_` is
embedded into the built JS files — so only use the public anon key here,
never the secret service role key.

---

### `.gitignore`
**What it is:** List of files Git should never track.

Includes `.env` (so your keys don't accidentally get pushed to GitHub),
`node_modules/` (1000s of files, auto-reinstalled from package.json),
`dist/` (the built output), and `.vercel/` (deployment config).

---

### `src/index.css`
**What it is:** Global stylesheet entry point.

Contains one line: `@import "tailwindcss"`. That single line triggers the
Tailwind plugin to scan all source files and generate all the utility CSS
classes used throughout the app. Don't add custom CSS here — use Tailwind
classes directly in JSX instead.

---

## Database

### `supabase/schema.sql`
**What it is:** The database blueprint — run once in Supabase's SQL Editor.

Defines all four database tables and their rules:

| Table | What it stores |
|---|---|
| `students` | One row per user: name, email, academic background (GPA, CAT %, work exp), target college list |
| `colleges` | One row per MBA programme: name, type, location, fees, deadlines. Admin-seeded, not user-editable. |
| `applications` | One row per college a student is tracking: status, notes, last updated timestamp |
| `deadlines` | Specific deadline dates per college per round (R1/R2/Final) |

Also sets up:
- **RLS (Row Level Security):** Students can only see and edit their own rows.
  Colleges and deadlines are public read.
- **Auto-update trigger:** The `last_updated` column on `applications` updates
  automatically whenever a row is changed.

---

### `supabase/seed_colleges.sql`
**What it is:** One-time data seed — populates the `colleges` table with 60 real Indian MBA programmes.

Safe to re-run: every INSERT uses `ON CONFLICT (name) DO UPDATE`, so running it
twice won't create duplicates. Also contains the `ALTER TABLE` that adds the `tier`
column to `colleges` — so run this file before any code that filters by tier.

**What's seeded:**

| Tier | Count | Colleges | Fees range |
|---|---|---|---|
| 1 | 20 | Old IIMs, IITs, ISB, XLRI, FMS, MDI, SPJIMR, new IIMs | ₹1.92L – ₹45L |
| 2 | 20 | NITIE, XIMB, IMT, TAPMI, GIM, SIBM, SCMHRD, baby IIMs, etc. | ₹2.5L – ₹19L |
| 3 | 20 | Alliance, Christ, Amity, IILM, Woxsen, SOIL, IISWBM, etc. | ₹3.5L – ₹17L |

Each college includes: name, type, location, avg_fees, tier, website_url, and
a `deadlines` JSONB array with realistic 2026–2027 application cycle dates.

---

## Library / Shared utilities

### `src/lib/supabase.js`
**What it is:** The single Supabase database connection shared by the whole app.

Creates one connection to your Supabase project using the URL and key from `.env`.
Every page that needs to read/write data imports `supabase` from this file.
**Never create a second Supabase client anywhere else** — always import from here.

Key export: `supabase` — the client object with methods like:
- `supabase.auth.signUp(...)` — create a new user account
- `supabase.from('students').select(...)` — read from a table
- `supabase.from('applications').insert(...)` — add a row

---

### `src/lib/mockData.js`
**What it is:** Fake data and shared helper functions used across concept screens.

All four concept screens (Onboarding, Profile, Colleges, Tracker) currently run
on hardcoded fake data so you can see and test the UI without needing a real
logged-in user. When you wire up Supabase, you'll swap these for real queries.

**Exports:**

| Export | What it is |
|---|---|
| `COLLEGES` | Array of 12 MBA colleges with fees, deadlines, cutoffs, seat counts |
| `MOCK_STUDENT` | A fake student profile (Arjun Sharma, CAT 97.6%) |
| `MOCK_APPLICATIONS` | 6 fake applications in various statuses |
| `STATUSES` | `['Researching', 'Applied', 'Interview', 'Offer', 'Rejected']` |
| `STATUS_META` | Colour/style lookup for each status (used for badges, dots, borders) |
| `TYPE_META` | Colour lookup for college types (IIM = indigo, IIT = purple, etc.) |
| `fitLabel(studentPct, cutoff)` | Returns "Strong match", "Good fit", or "Reach" + a colour class |
| `daysUntil(dateStr)` | Returns how many days from today until a given date string |
| `formatFees(rupees)` | Converts `2500000` to `"₹25L"` |

---

## Components (reusable UI pieces)

### `src/components/Layout.jsx`
**What it is:** The shared sidebar shell that wraps the three main app pages.

Renders a fixed 240px left sidebar containing:
- Unidex logo
- Navigation links to Profile / Colleges / Applications (with active highlighting)
- A CAT 2026 exam countdown widget
- The current user's name and role at the bottom

Any page that uses `<Layout>` as its wrapper automatically gets this sidebar.
The page's own content fills the remaining space to the right.

**Usage:** `<Layout><YourPageContent /></Layout>`

---

## Pages (one file per URL route)

### `src/pages/Signup.jsx` → route: `/signup`
**What it is:** Account creation form — the only page that uses real Supabase auth.

Two-step process on submit:
1. Calls `supabase.auth.signUp` to create an email/password login account.
2. Inserts a row into the `students` table linked to the new user ID.

On success, redirects to `/colleges`. Handles loading state (button shows
"Creating account…") and error state (red banner with Supabase error message).

Fields: name, email, password (required) + GPA, CAT percentile, work exp,
grad year (optional academic background).

---

### `src/pages/Onboarding.jsx` → route: `/onboarding`
**What it is:** 3-step profile setup wizard (concept screen, not yet saving to Supabase).

Guides the student through:
- **Step 1 — Personal:** name, email, phone, city
- **Step 2 — Academic:** degree, graduation year, GPA, CAT/GMAT score, work exp, company, role
- **Step 3 — Colleges:** searchable/filterable list with checkboxes. If a CAT
  percentile was entered, each college shows a fit label (Strong match / Good fit / Reach).

The "Continue" button on Step 1 is disabled until name + email are filled.
The "Start Tracking" button on Step 3 currently just navigates to `/profile`.
**TODO:** wire the final button to save form data to Supabase.

---

### `src/pages/Profile.jsx` → route: `/profile`
**What it is:** Student profile view (concept screen using mock data).

Displays four sections:
1. **Header card** — avatar initials, name, role, company, city, CAT year, Edit button
2. **Stats row** — four tiles: CAT percentile, CGPA, work experience, grad batch
3. **Target Colleges** — list with college type badge and fit score per college
4. **Application Overview** — count of applications in each status, link to tracker
5. **AI Form Fill teaser** — banner advertising the coming Anthropic-powered feature

The "Edit Profile" button navigates back to `/onboarding` to re-fill the form.

---

### `src/pages/CollegeDirectory.jsx` → route: `/colleges`
**What it is:** College discovery page — browse, search, filter, and add to tracker.

Features:
- **Live search** — filters by college name or city as you type
- **Type filter pills** — All / IIM / IIT / Private / Government
- **Fit scores** — each card shows Strong match / Good fit / Reach vs the student's CAT %ile
- **Deadline urgency chips** — green (>90 days), amber (30–90 days), red (<30 days), gray (closed)
- **Add to Tracker** button — toggles between filled (added) and outline (not added)
- **"X tracked → View tracker"** shortcut appears once any college is added

Internal sub-component: `Stat` — a small labelled number tile (fees / cutoff / seats).

---

### `src/pages/AppTracker.jsx` → route: `/tracker`
**What it is:** Kanban board to track the status of every application.

5 columns (one per status): Researching | Applied | Interview | Offer | Rejected

Features:
- **Summary strip** — coloured pills showing count per status at a glance
- **Application cards** — college name, deadline chip, notes preview, "Move to…" dropdown
- **Move to… dropdown** — click to change an application's status column instantly
- **Add College modal** — select any untracked college + add notes; adds to Researching column
- The board scrolls horizontally if all 5 columns don't fit on screen

Internal sub-component: `AppCard` — a single kanban card with the move dropdown.

---

## Documentation

### `CONTEXT.md`
**What it is:** Master project context document.

Contains the full product description, tech stack, data model definitions, RLS
rules, coding conventions, target file structure, build checklist, and prioritised
build order. Read this first at the start of every session.

---

### `AGENTS.md`
**What it is:** AI agent routing rules and behaviour definitions.

Tells the AI assistant how to classify incoming messages and behave as the right
agent type: Coder, Tester, Research, Tracker, or Logger. Also defines the
decision escalation protocol (when to ask vs. just act) and proactive behaviours
(e.g. auto-generating session logs at end of session).

---

### `CATALOGUE.md`
**What it is:** This file — a plain-English guide to every file in the project.

**Keep this updated:** every time a new file is added to the project, add an
entry here before ending the session. This is the fastest way for a new
contributor (or an AI in a new session) to understand the codebase.
