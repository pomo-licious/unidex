-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase Storage bucket setup for student document uploads
-- ─────────────────────────────────────────────────────────────────────────────

-- Create the storage bucket for student documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-documents', 'student-documents', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Students can upload their own documents
-- File path format: {user_id}/{filename}
CREATE POLICY "Students can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'student-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Students can read their own documents
CREATE POLICY "Students can read own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'student-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Students can delete their own documents
CREATE POLICY "Students can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'student-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add documents column to students table to track document metadata
ALTER TABLE students
ADD COLUMN IF NOT EXISTS documents jsonb;

-- Verification queries
-- List all buckets:
-- SELECT id, name, public, created_at FROM storage.buckets;
--
-- List storage RLS policies:
-- SELECT schemaname, tablename, policyname FROM pg_policies
-- WHERE tablename = 'objects' AND schemaname = 'storage';
--
-- Check students table columns:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'students' ORDER BY ordinal_position;
