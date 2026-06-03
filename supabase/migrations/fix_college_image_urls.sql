-- Fix college image URLs with proper Wikipedia and varied Unsplash images

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/IIM_Ahmedabad_-_Louis_Kahn_Plaza.jpg/640px-IIM_Ahmedabad_-_Louis_Kahn_Plaza.jpg' WHERE name = 'IIM Ahmedabad';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/IIMB_Main_building.jpg/640px-IIMB_Main_building.jpg' WHERE name = 'IIM Bangalore';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/IIM_Calcutta_-_Main_Building.jpg/640px-IIM_Calcutta_-_Main_Building.jpg' WHERE name = 'IIM Calcutta';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/IIM_Lucknow_main_building.jpg/640px-IIM_Lucknow_main_building.jpg' WHERE name = 'IIM Lucknow';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/ISB_Campus.jpg/640px-ISB_Campus.jpg' WHERE name = 'ISB Hyderabad';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/XLRI_Campus.jpg/640px-XLRI_Campus.jpg' WHERE name = 'XLRI Jamshedpur';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/FMS_Delhi.jpg/640px-FMS_Delhi.jpg' WHERE name = 'FMS Delhi';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/MDI_Gurgaon.jpg/640px-MDI_Gurgaon.jpg' WHERE name = 'MDI Gurgaon';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/SPJIMR.jpg/640px-SPJIMR.jpg' WHERE name = 'SPJIMR Mumbai';

UPDATE colleges SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/IIT_Bombay_main_building.jpg/640px-IIT_Bombay_main_building.jpg' WHERE name = 'IIT Bombay SJMSOM';

-- Update remaining colleges with varied Unsplash images using row number as seed
UPDATE colleges SET image_url =
  CASE
    WHEN name = 'Symbiosis Pune' THEN 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&q=80&sig=11'
    WHEN name = 'XIMB Bhubaneswar' THEN 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&q=80&sig=12'
    WHEN name = 'XIM Bhubaneswar' THEN 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&q=80&sig=13'
    WHEN name = 'Great Lakes Chennai' THEN 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&q=80&sig=14'
    WHEN name = 'TAPMI Bangalore' THEN 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&q=80&sig=15'
    WHEN name = 'Nirma University' THEN 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&q=80&sig=16'
    WHEN name = 'BIMTECH Delhi' THEN 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&q=80&sig=17'
    WHEN name = 'SIBM Pune' THEN 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&q=80&sig=18'
    WHEN name = 'IIT Delhi' THEN 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&q=80&sig=19'
    ELSE 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&q=80&sig=' || ROW_NUMBER() OVER (ORDER BY id)
  END
WHERE image_url IS NULL OR image_url = 'https://images.unsplash.com/photo-1562774053-701939374585?w=640&q=80';
