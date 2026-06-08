-- Create saved_colleges table for save-for-later heart button (FIX 4)
CREATE TABLE saved_colleges (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  college_id BIGINT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint: each student can save a college only once
  UNIQUE(student_id, college_id)
);

-- Index for fast lookups by student
CREATE INDEX idx_saved_colleges_student_id ON saved_colleges(student_id);
CREATE INDEX idx_saved_colleges_college_id ON saved_colleges(college_id);

-- RLS: Users can only see/modify their own saved colleges
ALTER TABLE saved_colleges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved colleges"
  ON saved_colleges FOR SELECT
  USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own saved colleges"
  ON saved_colleges FOR INSERT
  WITH CHECK (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own saved colleges"
  ON saved_colleges FOR DELETE
  USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));
