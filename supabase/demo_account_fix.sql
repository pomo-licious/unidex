-- ─────────────────────────────────────────────────────────────────────────────
-- Demo Account Fix — investor presentation profile
-- ─────────────────────────────────────────────────────────────────────────────
-- Reseeds demo@unidex.co.in with Rohan Mehta's profile for investor demos
--
-- Profile:
--   Name: Rohan Mehta
--   CAT: 99.13% | GPA: 9.1 | Exp: 4 years, McKinsey Associate
--   Target colleges: IIM Ahmedabad, IIM Bangalore, ISB Hyderabad, XLRI, MDI
--
-- Applications (5):
--   IIM Ahmedabad → Applied
--   IIM Bangalore → Interview
--   ISB Hyderabad → Offer
--   MDI Gurgaon → Rejected
--   XLRI Jamshedpur → Researching
--
-- Manually applied via Supabase service role on 2026-06-02
-- ─────────────────────────────────────────────────────────────────────────────

-- This file documents the changes made directly to the database
-- Run the queries below to replicate this fix:

DELETE FROM students WHERE user_id = 'dd2204df-71ff-4ac7-91fe-646cba3994b3';

INSERT INTO students (user_id, name, email, academic_background, target_colleges)
VALUES (
  'dd2204df-71ff-4ac7-91fe-646cba3994b3',
  'Rohan Mehta',
  'demo@unidex.co.in',
  '{"gpa": 9.1, "cat_percentile": 99.13, "work_exp_yrs": 4, "grad_year": 2020}'::jsonb,
  ARRAY['IIM Ahmedabad', 'IIM Bangalore', 'ISB Hyderabad', 'XLRI Jamshedpur', 'MDI Gurgaon']
);

-- Applications are inserted via CTE in the main migration
-- See supabase/seed_colleges.sql for college seeding
