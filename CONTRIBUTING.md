# Contributing to Unidex

Solo project — Week 1 of 10. These rules exist to keep the codebase clean
even when moving fast.

---

## Branch naming

| Type | Pattern | Example |
|---|---|---|
| New feature | `feature/short-description` | `feature/college-seed-data` |
| Bug fix | `fix/short-description` | `fix/tracker-kanban-overflow` |
| Chore / config | `chore/short-description` | `chore/update-deps` |

**Never commit directly to `main`.** Always branch → PR → merge.

---

## Commit message format

```
type: short description (max 60 chars)

Optional longer explanation if needed.
```

Types: `feat` · `fix` · `chore` · `docs` · `refactor` · `style`

Examples:
```
feat: add college search and type filter
fix: kanban rejected column clipping on 1280px
chore: update Tailwind to v4.1
docs: add CATALOGUE entry for seed.sql
```

---

## Before every PR

1. `npm run build` must pass — no errors, no warnings
2. Test the affected screen(s) in browser at `localhost:5173`
3. No hardcoded secrets or `.env` values in any file
4. New files → add entry to `CATALOGUE.md`
5. Mark the Notion Build Tracker task as Done

---

## Code rules (from AGENTS.md)

- Functional components and hooks only — no class components
- Tailwind only — no custom CSS files
- Every Supabase call needs a loading state + error state
- Always import `supabase` from `src/lib/supabase.js` — never create a new client
- Pages go in `src/pages/`, reusable components in `src/components/`

---

## File naming

| Type | Convention | Example |
|---|---|---|
| React pages | PascalCase.jsx | `CollegeDirectory.jsx` |
| React components | PascalCase.jsx | `DeadlineChip.jsx` |
| Utilities / lib | camelCase.js | `mockData.js` |
| SQL | snake_case.sql | `seed_colleges.sql` |
| Docs | UPPERCASE.md | `CATALOGUE.md` |
