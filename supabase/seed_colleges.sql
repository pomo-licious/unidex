-- ─────────────────────────────────────────────────────────────────────────────
-- supabase/seed_colleges.sql
-- Seeds 60 Indian MBA programmes across 3 tiers with real fees, locations,
-- deadlines and websites. Safe to re-run: ON CONFLICT (name) DO UPDATE.
--
-- Run order:
--   1. schema.sql  (creates the colleges table)
--   2. seed_colleges.sql  (this file — adds tier column and inserts data)
--
-- Deadline JSON format per row:
--   [{ "round": "R1|R2|R3|Final", "date": "YYYY-MM-DD", "type": "CAT|GMAT|GRE|SOP|Interview|Result" }]
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── Step 1: Add tier column (1 = elite, 2 = strong, 3 = good) ───────────────
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS tier integer CHECK (tier IN (1, 2, 3));


-- ─────────────────────────────────────────────────────────────────────────────
-- TIER 1 — 20 colleges
-- India's flagship MBA programmes: old IIMs, IITs, ISB, XLRI, FMS
-- Fees range: ₹1.9L (FMS) to ₹45L (ISB)
-- Primary entrance: CAT (most), GMAT (ISB), XAT (XLRI)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO colleges (name, type, location, avg_fees, tier, website_url, deadlines)
VALUES

  -- Old IIMs — CAT cutoff 99+ percentile, deadlines set Nov-Dec 2026
  ('IIM Ahmedabad',   'IIM', 'Ahmedabad', 2500000, 1, 'https://www.iima.ac.in',
   '[{"round":"R1","date":"2026-11-15","type":"CAT"},{"round":"R2","date":"2027-01-25","type":"SOP"},{"round":"Final","date":"2027-04-30","type":"Result"}]'::jsonb),

  ('IIM Bangalore',   'IIM', 'Bengaluru',  2400000, 1, 'https://www.iimb.ac.in',
   '[{"round":"R1","date":"2026-11-15","type":"CAT"},{"round":"R2","date":"2027-01-25","type":"SOP"},{"round":"Final","date":"2027-04-30","type":"Result"}]'::jsonb),

  ('IIM Calcutta',    'IIM', 'Kolkata',    2300000, 1, 'https://www.iimcal.ac.in',
   '[{"round":"R1","date":"2026-11-15","type":"CAT"},{"round":"R2","date":"2027-01-25","type":"SOP"},{"round":"Final","date":"2027-04-30","type":"Result"}]'::jsonb),

  ('IIM Lucknow',     'IIM', 'Lucknow',    1950000, 1, 'https://www.iiml.ac.in',
   '[{"round":"R1","date":"2026-11-20","type":"CAT"},{"round":"R2","date":"2027-01-30","type":"SOP"},{"round":"Final","date":"2027-04-30","type":"Result"}]'::jsonb),

  ('IIM Kozhikode',   'IIM', 'Kozhikode',  2050000, 1, 'https://www.iimk.ac.in',
   '[{"round":"R1","date":"2026-11-20","type":"CAT"},{"round":"R2","date":"2027-01-30","type":"SOP"},{"round":"Final","date":"2027-04-30","type":"Result"}]'::jsonb),

  ('IIM Indore',      'IIM', 'Indore',     1900000, 1, 'https://www.iimidr.ac.in',
   '[{"round":"R1","date":"2026-11-20","type":"CAT"},{"round":"R2","date":"2027-01-30","type":"SOP"},{"round":"Final","date":"2027-05-01","type":"Result"}]'::jsonb),

  -- ISB — GMAT-based, 1-year programme, three application rounds
  ('ISB Hyderabad',   'Private', 'Hyderabad',  4500000, 1, 'https://www.isb.edu',
   '[{"round":"R1","date":"2026-09-10","type":"GMAT"},{"round":"R2","date":"2026-11-05","type":"GMAT"},{"round":"R3","date":"2027-01-08","type":"GMAT"}]'::jsonb),

  -- XLRI — XAT-based (Jan 2027 exam), also accepts GMAT
  ('XLRI Jamshedpur', 'Private', 'Jamshedpur', 2700000, 1, 'https://www.xlri.ac.in',
   '[{"round":"R1","date":"2026-11-30","type":"CAT"},{"round":"R2","date":"2027-01-04","type":"GRE"},{"round":"Final","date":"2027-03-15","type":"Interview"}]'::jsonb),

  -- FMS Delhi — government college, post-CAT result application, lowest fees in Tier 1
  ('FMS Delhi',       'Government', 'New Delhi', 192000,  1, 'https://www.fms.edu',
   '[{"round":"R1","date":"2027-01-10","type":"CAT"},{"round":"Final","date":"2027-04-01","type":"Interview"}]'::jsonb),

  ('MDI Gurgaon',     'Government', 'Gurugram',  2100000, 1, 'https://www.mdi.ac.in',
   '[{"round":"R1","date":"2027-01-10","type":"CAT"},{"round":"Final","date":"2027-04-05","type":"Interview"}]'::jsonb),

  ('SPJIMR Mumbai',   'Private', 'Mumbai',     2000000, 1, 'https://www.spjimr.org',
   '[{"round":"R1","date":"2026-12-10","type":"CAT"},{"round":"R2","date":"2027-01-15","type":"GMAT"},{"round":"Final","date":"2027-03-15","type":"Interview"}]'::jsonb),

  -- New IIMs (post-2010) — CAT cutoff 90–97 percentile
  ('IIM Shillong',    'IIM', 'Shillong',    1600000, 1, 'https://www.iimshillong.ac.in',
   '[{"round":"R1","date":"2026-12-01","type":"CAT"},{"round":"R2","date":"2027-02-20","type":"SOP"},{"round":"Final","date":"2027-05-15","type":"Result"}]'::jsonb),

  ('IIM Rohtak',      'IIM', 'Rohtak',      1400000, 1, 'https://www.iimrohtak.ac.in',
   '[{"round":"R1","date":"2026-12-01","type":"CAT"},{"round":"R2","date":"2027-02-20","type":"SOP"},{"round":"Final","date":"2027-05-15","type":"Result"}]'::jsonb),

  ('IIM Ranchi',      'IIM', 'Ranchi',      1500000, 1, 'https://www.iimranchi.ac.in',
   '[{"round":"R1","date":"2026-12-01","type":"CAT"},{"round":"R2","date":"2027-02-20","type":"SOP"},{"round":"Final","date":"2027-05-15","type":"Result"}]'::jsonb),

  ('IIM Udaipur',     'IIM', 'Udaipur',     1600000, 1, 'https://www.iimu.ac.in',
   '[{"round":"R1","date":"2026-12-01","type":"CAT"},{"round":"R2","date":"2027-02-20","type":"SOP"},{"round":"Final","date":"2027-05-15","type":"Result"}]'::jsonb),

  ('IIM Tiruchirappalli', 'IIM', 'Tiruchirappalli', 1500000, 1, 'https://www.iimtrichy.ac.in',
   '[{"round":"R1","date":"2026-12-01","type":"CAT"},{"round":"R2","date":"2027-02-20","type":"SOP"},{"round":"Final","date":"2027-05-15","type":"Result"}]'::jsonb),

  ('IIM Kashipur',    'IIM', 'Kashipur',    1400000, 1, 'https://www.iimkashipur.ac.in',
   '[{"round":"R1","date":"2026-12-01","type":"CAT"},{"round":"R2","date":"2027-02-20","type":"SOP"},{"round":"Final","date":"2027-05-15","type":"Result"}]'::jsonb),

  -- IIT management schools — CAT + written test + interview, lower fees
  ('IIT Bombay SJMSOM', 'IIT', 'Mumbai',    900000,  1, 'https://www.som.iitb.ac.in',
   '[{"round":"R1","date":"2026-12-15","type":"CAT"},{"round":"R2","date":"2027-01-20","type":"SOP"},{"round":"Final","date":"2027-03-20","type":"Interview"}]'::jsonb),

  ('IIT Delhi DMS',   'IIT', 'New Delhi',   800000,  1, 'https://dms.iitd.ac.in',
   '[{"round":"R1","date":"2026-12-15","type":"CAT"},{"round":"R2","date":"2027-01-20","type":"SOP"},{"round":"Final","date":"2027-03-20","type":"Interview"}]'::jsonb),

  ('IIT Kharagpur VGSoM', 'IIT', 'Kharagpur', 850000, 1, 'https://www.vgsom.iitkgp.ac.in',
   '[{"round":"R1","date":"2026-12-15","type":"CAT"},{"round":"R2","date":"2027-01-20","type":"SOP"},{"round":"Final","date":"2027-03-20","type":"Interview"}]'::jsonb)

ON CONFLICT (name) DO UPDATE SET
  type        = EXCLUDED.type,
  location    = EXCLUDED.location,
  avg_fees    = EXCLUDED.avg_fees,
  tier        = EXCLUDED.tier,
  website_url = EXCLUDED.website_url,
  deadlines   = EXCLUDED.deadlines;


-- ─────────────────────────────────────────────────────────────────────────────
-- TIER 2 — 20 colleges
-- Strong regional programmes and newer IIMs
-- Fees range: ₹2.5L (PUMBA) to ₹19L (SIBM, KJ Somaiya)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO colleges (name, type, location, avg_fees, tier, website_url, deadlines)
VALUES

  -- Government and quasi-government institutes
  ('NITIE Mumbai',    'Government', 'Mumbai', 750000,  2, 'https://www.nitie.ac.in',
   '[{"round":"R1","date":"2026-12-15","type":"CAT"},{"round":"R2","date":"2027-01-20","type":"SOP"},{"round":"Final","date":"2027-03-20","type":"Interview"}]'::jsonb),

  ('PUMBA Pune',      'Government', 'Pune',   250000,  2, 'https://pumba.unipune.ac.in',
   '[{"round":"R1","date":"2027-01-10","type":"CAT"},{"round":"Final","date":"2027-04-10","type":"Interview"}]'::jsonb),

  -- Private Tier 2 — CAT/GMAT, national presence
  ('XIMB Bhubaneswar','Private', 'Bhubaneswar', 1750000, 2, 'https://www.ximb.ac.in',
   '[{"round":"R1","date":"2026-11-30","type":"CAT"},{"round":"R2","date":"2027-01-31","type":"GMAT"},{"round":"Final","date":"2027-03-31","type":"Interview"}]'::jsonb),

  ('IMT Ghaziabad',   'Private', 'Ghaziabad',   1800000, 2, 'https://www.imt.edu',
   '[{"round":"R1","date":"2026-11-30","type":"CAT"},{"round":"R2","date":"2027-01-31","type":"GMAT"},{"round":"Final","date":"2027-03-31","type":"Interview"}]'::jsonb),

  ('TAPMI Manipal',   'Private', 'Manipal',     1700000, 2, 'https://www.tapmi.edu.in',
   '[{"round":"R1","date":"2026-11-30","type":"CAT"},{"round":"R2","date":"2027-01-31","type":"GMAT"},{"round":"Final","date":"2027-03-31","type":"Interview"}]'::jsonb),

  ('GIM Goa',         'Private', 'Panaji',      1500000, 2, 'https://www.gim.ac.in',
   '[{"round":"R1","date":"2026-11-30","type":"CAT"},{"round":"R2","date":"2027-01-31","type":"GMAT"},{"round":"Final","date":"2027-03-31","type":"Interview"}]'::jsonb),

  ('FORE Delhi',      'Private', 'New Delhi',   1450000, 2, 'https://www.fsm.ac.in',
   '[{"round":"R1","date":"2026-11-30","type":"CAT"},{"round":"R2","date":"2027-01-31","type":"GMAT"},{"round":"Final","date":"2027-03-31","type":"Interview"}]'::jsonb),

  ('LBSIM Delhi',     'Private', 'New Delhi',   1000000, 2, 'https://www.lbsim.ac.in',
   '[{"round":"R1","date":"2026-11-30","type":"CAT"},{"round":"R2","date":"2027-01-31","type":"GMAT"},{"round":"Final","date":"2027-03-31","type":"Interview"}]'::jsonb),

  ('IMI Delhi',       'Private', 'New Delhi',   1850000, 2, 'https://www.imi.edu',
   '[{"round":"R1","date":"2026-11-30","type":"CAT"},{"round":"R2","date":"2027-01-31","type":"GMAT"},{"round":"Final","date":"2027-03-31","type":"Interview"}]'::jsonb),

  ('Great Lakes Chennai', 'Private', 'Chennai', 1650000, 2, 'https://www.greatlakes.edu.in',
   '[{"round":"R1","date":"2026-11-30","type":"CAT"},{"round":"R2","date":"2027-01-31","type":"GMAT"},{"round":"Final","date":"2027-03-31","type":"Interview"}]'::jsonb),

  -- SNAP-based Symbiosis institutes — SNAP exam Dec 2026
  ('SIBM Pune',       'Private', 'Pune',        1900000, 2, 'https://www.sibmpune.edu.in',
   '[{"round":"R1","date":"2026-11-20","type":"CAT"},{"round":"R2","date":"2026-12-14","type":"GRE"},{"round":"Final","date":"2027-03-15","type":"Interview"}]'::jsonb),

  ('SCMHRD Pune',     'Private', 'Pune',        1750000, 2, 'https://www.scmhrd.edu',
   '[{"round":"R1","date":"2026-11-20","type":"CAT"},{"round":"R2","date":"2026-12-14","type":"GRE"},{"round":"Final","date":"2027-03-15","type":"Interview"}]'::jsonb),

  ('KJ Somaiya Mumbai', 'Private', 'Mumbai',    1900000, 2, 'https://simsr.somaiya.edu',
   '[{"round":"R1","date":"2026-11-30","type":"CAT"},{"round":"R2","date":"2027-01-31","type":"GMAT"},{"round":"Final","date":"2027-03-31","type":"Interview"}]'::jsonb),

  ('BIMTECH Greater Noida', 'Private', 'Greater Noida', 1300000, 2, 'https://www.bimtech.ac.in',
   '[{"round":"R1","date":"2026-11-30","type":"CAT"},{"round":"R2","date":"2027-01-31","type":"GMAT"},{"round":"Final","date":"2027-03-31","type":"Interview"}]'::jsonb),

  ('XIME Bangalore',  'Private', 'Bengaluru',   1100000, 2, 'https://www.xime.org',
   '[{"round":"R1","date":"2026-11-30","type":"CAT"},{"round":"R2","date":"2027-01-31","type":"GMAT"},{"round":"Final","date":"2027-03-31","type":"Interview"}]'::jsonb),

  -- Baby IIMs (2015–2016 batch, still building reputation)
  ('IIM Bodhgaya',    'IIM', 'Bodh Gaya',   1100000, 2, 'https://www.iimbg.ac.in',
   '[{"round":"R1","date":"2026-12-01","type":"CAT"},{"round":"R2","date":"2027-02-20","type":"SOP"},{"round":"Final","date":"2027-05-15","type":"Result"}]'::jsonb),

  ('IIM Jammu',       'IIM', 'Jammu',       1050000, 2, 'https://www.iimj.ac.in',
   '[{"round":"R1","date":"2026-12-01","type":"CAT"},{"round":"R2","date":"2027-02-20","type":"SOP"},{"round":"Final","date":"2027-05-15","type":"Result"}]'::jsonb),

  ('IIM Sambalpur',   'IIM', 'Sambalpur',   1000000, 2, 'https://www.iimsambalpur.ac.in',
   '[{"round":"R1","date":"2026-12-01","type":"CAT"},{"round":"R2","date":"2027-02-20","type":"SOP"},{"round":"Final","date":"2027-05-15","type":"Result"}]'::jsonb),

  ('IIM Sirmaur',     'IIM', 'Sirmaur',      950000, 2, 'https://www.iimsirmaur.ac.in',
   '[{"round":"R1","date":"2026-12-01","type":"CAT"},{"round":"R2","date":"2027-02-20","type":"SOP"},{"round":"Final","date":"2027-05-15","type":"Result"}]'::jsonb),

  ('IIM Nagpur',      'IIM', 'Nagpur',      1200000, 2, 'https://www.iimnagpur.ac.in',
   '[{"round":"R1","date":"2026-12-01","type":"CAT"},{"round":"R2","date":"2027-02-20","type":"SOP"},{"round":"Final","date":"2027-05-15","type":"Result"}]'::jsonb)

ON CONFLICT (name) DO UPDATE SET
  type        = EXCLUDED.type,
  location    = EXCLUDED.location,
  avg_fees    = EXCLUDED.avg_fees,
  tier        = EXCLUDED.tier,
  website_url = EXCLUDED.website_url,
  deadlines   = EXCLUDED.deadlines;


-- ─────────────────────────────────────────────────────────────────────────────
-- TIER 3 — 20 colleges
-- Good regional programmes, private universities, and niche specialists
-- Fees range: ₹3.5L (IISWBM) to ₹17L (Woxsen)
-- Accept CAT/MAT/GMAT/XAT/CMAT scores; rolling admissions in many cases
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO colleges (name, type, location, avg_fees, tier, website_url, deadlines)
VALUES

  ('Alliance University Bangalore',     'Private', 'Bengaluru',   900000, 3, 'https://www.alliance.edu.in',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  ('Christ University Bangalore',       'Private', 'Bengaluru',   600000, 3, 'https://christuniversity.in',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  ('Amity University Noida',            'Private', 'Noida',        950000, 3, 'https://www.amity.edu',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  ('Symbiosis Institute Noida',         'Private', 'Noida',       1000000, 3, 'https://www.siom.edu.in',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  ('IILM Gurgaon',                      'Private', 'Gurugram',     800000, 3, 'https://www.iilm.edu',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  ('NDIM Delhi',                        'Private', 'New Delhi',    500000, 3, 'https://www.ndimdelhi.org',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  ('JIMS Delhi',                        'Private', 'New Delhi',    600000, 3, 'https://www.jimsindia.org',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  ('IPE Hyderabad',                     'Private', 'Hyderabad',    550000, 3, 'https://www.ipeindia.org',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  ('IFIM Business School Bangalore',    'Private', 'Bengaluru',    900000, 3, 'https://www.ifimbschool.com',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  ('ISBR Business School Bangalore',    'Private', 'Bengaluru',    700000, 3, 'https://www.isbr.in',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  -- Woxsen is a premium Tier 3 with strong international exposure and high fees
  ('Woxsen University Hyderabad',       'Private', 'Hyderabad',   1700000, 3, 'https://www.woxsen.edu.in',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  -- SOIL — boutique school, emphasis on leadership + sustainability
  ('SOIL Institute of Management',      'Private', 'Gurugram',    1500000, 3, 'https://www.soil.edu.in',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  ('Balaji Institute of Modern Management Pune', 'Private', 'Pune', 600000, 3, 'https://www.bimmpune.com',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  ('Indus Business Academy Bangalore',  'Private', 'Bengaluru',    600000, 3, 'https://www.ibabangalore.ac.in',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  ('SDMIMD Mysore',                     'Private', 'Mysuru',       800000, 3, 'https://www.sdmimd.ac.in',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  ('Xavier Business School Bhubaneswar','Private', 'Bhubaneswar',  650000, 3, 'https://www.xbs.ac.in',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  -- IISWBM — government institute under Calcutta University, very low fees
  ('IISWBM Kolkata',                    'Government', 'Kolkata',   350000, 3, 'https://www.iiswbm.edu',
   '[{"round":"R1","date":"2027-01-10","type":"CAT"},{"round":"Final","date":"2027-04-10","type":"Interview"}]'::jsonb),

  ('XISS Ranchi',                       'Private', 'Ranchi',       700000, 3, 'https://www.xiss.ac.in',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  ('Modern Institute of Business Management Pune', 'Private', 'Pune', 500000, 3, 'https://www.mibmpune.com',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb),

  ('ITM Business School Navi Mumbai',   'Private', 'Navi Mumbai', 1100000, 3, 'https://www.itmbschool.com',
   '[{"round":"R1","date":"2026-12-31","type":"CAT"},{"round":"R2","date":"2027-02-28","type":"GMAT"},{"round":"Final","date":"2027-04-30","type":"Interview"}]'::jsonb)

ON CONFLICT (name) DO UPDATE SET
  type        = EXCLUDED.type,
  location    = EXCLUDED.location,
  avg_fees    = EXCLUDED.avg_fees,
  tier        = EXCLUDED.tier,
  website_url = EXCLUDED.website_url,
  deadlines   = EXCLUDED.deadlines;
