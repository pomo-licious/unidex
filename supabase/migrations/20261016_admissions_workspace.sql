-- Additive admissions workspace. Run once through the Supabase SQL editor or CLI.
-- Existing students, colleges, applications, documents and policies are untouched.
create extension if not exists pgcrypto;

create table if not exists public.student_admissions_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version > 0),
  revision bigint not null default 1,
  profile jsonb not null default '{}'::jsonb check (jsonb_typeof(profile) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_admissions_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  storage_bucket text not null default 'unidex-admissions-private' check (storage_bucket = 'unidex-admissions-private'),
  storage_path text not null unique,
  status text not null default 'uploaded' check (status in ('uploaded', 'extracting', 'needs_review', 'reviewed', 'error')),
  extracted_data jsonb,
  reviewed_data jsonb,
  reviewed_at timestamptz,
  extraction_error text,
  extraction_model text,
  extraction_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (split_part(storage_path, '/', 1) = user_id::text),
  check (reviewed_at is null or reviewed_data is not null)
);
create index if not exists admissions_documents_owner_created on public.student_admissions_documents(user_id, created_at desc);
alter table public.student_admissions_documents add column if not exists extraction_started_at timestamptz;

create table if not exists public.admissions_ocr_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.student_admissions_documents(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists admissions_ocr_requests_owner_time on public.admissions_ocr_requests(user_id, started_at desc);
alter table public.admissions_ocr_requests enable row level security;
revoke all on public.admissions_ocr_requests from public, anon, authenticated;
grant all on public.admissions_ocr_requests to service_role;

create table if not exists public.admissions_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1,
  draft jsonb not null default '{}'::jsonb check (jsonb_typeof(draft) = 'object'),
  updated_at timestamptz not null default now()
);

create table if not exists public.admissions_college_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  college_id text not null,
  college_snapshot jsonb not null check (jsonb_typeof(college_snapshot) = 'object'),
  status text not null default 'Researching',
  notes text not null default '',
  checklist jsonb not null default '{}'::jsonb,
  is_bookmarked boolean not null default false,
  is_selected boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(user_id, college_id)
);

-- Immutable through the client: the submission RPC is the only authenticated write path.
-- A snapshot is an internal Unidex receipt, not a claim of delivery to a college.
create table if not exists public.admissions_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  receipt text not null unique,
  schema_version integer not null default 1,
  status text not null default 'received' check (status = 'received'),
  profile_snapshot jsonb not null check (jsonb_typeof(profile_snapshot) = 'object'),
  colleges_snapshot jsonb not null check (jsonb_typeof(colleges_snapshot) = 'array' and jsonb_array_length(colleges_snapshot) > 0),
  college_answers_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(college_answers_snapshot) = 'object'),
  consents jsonb not null check (jsonb_typeof(consents) = 'object'),
  submitted_at timestamptz not null default now(),
  unique(user_id, request_id)
);
create index if not exists admissions_submissions_owner_created on public.admissions_submissions(user_id, submitted_at desc);

create or replace function public.admissions_touch_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.admissions_increment_profile_revision()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'admissions_profile_revision' and tgrelid = 'public.student_admissions_profiles'::regclass) then
    create trigger admissions_profile_revision before update on public.student_admissions_profiles for each row execute function public.admissions_increment_profile_revision();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'admissions_documents_updated_at' and tgrelid = 'public.student_admissions_documents'::regclass) then
    create trigger admissions_documents_updated_at before update on public.student_admissions_documents for each row execute function public.admissions_touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'admissions_draft_updated_at' and tgrelid = 'public.admissions_drafts'::regclass) then
    create trigger admissions_draft_updated_at before update on public.admissions_drafts for each row execute function public.admissions_touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'admissions_plan_updated_at' and tgrelid = 'public.admissions_college_plans'::regclass) then
    create trigger admissions_plan_updated_at before update on public.admissions_college_plans for each row execute function public.admissions_touch_updated_at();
  end if;
end $$;

alter table public.student_admissions_profiles enable row level security;
alter table public.student_admissions_documents enable row level security;
alter table public.admissions_drafts enable row level security;
alter table public.admissions_submissions enable row level security;
alter table public.admissions_college_plans enable row level security;

do $$
declare t text;
begin
  foreach t in array array['student_admissions_profiles', 'student_admissions_documents', 'admissions_drafts', 'admissions_college_plans'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'admissions_owner_access') then
      execute format('create policy admissions_owner_access on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    end if;
  end loop;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admissions_submissions' and policyname = 'admissions_owner_read_receipts') then
    create policy admissions_owner_read_receipts on public.admissions_submissions for select to authenticated using ((select auth.uid()) = user_id);
  end if;
end $$;

revoke all on public.student_admissions_profiles, public.student_admissions_documents, public.admissions_drafts, public.admissions_submissions, public.admissions_college_plans from public, anon;
grant select, insert, update, delete on public.student_admissions_profiles, public.student_admissions_documents, public.admissions_drafts, public.admissions_college_plans to authenticated;
revoke insert, update, delete on public.admissions_submissions from authenticated;
grant select on public.admissions_submissions to authenticated;
grant all on public.student_admissions_profiles, public.student_admissions_documents, public.admissions_drafts, public.admissions_submissions, public.admissions_college_plans to service_role;

-- Never reuse the legacy public student-documents bucket for admissions records.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('unidex-admissions-private', 'unidex-admissions-private', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

do $$ begin
  if exists (select 1 from storage.buckets where id = 'unidex-admissions-private' and public is distinct from false) then
    raise exception 'The admissions storage bucket already exists and is public. Stop setup and make that bucket private before proceeding.';
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'admissions_private_select') then
    create policy admissions_private_select on storage.objects for select to authenticated
      using (bucket_id = 'unidex-admissions-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'admissions_private_insert') then
    create policy admissions_private_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'unidex-admissions-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'admissions_private_delete') then
    create policy admissions_private_delete on storage.objects for delete to authenticated
      using (bucket_id = 'unidex-admissions-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  -- Restrictive guard also defeats preexisting broad permissive storage policies.
  -- All other buckets keep their current behavior.
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'admissions_private_boundary') then
    create policy admissions_private_boundary on storage.objects as restrictive for all to public
      using (bucket_id <> 'unidex-admissions-private' or ((select auth.uid()) is not null and (storage.foldername(name))[1] = (select auth.uid())::text))
      with check (bucket_id <> 'unidex-admissions-private' or ((select auth.uid()) is not null and (storage.foldername(name))[1] = (select auth.uid())::text));
  end if;
end $$;

-- Called only by the authenticated OCR edge function's server-side client.
-- The request log is inaccessible to browser clients, preventing rate-limit resets.
create or replace function public.claim_admissions_ocr(p_user_id uuid, p_document_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_document public.student_admissions_documents; v_request_id uuid := gen_random_uuid();
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select * into v_document from public.student_admissions_documents where id = p_document_id and user_id = p_user_id for update;
  if not found then return jsonb_build_object('claimed', false, 'reason', 'not_found'); end if;
  if exists (select 1 from public.admissions_ocr_requests where document_id = p_document_id and finished_at is null and started_at > now() - interval '2 minutes') then
    return jsonb_build_object('claimed', false, 'reason', 'in_progress');
  end if;
  if exists (select 1 from public.admissions_ocr_requests where document_id = p_document_id and started_at > now() - interval '15 seconds') then
    return jsonb_build_object('claimed', false, 'reason', 'cooldown');
  end if;
  if (select count(*) from public.admissions_ocr_requests where user_id = p_user_id and started_at > now() - interval '15 minutes') >= 20
     or (select count(*) from public.admissions_ocr_requests where user_id = p_user_id and started_at > now() - interval '24 hours') >= 60 then
    return jsonb_build_object('claimed', false, 'reason', 'rate_limit');
  end if;
  insert into public.admissions_ocr_requests(id, user_id, document_id) values (v_request_id, p_user_id, p_document_id);
  update public.student_admissions_documents set status = 'extracting', extraction_started_at = now(), extraction_error = null where id = p_document_id and user_id = p_user_id;
  return jsonb_build_object('claimed', true, 'request_id', v_request_id);
end;
$$;
revoke all on function public.claim_admissions_ocr(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_admissions_ocr(uuid, uuid) to service_role;

-- SECURITY DEFINER owns the immutable insert; identity always comes from auth.uid().
create or replace function public.submit_admissions_application(
  p_request_id uuid,
  p_profile jsonb,
  p_colleges jsonb,
  p_college_answers jsonb,
  p_consents jsonb,
  p_expected_user_id uuid
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_row public.admissions_submissions;
begin
  if v_user is null then raise exception 'Sign in to submit your application.' using errcode = '42501'; end if;
  if p_expected_user_id is distinct from v_user then raise exception 'Your account changed. Reload before submitting your application.' using errcode = '42501'; end if;
  if p_request_id is null then raise exception 'A submission request ID is required.' using errcode = '22023'; end if;
  if p_profile is null or jsonb_typeof(p_profile) <> 'object' or p_profile = '{}'::jsonb then
    raise exception 'Complete and review your common profile before submitting.' using errcode = '22023';
  end if;
  if octet_length(p_profile::text) + coalesce(octet_length(p_colleges::text), 0) + coalesce(octet_length(p_college_answers::text), 0) + coalesce(octet_length(p_consents::text), 0) > 1048576 then
    raise exception 'The combined application snapshot must be no larger than 1 MB.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_profile->>'full_name', ''))) < 2 or length(p_profile->>'full_name') > 160 then
    raise exception 'Add your full name before submitting.' using errcode = '22023';
  end if;
  if coalesce(p_profile->>'email', '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(p_profile->>'email') > 254 then
    raise exception 'Add a valid email address before submitting.' using errcode = '22023';
  end if;
  if coalesce(p_profile->>'phone', '') !~ '^\+?[0-9 ()-]{7,22}$' or length(regexp_replace(coalesce(p_profile->>'phone', ''), '[^0-9]', '', 'g')) not between 7 and 15 then
    raise exception 'Add a valid phone number before submitting.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_profile->>'current_city', ''))) < 1 or length(p_profile->>'current_city') > 160 then
    raise exception 'Add your current city before submitting.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_profile#>>'{academic_graduation,degree}', ''))) < 1 then
    raise exception 'Add your graduation degree before submitting.' using errcode = '22023';
  end if;
  if (coalesce(p_profile#>>'{academic_graduation,percentage}', '') !~ '^[0-9]+(\.[0-9]+)?$'
       or case when coalesce(p_profile#>>'{academic_graduation,percentage}', '') ~ '^[0-9]+(\.[0-9]+)?$' then (p_profile#>>'{academic_graduation,percentage}')::numeric not between 0 and 100 else true end)
    and (coalesce(p_profile#>>'{academic_graduation,cgpa}', '') !~ '^[0-9]+(\.[0-9]+)?$'
       or case when coalesce(p_profile#>>'{academic_graduation,cgpa}', '') ~ '^[0-9]+(\.[0-9]+)?$' then (p_profile#>>'{academic_graduation,cgpa}')::numeric not between 0 and 20 else true end) then
    raise exception 'Add your official graduation percentage or CGPA before submitting.' using errcode = '22023';
  end if;
  if p_profile ? 'document_references' then
    if jsonb_typeof(p_profile->'document_references') <> 'array' then
      raise exception 'Document references must be a list of your uploaded records.' using errcode = '22023';
    end if;
    if exists (select 1 from jsonb_array_elements(p_profile->'document_references') d where jsonb_typeof(d) <> 'object' or coalesce(d->>'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
      raise exception 'A document reference has an invalid ID.' using errcode = '22023';
    end if;
    if exists (select 1 from jsonb_array_elements(p_profile->'document_references') d where not exists (select 1 from public.student_admissions_documents owned where owned.id = (d->>'id')::uuid and owned.user_id = v_user)) then
      raise exception 'An attached document is not available in your account. Refresh your documents and retry.' using errcode = '42501';
    end if;
  end if;
  if p_colleges is null or jsonb_typeof(p_colleges) <> 'array' then raise exception 'Select at least one college.' using errcode = '22023'; end if;
  if jsonb_array_length(p_colleges) < 1 or jsonb_array_length(p_colleges) > 50 then raise exception 'Select between 1 and 50 colleges.' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_array_elements(p_colleges) c where jsonb_typeof(c) <> 'object' or coalesce(c->>'id', '') = '' or coalesce(c->>'name', '') = '') then
    raise exception 'Every selected college must have an ID and name.' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_array_elements(p_colleges)) <> (select count(distinct c->>'id') from jsonb_array_elements(p_colleges) c) then
    raise exception 'Remove duplicate colleges before submitting.' using errcode = '22023';
  end if;
  if p_college_answers is null or jsonb_typeof(p_college_answers) <> 'object' then raise exception 'College answers must be an object.' using errcode = '22023'; end if;
  if p_consents is null or jsonb_typeof(p_consents) <> 'object'
    or p_consents->'accuracy' is distinct from 'true'::jsonb
    or p_consents->'privacy' is distinct from 'true'::jsonb
    or p_consents->'internal_submission' is distinct from 'true'::jsonb then
    raise exception 'Confirm accuracy, privacy and internal submission consent before submitting.' using errcode = '22023';
  end if;

  insert into public.admissions_submissions(id, user_id, request_id, receipt, profile_snapshot, colleges_snapshot, college_answers_snapshot, consents)
  values (v_id, v_user, p_request_id, 'UDX-' || to_char(now() at time zone 'UTC', 'YYYYMMDD') || '-' || upper(replace(v_id::text, '-', '')), p_profile, p_colleges, p_college_answers, p_consents)
  on conflict (user_id, request_id) do nothing;
  select * into strict v_row from public.admissions_submissions where user_id = v_user and request_id = p_request_id;
  if v_row.profile_snapshot <> p_profile or v_row.colleges_snapshot <> p_colleges or v_row.college_answers_snapshot <> p_college_answers or v_row.consents <> p_consents then
    raise exception 'This request ID already belongs to a different submission.' using errcode = '22023';
  end if;
  insert into public.admissions_college_plans(user_id, college_id, college_snapshot, status, is_selected)
  select v_user, c->>'id', c, 'Submitted to Unidex', true from jsonb_array_elements(p_colleges) c
  on conflict (user_id, college_id) do update set
    college_snapshot = excluded.college_snapshot,
    status = case when admissions_college_plans.status in ('Researching', 'Submitted to Unidex') then 'Submitted to Unidex' else admissions_college_plans.status end;
  return to_jsonb(v_row) - 'user_id' || jsonb_build_object('college_count', jsonb_array_length(v_row.colleges_snapshot));
end;
$$;
revoke all on function public.submit_admissions_application(uuid, jsonb, jsonb, jsonb, jsonb, uuid) from public, anon;
grant execute on function public.submit_admissions_application(uuid, jsonb, jsonb, jsonb, jsonb, uuid) to authenticated;
