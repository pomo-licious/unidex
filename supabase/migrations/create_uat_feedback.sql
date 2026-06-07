-- Create UAT feedback table
CREATE TABLE IF NOT EXISTS uat_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Step 1: About you
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  user_type TEXT NOT NULL, -- CAT aspirant, MBA student, Working professional, Other
  cat_percentile INTEGER,
  device TEXT NOT NULL, -- Desktop, Mobile, Tablet

  -- Step 2: Task completion
  tasks_completed TEXT[] DEFAULT ARRAY[]::TEXT[], -- array of task names

  -- Step 3: Ratings
  rating_overall INTEGER, -- 1-5
  rating_ease INTEGER, -- 1-5
  rating_design INTEGER, -- 1-5
  rating_usefulness INTEGER, -- 1-5
  rating_data_quality INTEGER, -- 1-5
  nps_score INTEGER, -- 0-10

  -- Step 4: Open feedback
  best_feature TEXT,
  biggest_problem TEXT,
  missing_feature TEXT,
  would_pay TEXT,
  bugs_found TEXT,
  bug_severity TEXT, -- Critical, High, Medium, Low, None
  comments TEXT,
  bug_resolved BOOLEAN DEFAULT FALSE
);

-- Create index on email for quick lookups
CREATE INDEX IF NOT EXISTS idx_uat_feedback_email ON uat_feedback(email);
CREATE INDEX IF NOT EXISTS idx_uat_feedback_created_at ON uat_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uat_feedback_bug_severity ON uat_feedback(bug_severity);
