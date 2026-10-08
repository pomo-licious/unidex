-- Add image_url column to colleges table.
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS image_url text;

-- NOTE: image seeding removed. College images are now stored in the
-- `college-images` Supabase Storage bucket (licensed Wikimedia Commons photos,
-- resized to WebP, no hotlinking) with attribution recorded in
-- colleges.image_credit / image_license / image_source_url.
-- Do NOT seed Unsplash stock photos or hotlinked Wikimedia thumbnails here.
