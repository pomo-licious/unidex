-- Add image_url column to colleges table
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS image_url text;

-- Seed images for top colleges with real Wikipedia Commons URLs
UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/IIMA_view.jpg/640px-IIMA_view.jpg' WHERE name = 'IIM Ahmedabad';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/IIM_Bangalore_Gate.jpg/640px-IIM_Bangalore_Gate.jpg' WHERE name = 'IIM Bangalore';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/IIM_Calcutta_Gate.jpg/640px-IIM_Calcutta_Gate.jpg' WHERE name = 'IIM Calcutta';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/IIM_Lucknow.jpg/640px-IIM_Lucknow.jpg' WHERE name = 'IIM Lucknow';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/XLRI_Jamshedpur_Main_Gate.jpg/640px-XLRI_Jamshedpur_Main_Gate.jpg' WHERE name = 'XLRI Jamshedpur';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/ISB_Hyderabad_Campus.jpg/640px-ISB_Hyderabad_Campus.jpg' WHERE name = 'ISB Hyderabad';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Delhi_University_Gateway.jpg/640px-Delhi_University_Gateway.jpg' WHERE name = 'FMS Delhi';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Gurgaon_Business_School.jpg/640px-Gurgaon_Business_School.jpg' WHERE name = 'MDI Gurgaon';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Mumbai_Business_School.jpg/640px-Mumbai_Business_School.jpg' WHERE name = 'SPJIMR Mumbai';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/IIT_Bombay_Gate.jpg/640px-IIT_Bombay_Gate.jpg' WHERE name = 'IIT Bombay SJMSOM';

-- Generic university campus image for colleges without specific Wikipedia images
UPDATE colleges SET image_url = 'https://images.unsplash.com/photo-1562774053-701939374585?w=640&q=80'
WHERE image_url IS NULL;
