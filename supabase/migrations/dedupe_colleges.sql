-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: dedupe_colleges
--
-- Problem: a 1-June import re-inserted 8 institutions under a second, differently
-- spelled name with a city-only location ("Bengaluru", "Noida", …), a generic
-- website, and a placeholder 2026-12-31 CAT deadline. Result: 8 duplicate rows.
--
-- This migration, in one transaction:
--   1. Repoints every child-table FK (applications, deadlines, college_cutoffs,
--      notifications) from each losing row to its keeper.
--   2. Rewrites students.target_colleges (text[] of NAMES) from loser → keeper.
--   3. Deletes the 8 losing rows.
--   4. Normalises the remaining city-only locations to "City, State".
--   5. Adds a unique index on lower(trim(name)) to block exact-name re-imports.
--
-- Keeper rule applied (confirmed with product owner):
--   keep the row that has a college_cutoffs entry; else the "City, State" row.
-- Field policy: keep ALL keeper values; copy nothing (keeper has no nulls the
--   loser could fill), so the differing loser fees/site/deadlines are discarded
--   with the losing row. Fees decision: keep keeper (signed off).
--
-- Xavier Bhubaneswar is intentionally NOT merged — XIMB and XSOM are distinct
--   schools under Xavier University; only its location is normalised.
--
-- Expected row counts:  colleges 71 (before)  ->  63 (after, 8 removed).
--
-- Idempotent: re-running is a no-op (losers already gone, index IF NOT EXISTS,
--   location sets are deterministic by unique name).
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── Pre-flight count ────────────────────────────────────────────────────────
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM colleges;
  RAISE NOTICE 'colleges BEFORE: % (expected 71)', n;
END $$;

-- ── loser -> keeper map (id pairs + names for target_colleges rewrite) ───────
CREATE TEMP TABLE _merge (
  loser       uuid,
  keeper      uuid,
  loser_name  text,
  keeper_name text
) ON COMMIT DROP;

INSERT INTO _merge (loser, keeper, loser_name, keeper_name) VALUES
  ('7bf91b25-4f5d-4bba-98c3-3ab8b7ed1a5c','f6364852-9d5b-48b8-a31f-a956d3f73b3e','Amity University Noida',          'Amity Noida'),
  ('10fceab6-6942-4fac-856d-dec8ab368aff','0e8f934b-6c35-4c30-8f9f-1befbd226964','SOIL Institute of Management',     'SOIL Gurgaon'),
  ('1994e9b4-2016-4853-91f5-518a99126f85','e9671dc3-770d-4869-a598-91a484e4bd9d','Symbiosis Institute Noida',        'Symbiosis Noida'),
  ('64d55548-1f3d-437a-903f-86c3e6f57aee','2cf6cedd-a27c-4c36-b72a-a4cd538d7c01','Alliance University Bangalore',    'Alliance Bangalore'),
  ('549d106c-c0fb-45de-84fe-38b2a3841704','877ce9bb-5453-41ae-a2c9-bd00d9b87356','IFIM Business School Bangalore',   'IFIM Bangalore'),
  ('e484af11-1016-4814-a1f7-82e80efec599','ca8d6c10-c8bb-491f-8b0d-ff4612f412cc','ISBR Business School Bangalore',   'ISBR Bangalore'),
  ('d203637b-42ed-45ac-844b-4f9c07e86867','19c3894e-728e-49a3-ac03-7a76911903a5','ITM Business School Navi Mumbai',  'ITM Navi Mumbai'),
  ('d7b924e7-6e8c-4eb0-bbc7-82b40efe317a','934e735c-1387-4191-8524-90c50def790a','Woxsen University Hyderabad',      'Woxsen Hyderabad');

-- Safety: every id pair must still resolve to a real colleges row before we
-- repoint anything. If an id has drifted, abort the whole transaction.
DO $$
DECLARE missing int;
BEGIN
  SELECT count(*) INTO missing
  FROM _merge m
  WHERE NOT EXISTS (SELECT 1 FROM colleges c WHERE c.id = m.loser)
     OR NOT EXISTS (SELECT 1 FROM colleges c WHERE c.id = m.keeper);
  IF missing > 0 THEN
    RAISE EXCEPTION 'Aborting: % merge row(s) reference a college id that no longer exists', missing;
  END IF;
END $$;

-- ── 1. Repoint child-table foreign keys (loser -> keeper) ────────────────────
-- applications and deadlines are in the base schema; both repoint directly.
UPDATE applications a SET college_id = m.keeper FROM _merge m WHERE a.college_id = m.loser;
UPDATE deadlines    d SET college_id = m.keeper FROM _merge m WHERE d.college_id = m.loser;

-- college_cutoffs and notifications were added out-of-band and are not in the
-- repo schema; guard on table/column existence so this migration is portable.
-- (No loser carries a cutoff, so the cutoffs repoint moves 0 rows — included for
--  correctness and to stay safe if that ever changes.)
DO $$
BEGIN
  IF to_regclass('public.college_cutoffs') IS NOT NULL THEN
    EXECUTE 'UPDATE college_cutoffs c SET college_id = m.keeper FROM _merge m WHERE c.college_id = m.loser';
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'college_id'
     ) THEN
    EXECUTE 'UPDATE notifications n SET college_id = m.keeper FROM _merge m WHERE n.college_id = m.loser';
  END IF;
END $$;

-- ── 2. Rewrite students.target_colleges (text[] of names), loser -> keeper ───
-- DISTINCT collapses the case where a student had BOTH names in their list.
UPDATE students s
SET target_colleges = sub.names
FROM (
  SELECT s2.id,
         array_agg(DISTINCT COALESCE(m.keeper_name, t)) AS names
  FROM students s2
  CROSS JOIN LATERAL unnest(s2.target_colleges) AS t
  LEFT JOIN _merge m ON m.loser_name = t
  GROUP BY s2.id
) sub
WHERE s.id = sub.id
  AND EXISTS (
    SELECT 1 FROM unnest(s.target_colleges) t JOIN _merge m ON m.loser_name = t
  );

-- ── 3. Delete the losing rows ────────────────────────────────────────────────
DELETE FROM colleges c USING _merge m WHERE c.id = m.loser;

-- ── 4. Normalise surviving city-only locations to "City, State" ──────────────
-- (By unique name; deterministic and idempotent.)
UPDATE colleges SET location = 'Pune, Maharashtra'   WHERE name = 'Balaji Institute of Modern Management Pune';
UPDATE colleges SET location = 'Pune, Maharashtra'   WHERE name = 'Modern Institute of Business Management Pune';
UPDATE colleges SET location = 'Mumbai, Maharashtra' WHERE name = 'SPJIMR Mumbai';
UPDATE colleges SET location = 'Sanquelim, Goa'      WHERE name = 'GIM Goa';           -- GIM campus is in Sanquelim, Goa
UPDATE colleges SET location = 'Bhubaneswar, Odisha' WHERE name = 'Xavier Business School Bhubaneswar';

-- ── 5. Prevent recurrence: unique on normalised name ─────────────────────────
-- NOTE: the dupes had DIFFERENT names, so this index would NOT have caught them;
--       it blocks exact-name re-imports only. A stronger brand+city guard or an
--       upsert-only import path is the real fix (see PR description).
CREATE UNIQUE INDEX IF NOT EXISTS colleges_name_unique_ci ON colleges (lower(trim(name)));

-- ── Post-flight count ─────────────────────────────────────────────────────────
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM colleges;
  RAISE NOTICE 'colleges AFTER: % (expected 63)', n;
  IF n <> 63 THEN
    RAISE WARNING 'Post-migration colleges count % != expected 63 — review before relying on result', n;
  END IF;
END $$;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification (run AFTER commit; read-only, safe to paste into SQL editor):
--
--   -- no orphaned college_id in any child table:
--   SELECT 'applications'   AS tbl, count(*) FROM applications   a WHERE NOT EXISTS (SELECT 1 FROM colleges c WHERE c.id = a.college_id)
--   UNION ALL SELECT 'deadlines',    count(*) FROM deadlines     d WHERE NOT EXISTS (SELECT 1 FROM colleges c WHERE c.id = d.college_id)
--   UNION ALL SELECT 'college_cutoffs', count(*) FROM college_cutoffs x WHERE NOT EXISTS (SELECT 1 FROM colleges c WHERE c.id = x.college_id);
--   -- (add notifications if it has a college_id column)
--
--   -- every location now has a comma (City, State):
--   SELECT name, location FROM colleges WHERE location NOT LIKE '%,%';
--
--   -- no case-insensitive duplicate names remain:
--   SELECT lower(trim(name)) n, count(*) FROM colleges GROUP BY 1 HAVING count(*) > 1;
-- ─────────────────────────────────────────────────────────────────────────────
