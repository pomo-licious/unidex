# Supabase Manual Updates Required

This document describes the manual updates needed on Supabase that are NOT in version control.

## Status: ✅ COMPLETE (after running migration)

After running the migration `merge_student_profiles_into_students.sql`, follow these steps:

---

## TASK 3: Update Edge Functions

The edge functions `get-profile` and `profile-formfill` are deployed on Supabase but not in this Git repo.
They need to be updated to read from `students.academic_background` instead of the `student_profiles` table.

### Location
- Dashboard: https://app.supabase.com/project/[PROJECT_ID]/functions
- Functions: `get-profile`, `profile-formfill`

### Changes Required

#### 1. Remove student_profiles table fetch

**Before:**
```typescript
const { data: profileData } = await supabase
  .from('student_profiles')
  .select('*')
  .eq('user_id', user_id)
  .single()
```

**After:**
```typescript
// Remove this query entirely
// All data is now in students.academic_background
```

#### 2. Read academic_background from students table

```typescript
const { data: student } = await supabase
  .from('students')
  .select('id, name, email, academic_background, academic_10th, academic_12th, academic_graduation, exam_scores')
  .eq('user_id', user_id)
  .single()

const bg = student?.academic_background ?? {}
```

#### 3. Field Mapping

Map fields from `academic_background` JSONB:

```typescript
const profile = {
  // From students table (top level)
  id: student.id,
  name: student.name,
  email: student.email,
  
  // OCR data (priority 1) — directly on students table
  academic_10th: student.academic_10th || null,
  academic_12th: student.academic_12th || null,
  academic_graduation: student.academic_graduation || null,
  exam_scores: student.exam_scores || null,
  
  // Personal info (priority 2) — from academic_background JSONB
  mobile: bg.mobile,
  date_of_birth: bg.date_of_birth,
  gender: bg.gender,
  nationality: bg.nationality,
  address_line1: bg.address_line1,
  address_line2: bg.address_line2,
  city: bg.city,
  state: bg.state,
  pincode: bg.pincode,
  country: bg.country || 'India',
  
  // Education (priority 2)
  undergrad_college: bg.college,
  undergrad_degree: bg.degree,
  undergrad_major: bg.major,
  undergrad_gpa: bg.cgpa,
  undergrad_gpa_scale: bg.gpa_scale || 10,
  undergrad_year_end: bg.grad_year,
  
  // Entrance exams (priority 2)
  cat_percentile: bg.cat_percentile,
  cat_year: bg.cat_year,
  cat_varc_percentile: bg.cat_varc,
  cat_dilr_percentile: bg.cat_dilr,
  cat_qa_percentile: bg.cat_qa,
  gmat_score: bg.gmat_score,
  gre_score: bg.gre_score,
  
  // Work experience (priority 2)
  current_employer: bg.company,
  current_designation: bg.role,
  current_industry: bg.industry,
  total_work_months: bg.work_exp_yrs ? Math.round(bg.work_exp_yrs * 12) : null,
  
  // Goals and essays (priority 2)
  why_mba: bg.why_mba,
  short_term_goals: bg.short_term_goals,
  long_term_goals: bg.long_term_goals,
  sop_short: bg.sop_short,
  sop_long: bg.sop_long,
}
```

---

## TASK 4: Drop student_profiles Table

**Status:** Handled by migration `merge_student_profiles_into_students.sql`

The migration automatically drops the `student_profiles` table after data is migrated.

To apply the migration:

### Option 1: Supabase Dashboard
1. Go to SQL Editor
2. Open the migration file: `supabase/migrations/merge_student_profiles_into_students.sql`
3. Copy and paste the SQL
4. Run it

### Option 2: Supabase CLI
```bash
supabase db push
```

This automatically runs all pending migrations, including this one.

---

## Verification After Changes

After applying the migration and updating edge functions, verify:

1. **Migration applied:**
   ```sql
   SELECT * FROM students WHERE user_id = '<test-user-id>';
   -- Should show academic_background JSONB with all migrated data
   
   -- Verify table is dropped
   SELECT EXISTS (
     SELECT 1 FROM information_schema.tables
     WHERE table_name = 'student_profiles'
   );
   -- Should return false
   ```

2. **Edge functions working:**
   - Call `get-profile` endpoint
   - Should return all profile data from `students.academic_background`
   - No 404 or null errors

3. **Frontend Onboarding flow:**
   - Sign up with new account
   - Fill profile form
   - Click "Start Tracking"
   - Should save to `students.academic_background`
   - Navigate to profile page without errors

---

## Timeline

- Migration SQL created: 2026-06-10
- Edge functions update deadline: After migration is applied
- Student_profiles drop: Automatic with migration (Step 2)

Once edge functions are updated on Supabase and migration is applied, all four tasks will be complete.
