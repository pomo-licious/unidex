-- Seed placement data for top colleges
UPDATE colleges SET
  placement_avg_lpa = 35,
  placement_median_lpa = 32,
  placement_highest_lpa = 120,
  placement_pct = 100,
  batch_size = 385,
  nirf_rank = 1,
  top_recruiters = ARRAY['McKinsey','BCG','Bain','Goldman Sachs','Amazon','Google','Flipkart','Hindustan Unilever','Aditya Birla','JP Morgan'],
  about = 'IIM Ahmedabad is India''s premier management institution, ranked #1 by NIRF. Known for its rigorous curriculum and world-class faculty.'
WHERE name = 'IIM Ahmedabad';

UPDATE colleges SET
  placement_avg_lpa = 33,
  placement_median_lpa = 30,
  placement_highest_lpa = 115,
  placement_pct = 100,
  batch_size = 405,
  nirf_rank = 2,
  top_recruiters = ARRAY['McKinsey','BCG','Microsoft','Amazon','Flipkart','Accenture','Deloitte','KPMG','EY','PwC'],
  about = 'IIM Bangalore is one of India''s top business schools with a strong focus on innovation and entrepreneurship.'
WHERE name = 'IIM Bangalore';

UPDATE colleges SET
  placement_avg_lpa = 32,
  placement_median_lpa = 29,
  placement_highest_lpa = 110,
  placement_pct = 100,
  batch_size = 460,
  nirf_rank = 3,
  top_recruiters = ARRAY['BCG','McKinsey','Amazon','Goldman Sachs','Deutsche Bank','Citibank','ITC','HUL','P&G','Nestle'],
  about = 'IIM Calcutta is India''s second-oldest IIM with a strong alumni network and placement record.'
WHERE name = 'IIM Calcutta';

UPDATE colleges SET
  placement_avg_lpa = 28,
  placement_median_lpa = 25,
  placement_highest_lpa = 85,
  placement_pct = 100,
  batch_size = 493,
  nirf_rank = 7,
  top_recruiters = ARRAY['Amazon','Flipkart','Deloitte','EY','KPMG','Accenture','ITC','HUL','Asian Paints','Dabur'],
  about = 'IIM Lucknow is known for its strong academics and vibrant campus life.'
WHERE name = 'IIM Lucknow';

UPDATE colleges SET
  placement_avg_lpa = 30,
  placement_median_lpa = 27,
  placement_highest_lpa = 95,
  placement_pct = 100,
  batch_size = 240,
  nirf_rank = 12,
  top_recruiters = ARRAY['Amazon','Microsoft','McKinsey','BCG','Tata Steel','JSW','Mahindra','HUL','ITC','Nestle'],
  about = 'XLRI Jamshedpur is a premier business school with a diverse and global student body.'
WHERE name = 'XLRI Jamshedpur';

UPDATE colleges SET
  placement_avg_lpa = 34,
  placement_median_lpa = 31,
  placement_highest_lpa = 108,
  placement_pct = 98,
  batch_size = 900,
  nirf_rank = 5,
  top_recruiters = ARRAY['Amazon','Google','Microsoft','McKinsey','BCG','Bain','Goldman Sachs','JP Morgan','Sequoia','SoftBank'],
  about = 'ISB is India''s premier postgraduate business school with strong international presence.'
WHERE name = 'ISB Hyderabad';

UPDATE colleges SET
  placement_avg_lpa = 27,
  placement_median_lpa = 24,
  placement_highest_lpa = 72,
  placement_pct = 100,
  batch_size = 220,
  nirf_rank = 9,
  top_recruiters = ARRAY['Amazon','Flipkart','Deloitte','EY','ITC','HUL','Asian Paints','Maruti','Hero','Bajaj'],
  about = 'FMS Delhi is one of India''s oldest business schools, part of Delhi University.'
WHERE name = 'FMS Delhi';

UPDATE colleges SET
  placement_avg_lpa = 25,
  placement_median_lpa = 22,
  placement_highest_lpa = 65,
  placement_pct = 100,
  batch_size = 300,
  nirf_rank = 14,
  top_recruiters = ARRAY['Amazon','Deloitte','EY','KPMG','ITC','HUL','Nestle','P&G','Maruti','Hero'],
  about = 'MDI Gurgaon is a leading business school with strong corporate partnerships.'
WHERE name = 'MDI Gurgaon';

UPDATE colleges SET
  placement_avg_lpa = 28,
  placement_median_lpa = 25,
  placement_highest_lpa = 80,
  placement_pct = 100,
  batch_size = 240,
  nirf_rank = 11,
  top_recruiters = ARRAY['Amazon','Google','McKinsey','BCG','Goldman Sachs','Aditya Birla','Mahindra','ITC','HUL','P&G'],
  about = 'SPJIMR is a premier business school in Mumbai with a strong focus on social responsibility.'
WHERE name = 'SPJIMR Mumbai';

UPDATE colleges SET
  placement_avg_lpa = 26,
  placement_median_lpa = 23,
  placement_highest_lpa = 75,
  placement_pct = 100,
  batch_size = 120,
  nirf_rank = 8,
  top_recruiters = ARRAY['Amazon','Google','Microsoft','McKinsey','Goldman Sachs','JP Morgan','Flipkart','Ola','Paytm','Zomato'],
  about = 'SJMSOM at IIT Bombay is part of India''s top engineering institute with excellent placements.'
WHERE name = 'IIT Bombay SJMSOM';
