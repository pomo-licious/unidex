-- ─────────────────────────────────────────────────────────────────────────────
-- Seed 60 Indian MBA colleges across 3 tiers
-- Run this file in Supabase SQL Editor (it's safe to re-run)
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Add tier column to colleges table if it doesn't exist
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS tier integer CHECK (tier IN (1,2,3));

-- Step 2: Insert 60 MBA colleges with ON CONFLICT for safe re-runs
INSERT INTO colleges (name, type, location, avg_fees, tier, website_url, deadlines) VALUES
-- TIER 1 (20): Old IIMs, new IIMs, ISB, XLRI, FMS, MDI, SPJIMR, IIT schools
('IIM Ahmedabad', 'IIM', 'Ahmedabad, Gujarat', 2400000, 1, 'https://www.iimahd.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-01-30","type":"Result"}]'),
('IIM Bangalore', 'IIM', 'Bangalore, Karnataka', 2400000, 1, 'https://www.iimb.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-10","type":"Result"}]'),
('IIM Calcutta', 'IIM', 'Calcutta, West Bengal', 2300000, 1, 'https://www.iimcal.ac.in', '[{"round":"R1","date":"2026-10-20","type":"CAT"},{"round":"R2","date":"2026-12-25","type":"CAT"},{"round":"Final","date":"2027-02-05","type":"Result"}]'),
('IIM Lucknow', 'IIM', 'Lucknow, Uttar Pradesh', 1800000, 1, 'https://www.iiml.ac.in', '[{"round":"R1","date":"2026-10-10","type":"CAT"},{"round":"R2","date":"2026-12-15","type":"CAT"},{"round":"Final","date":"2027-01-25","type":"Result"}]'),
('IIM Kozhikode', 'IIM', 'Kozhikode, Kerala', 1750000, 1, 'https://www.iimk.ac.in', '[{"round":"R1","date":"2026-10-12","type":"CAT"},{"round":"R2","date":"2026-12-18","type":"CAT"},{"round":"Final","date":"2027-01-28","type":"Result"}]'),
('IIM Indore', 'IIM', 'Indore, Madhya Pradesh', 1600000, 1, 'https://www.iimidr.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-01","type":"Result"}]'),
('ISB Hyderabad', 'Private', 'Hyderabad, Telangana', 2800000, 1, 'https://www.isb.edu', '[{"round":"R1","date":"2026-09-30","type":"GMAT"},{"round":"R2","date":"2026-11-30","type":"GMAT"},{"round":"R3","date":"2027-01-31","type":"GMAT"}]'),
('XLRI Jamshedpur', 'Private', 'Jamshedpur, Jharkhand', 1700000, 1, 'https://www.xlri.ac.in', '[{"round":"R1","date":"2026-10-05","type":"CAT"},{"round":"R2","date":"2026-12-10","type":"CAT"},{"round":"Final","date":"2027-01-20","type":"Result"}]'),
('FMS Delhi', 'Government', 'New Delhi, Delhi', 640000, 1, 'https://www.fms.delhi.gov.in', '[{"round":"R1","date":"2026-10-20","type":"CAT"},{"round":"Final","date":"2027-02-15","type":"Result"}]'),
('MDI Gurgaon', 'Private', 'Gurgaon, Haryana', 1500000, 1, 'https://www.mdi.ac.in', '[{"round":"R1","date":"2026-10-10","type":"CAT"},{"round":"R2","date":"2026-12-15","type":"CAT"},{"round":"Final","date":"2027-01-25","type":"Result"}]'),
('SPJIMR Mumbai', 'Private', 'Mumbai, Maharashtra', 1800000, 1, 'https://www.spjimr.org', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-05","type":"Result"}]'),
('IIM Shillong', 'IIM', 'Shillong, Meghalaya', 1300000, 1, 'https://www.iimshillong.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-01-30","type":"Result"}]'),
('IIM Rohtak', 'IIM', 'Rohtak, Haryana', 1350000, 1, 'https://www.iimrohtak.ac.in', '[{"round":"R1","date":"2026-10-12","type":"CAT"},{"round":"R2","date":"2026-12-18","type":"CAT"},{"round":"Final","date":"2027-01-28","type":"Result"}]'),
('IIM Ranchi', 'IIM', 'Ranchi, Jharkhand', 1400000, 1, 'https://www.iimranchi.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-01","type":"Result"}]'),
('IIM Udaipur', 'IIM', 'Udaipur, Rajasthan', 1350000, 1, 'https://www.iimu.ac.in', '[{"round":"R1","date":"2026-10-10","type":"CAT"},{"round":"R2","date":"2026-12-15","type":"CAT"},{"round":"Final","date":"2027-01-25","type":"Result"}]'),
('IIM Tiruchirappalli', 'IIM', 'Tiruchirappalli, Tamil Nadu', 1300000, 1, 'https://www.iimtrichy.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-05","type":"Result"}]'),
('IIM Kashipur', 'IIM', 'Kashipur, Uttarakhand', 1250000, 1, 'https://www.iimkashipur.ac.in', '[{"round":"R1","date":"2026-10-12","type":"CAT"},{"round":"R2","date":"2026-12-18","type":"CAT"},{"round":"Final","date":"2027-01-28","type":"Result"}]'),
('IIT Bombay SJMSOM', 'IIT', 'Mumbai, Maharashtra', 2200000, 1, 'https://www.sjmsom.iitb.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-10","type":"Result"}]'),
('IIT Delhi DMS', 'IIT', 'New Delhi, Delhi', 2000000, 1, 'https://www.dms.iitd.ac.in', '[{"round":"R1","date":"2026-10-10","type":"CAT"},{"round":"R2","date":"2026-12-15","type":"CAT"},{"round":"Final","date":"2027-02-05","type":"Result"}]'),
('IIT Kharagpur VGSoM', 'IIT', 'Kharagpur, West Bengal', 1900000, 1, 'https://www.iitkgp.ac.in/vgsom', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-01","type":"Result"}]'),

-- TIER 2 (20): NITIE, XIMB, IMT, TAPMI, GIM, FORE, LBSIM, IMI, Great Lakes, SIBM, SCMHRD, PUMBA, KJ Somaiya, BIMTECH, XIME, IIM Bodhgaya, IIM Jammu, IIM Sambalpur, IIM Sirmaur, IIM Nagpur
('NITIE Mumbai', 'Government', 'Mumbai, Maharashtra', 1200000, 2, 'https://www.nitie.ac.in', '[{"round":"R1","date":"2026-10-20","type":"CAT"},{"round":"R2","date":"2027-01-15","type":"CAT"},{"round":"Final","date":"2027-02-28","type":"Result"}]'),
('XIMB Bhubaneswar', 'Private', 'Bhubaneswar, Odisha', 1100000, 2, 'https://www.ximb.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-05","type":"Result"}]'),
('IMT Ghaziabad', 'Private', 'Ghaziabad, Uttar Pradesh', 920000, 2, 'https://www.imtghaziabad.ac.in', '[{"round":"R1","date":"2026-10-10","type":"CAT"},{"round":"R2","date":"2026-12-15","type":"CAT"},{"round":"Final","date":"2027-01-25","type":"Result"}]'),
('TAPMI Manipal', 'Private', 'Manipal, Karnataka', 1050000, 2, 'https://www.tapmi.edu.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-01","type":"Result"}]'),
('GIM Goa', 'Private', 'Goa', 950000, 2, 'https://www.gim.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-05","type":"Result"}]'),
('FORE Delhi', 'Private', 'New Delhi, Delhi', 1000000, 2, 'https://www.foreindia.org', '[{"round":"R1","date":"2026-10-20","type":"CAT"},{"round":"R2","date":"2026-12-25","type":"CAT"},{"round":"Final","date":"2027-02-10","type":"Result"}]'),
('LBSIM Delhi', 'Private', 'New Delhi, Delhi', 1100000, 2, 'https://www.lbsim.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-05","type":"Result"}]'),
('IMI Delhi', 'Private', 'New Delhi, Delhi', 1000000, 2, 'https://www.imidel.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-01","type":"Result"}]'),
('Great Lakes Chennai', 'Private', 'Chennai, Tamil Nadu', 1050000, 2, 'https://www.greatlakes.ac.in', '[{"round":"R1","date":"2026-10-10","type":"CAT"},{"round":"R2","date":"2026-12-15","type":"CAT"},{"round":"Final","date":"2027-01-30","type":"Result"}]'),
('SIBM Pune', 'Private', 'Pune, Maharashtra', 1250000, 2, 'https://www.sibm.edu', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-05","type":"Result"}]'),
('SCMHRD Pune', 'Private', 'Pune, Maharashtra', 950000, 2, 'https://www.scmhrd.edu', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-01","type":"Result"}]'),
('PUMBA Pune', 'Government', 'Pune, Maharashtra', 480000, 2, 'https://www.unipune.ac.in/pumba', '[{"round":"R1","date":"2026-10-25","type":"CAT"},{"round":"Final","date":"2027-02-20","type":"Result"}]'),
('KJ Somaiya Mumbai', 'Private', 'Mumbai, Maharashtra', 900000, 2, 'https://www.kjsomaiya.edu', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-05","type":"Result"}]'),
('BIMTECH Greater Noida', 'Private', 'Greater Noida, Uttar Pradesh', 850000, 2, 'https://www.bimtech.ac.in', '[{"round":"R1","date":"2026-10-10","type":"CAT"},{"round":"R2","date":"2026-12-15","type":"CAT"},{"round":"Final","date":"2027-01-25","type":"Result"}]'),
('XIME Bangalore', 'Private', 'Bangalore, Karnataka', 900000, 2, 'https://www.xime.co.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-01","type":"Result"}]'),
('IIM Bodhgaya', 'IIM', 'Bodhgaya, Bihar', 1200000, 2, 'https://www.iimbodhgaya.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-05","type":"Result"}]'),
('IIM Jammu', 'IIM', 'Jammu, Jammu & Kashmir', 1200000, 2, 'https://www.iimjammu.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-01","type":"Result"}]'),
('IIM Sambalpur', 'IIM', 'Sambalpur, Odisha', 1150000, 2, 'https://www.iimsambalpur.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-05","type":"Result"}]'),
('IIM Sirmaur', 'IIM', 'Sirmaur, Himachal Pradesh', 1200000, 2, 'https://www.iimsirmaur.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-01","type":"Result"}]'),
('IIM Nagpur', 'IIM', 'Nagpur, Maharashtra', 1200000, 2, 'https://www.iimnagpur.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2026-12-20","type":"CAT"},{"round":"Final","date":"2027-02-05","type":"Result"}]'),

-- TIER 3 (20): Alliance, Christ, Amity, Symbiosis, IILM, NDIM, JIMS, IPE, IFIM, ISBR, Woxsen, SOIL, BIMM, Indus, SDMIMD, Xavier, IISWBM, XISS, MIBM, ITM
('Alliance Bangalore', 'Private', 'Bangalore, Karnataka', 780000, 3, 'https://www.alliancebschool.ac.in', '[{"round":"R1","date":"2026-10-20","type":"CAT"},{"round":"R2","date":"2027-01-15","type":"CAT"},{"round":"Final","date":"2027-02-28","type":"Result"}]'),
('Christ University Bangalore', 'Private', 'Bangalore, Karnataka', 850000, 3, 'https://www.christuniversity.in/mba', '[{"round":"R1","date":"2026-10-20","type":"CAT"},{"round":"R2","date":"2027-01-20","type":"CAT"},{"round":"Final","date":"2027-03-01","type":"Result"}]'),
('Amity Noida', 'Private', 'Noida, Uttar Pradesh', 700000, 3, 'https://www.amity.edu/noida', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2027-01-10","type":"CAT"},{"round":"Final","date":"2027-02-28","type":"Result"}]'),
('Symbiosis Noida', 'Private', 'Noida, Uttar Pradesh', 720000, 3, 'https://www.siu.edu.in', '[{"round":"R1","date":"2026-10-20","type":"CAT"},{"round":"R2","date":"2027-01-15","type":"CAT"},{"round":"Final","date":"2027-02-28","type":"Result"}]'),
('IILM Gurgaon', 'Private', 'Gurgaon, Haryana', 750000, 3, 'https://www.iilm.edu', '[{"round":"R1","date":"2026-10-20","type":"CAT"},{"round":"R2","date":"2027-01-15","type":"CAT"},{"round":"Final","date":"2027-03-01","type":"Result"}]'),
('NDIM Delhi', 'Private', 'New Delhi, Delhi', 650000, 3, 'https://www.ndim.edu.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2027-01-10","type":"CAT"},{"round":"Final","date":"2027-02-20","type":"Result"}]'),
('JIMS Delhi', 'Private', 'New Delhi, Delhi', 680000, 3, 'https://www.jimsdelhincr.ac.in', '[{"round":"R1","date":"2026-10-20","type":"CAT"},{"round":"R2","date":"2027-01-15","type":"CAT"},{"round":"Final","date":"2027-02-28","type":"Result"}]'),
('IPE Hyderabad', 'Private', 'Hyderabad, Telangana', 750000, 3, 'https://www.ipe.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2027-01-10","type":"CAT"},{"round":"Final","date":"2027-03-01","type":"Result"}]'),
('IFIM Bangalore', 'Private', 'Bangalore, Karnataka', 720000, 3, 'https://www.ifimbangalore.ac.in', '[{"round":"R1","date":"2026-10-20","type":"CAT"},{"round":"R2","date":"2027-01-20","type":"CAT"},{"round":"Final","date":"2027-02-28","type":"Result"}]'),
('ISBR Bangalore', 'Private', 'Bangalore, Karnataka', 750000, 3, 'https://www.isbr.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2027-01-15","type":"CAT"},{"round":"Final","date":"2027-03-01","type":"Result"}]'),
('Woxsen Hyderabad', 'Private', 'Hyderabad, Telangana', 780000, 3, 'https://www.woxsen.ac.in', '[{"round":"R1","date":"2026-10-20","type":"CAT"},{"round":"R2","date":"2027-01-15","type":"CAT"},{"round":"Final","date":"2027-02-28","type":"Result"}]'),
('SOIL Gurgaon', 'Private', 'Gurgaon, Haryana', 700000, 3, 'https://www.soildelhi.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2027-01-10","type":"CAT"},{"round":"Final","date":"2027-02-25","type":"Result"}]'),
('BIMM Pune', 'Private', 'Pune, Maharashtra', 650000, 3, 'https://www.bimmpune.edu.in', '[{"round":"R1","date":"2026-10-20","type":"CAT"},{"round":"R2","date":"2027-01-15","type":"CAT"},{"round":"Final","date":"2027-02-28","type":"Result"}]'),
('Indus Business Academy Bangalore', 'Private', 'Bangalore, Karnataka', 720000, 3, 'https://www.indusuniversity.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2027-01-15","type":"CAT"},{"round":"Final","date":"2027-03-01","type":"Result"}]'),
('SDMIMD Mysore', 'Private', 'Mysore, Karnataka', 650000, 3, 'https://www.sdmimd.ac.in', '[{"round":"R1","date":"2026-10-20","type":"CAT"},{"round":"R2","date":"2027-01-20","type":"CAT"},{"round":"Final","date":"2027-02-28","type":"Result"}]'),
('Xavier Institute Bhubaneswar', 'Private', 'Bhubaneswar, Odisha', 720000, 3, 'https://www.xavier.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2027-01-15","type":"CAT"},{"round":"Final","date":"2027-03-01","type":"Result"}]'),
('IISWBM Kolkata', 'Private', 'Kolkata, West Bengal', 700000, 3, 'https://www.iiswbm.edu', '[{"round":"R1","date":"2026-10-20","type":"CAT"},{"round":"R2","date":"2027-01-15","type":"CAT"},{"round":"Final","date":"2027-02-28","type":"Result"}]'),
('XISS Ranchi', 'Private', 'Ranchi, Jharkhand', 680000, 3, 'https://www.xiss.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2027-01-10","type":"CAT"},{"round":"Final","date":"2027-02-20","type":"Result"}]'),
('MIBM Pune', 'Private', 'Pune, Maharashtra', 700000, 3, 'https://www.mibmpune.edu.in', '[{"round":"R1","date":"2026-10-20","type":"CAT"},{"round":"R2","date":"2027-01-15","type":"CAT"},{"round":"Final","date":"2027-02-28","type":"Result"}]'),
('ITM Navi Mumbai', 'Private', 'Navi Mumbai, Maharashtra', 650000, 3, 'https://www.itmuniversity.ac.in', '[{"round":"R1","date":"2026-10-15","type":"CAT"},{"round":"R2","date":"2027-01-10","type":"CAT"},{"round":"Final","date":"2027-02-25","type":"Result"}]')

ON CONFLICT (name) DO UPDATE SET
  type = EXCLUDED.type,
  location = EXCLUDED.location,
  avg_fees = EXCLUDED.avg_fees,
  tier = EXCLUDED.tier,
  website_url = EXCLUDED.website_url,
  deadlines = EXCLUDED.deadlines;

-- Verify insert
SELECT COUNT(*) as total_colleges, tier, COUNT(*) as count_by_tier
FROM colleges
WHERE tier IS NOT NULL
GROUP BY tier
ORDER BY tier;
