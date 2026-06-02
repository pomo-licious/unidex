-- Seed exam calendar data for 2026-27 cycle
INSERT INTO exam_calendar (exam_name, exam_type, exam_date, reg_open, reg_close, fee_inr, attempts, accepting_colleges, notes) VALUES
('CAT 2026', 'CAT', '2026-10-18', '2026-08-05', '2026-09-16', 2300, 5, ARRAY['IIM Ahmedabad', 'IIM Bangalore', 'IIM Calcutta', 'IIM Delhi', 'FMS Delhi', 'XLRI Jamshedpur'], '2026 cycle exam'),
('XAT 2027', 'XAT', '2027-01-09', '2026-10-15', '2026-12-30', 2050, 2, ARRAY['XLRI Jamshedpur', 'XIMB Bhubaneswar', 'XIM Bhubaneswar', 'Great Lakes Chennai'], 'Accepted by top tier-2 colleges'),
('SNAP 2026', 'SNAP', '2026-12-13', '2026-09-01', '2026-11-22', 2000, 4, ARRAY['Symbiosis Pune', 'Symbiosis Hyderabad', 'Symbiosis Bengaluru', 'SIBM Pune'], 'Test by Symbiosis Institute'),
('NMAT 2026', 'NMAT', '2026-10-05', '2026-07-17', '2026-09-30', 2300, 5, ARRAY['NMIMS Mumbai', 'NMIMS Bangalore', 'NMIMS Hyderabad', 'NMIMS Delhi'], 'Register via prometric.com'),
('CMAT 2027', 'CMAT', '2027-01-24', '2026-11-01', '2027-01-10', 1500, 2, ARRAY['MATS Pune', 'SCMHRD Pune', 'Goa Business School', 'Welingkar Mumbai'], 'NTA conducted'),
('MAT 2026', 'MAT', '2026-12-11', '2026-10-20', '2026-11-30', 1200, 3, ARRAY['TAPMI Bangalore', 'Bal Bharati New Delhi', 'Christ Bangalore'], '3 attempts per year'),
('MAH-CET 2027', 'MAH-CET', '2027-01-11', '2026-12-01', '2026-12-28', 1000, 1, ARRAY['JBIMS Mumbai', 'SIMSREE Mumbai', 'KES Shravanam Pune'], 'For Maharashtra colleges'),
('GMAT', 'GMAT', NULL, NULL, NULL, 31000, 5, ARRAY['ISB Hyderabad', 'Great Lakes Chennai', 'SP Jain Mumbai', 'MICA Ahmedabad'], 'Year-round, computer-based')
ON CONFLICT DO NOTHING;
