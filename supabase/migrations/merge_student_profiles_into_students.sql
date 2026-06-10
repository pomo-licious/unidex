-- Merge student_profiles data into students.academic_background
-- This migration consolidates profile data from student_profiles table into students table

-- Step 1: Check if student_profiles table exists, then migrate data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'student_profiles'
  ) THEN
    -- Migrate data from student_profiles to students.academic_background
    UPDATE students s
    SET academic_background = COALESCE(s.academic_background, '{}'::jsonb) || jsonb_build_object(
      'mobile', sp.mobile,
      'date_of_birth', sp.date_of_birth,
      'gender', sp.gender,
      'nationality', sp.nationality,
      'address_line1', sp.address_line1,
      'address_line2', sp.address_line2,
      'city', sp.city,
      'state', sp.state,
      'pincode', sp.pincode,
      'country', COALESCE(sp.country, 'India'),
      'college', sp.undergrad_college,
      'degree', sp.undergrad_degree,
      'major', sp.undergrad_major,
      'cgpa', sp.undergrad_gpa,
      'gpa_scale', COALESCE(sp.undergrad_gpa_scale, 10),
      'grad_year', sp.undergrad_year_end,
      'cat_percentile', sp.cat_percentile,
      'cat_year', sp.cat_year,
      'cat_varc', sp.cat_varc_percentile,
      'cat_dilr', sp.cat_dilr_percentile,
      'cat_qa', sp.cat_qa_percentile,
      'gmat_score', sp.gmat_score,
      'gre_score', sp.gre_score,
      'company', sp.current_employer,
      'role', sp.current_designation,
      'industry', sp.current_industry,
      'work_exp_yrs', CASE
        WHEN sp.total_work_months IS NOT NULL THEN sp.total_work_months::float / 12
        ELSE NULL
      END,
      'why_mba', sp.why_mba,
      'short_term_goals', sp.short_term_goals,
      'long_term_goals', sp.long_term_goals,
      'sop_short', sp.sop_short,
      'sop_long', sp.sop_long
    )
    FROM student_profiles sp
    WHERE sp.user_id = s.user_id;

    RAISE NOTICE 'Successfully migrated data from student_profiles to students.academic_background';
  ELSE
    RAISE NOTICE 'student_profiles table does not exist. No data to migrate.';
  END IF;
END $$;

-- Step 2: Drop student_profiles table if it exists
DROP TABLE IF EXISTS student_profiles;
