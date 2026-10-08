-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: delhi_ncr_staging_tables
--
-- Staging tables for the Delhi NCR data run. Nothing here touches live data —
-- these mirror the live tables so researched values can be loaded, reviewed, and
-- diffed against production BEFORE any controlled promotion into the live tables.
--
--   colleges_staging   mirrors  colleges
--   cutoffs_staging    mirrors  college_cutoffs
--   deadlines_staging  mirrors  deadlines
--
-- Each adds provenance columns: source_url, source_date, confidence.
-- The child staging tables also add college_name — institutes that aren't in
-- live `colleges` yet have no id, so staged cutoffs/deadlines link by name and
-- are resolved to ids at promotion time.
--
-- LIKE ... INCLUDING DEFAULTS copies columns, types, and column defaults (id,
-- created_at) but deliberately NOT the NOT NULL / CHECK constraints — staging
-- must accept partial, unverified rows (e.g. a null fee with confidence
-- 'unverified') and exam types the live CHECK does not list (CMAT/MAT/NMAT/CUET-PG).
--
-- RLS is enabled with NO policies, so the anon/public API cannot read staging
-- data. Only the service role (dashboard / server) can populate and review it.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── colleges_staging ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS colleges_staging (LIKE colleges INCLUDING DEFAULTS);
ALTER TABLE colleges_staging ADD COLUMN IF NOT EXISTS source_url  text;
ALTER TABLE colleges_staging ADD COLUMN IF NOT EXISTS source_date date;
ALTER TABLE colleges_staging ADD COLUMN IF NOT EXISTS confidence  text;

-- ── cutoffs_staging ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cutoffs_staging (LIKE college_cutoffs INCLUDING DEFAULTS);
ALTER TABLE cutoffs_staging ADD COLUMN IF NOT EXISTS college_name text;  -- link before ids exist
ALTER TABLE cutoffs_staging ADD COLUMN IF NOT EXISTS source_url   text;
ALTER TABLE cutoffs_staging ADD COLUMN IF NOT EXISTS source_date  date;
ALTER TABLE cutoffs_staging ADD COLUMN IF NOT EXISTS confidence   text;

-- ── deadlines_staging ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deadlines_staging (LIKE deadlines INCLUDING DEFAULTS);
ALTER TABLE deadlines_staging ADD COLUMN IF NOT EXISTS college_name text;
ALTER TABLE deadlines_staging ADD COLUMN IF NOT EXISTS source_url   text;
ALTER TABLE deadlines_staging ADD COLUMN IF NOT EXISTS source_date  date;
ALTER TABLE deadlines_staging ADD COLUMN IF NOT EXISTS confidence   text;

-- ── Lock down: enable RLS with no policies (service-role access only) ─────────
ALTER TABLE colleges_staging  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cutoffs_staging   ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines_staging ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Promotion (LATER, only after owner approves the staged data) will, per row:
--   1. upsert colleges_staging -> colleges on lower(trim(name))
--   2. resolve cutoffs_staging.college_name / deadlines_staging.college_name to
--      colleges.id, then upsert into college_cutoffs / colleges.deadlines
--   3. drop staging tables
-- Promotion is NOT part of this migration.
-- ─────────────────────────────────────────────────────────────────────────────
