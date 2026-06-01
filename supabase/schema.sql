-- Unidex schema

create extension if not exists "uuid-ossp";

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table students (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid references auth.users(id) on delete cascade not null,
  name                 text not null,
  email                text unique not null,
  academic_background  jsonb default '{}',
  target_colleges      text[] default '{}',
  created_at           timestamptz default now()
);

create table colleges (
  id          uuid primary key default uuid_generate_v4(),
  name        text unique not null,
  type        text check (type in ('IIM', 'IIT', 'Private', 'Government')) not null,
  location    text,
  avg_fees    numeric,
  deadlines   jsonb default '[]',
  website_url text,
  created_at  timestamptz default now()
);

create table applications (
  id           uuid primary key default uuid_generate_v4(),
  student_id   uuid references students(id) on delete cascade not null,
  college_id   uuid references colleges(id) on delete cascade not null,
  status       text check (status in ('Researching', 'Applied', 'Interview', 'Offer', 'Rejected')) default 'Researching',
  notes        text,
  last_updated timestamptz default now()
);

create table deadlines (
  id         uuid primary key default uuid_generate_v4(),
  college_id uuid references colleges(id) on delete cascade not null,
  round      text check (round in ('R1', 'R2', 'Final')),
  date       date,
  type       text check (type in ('CAT', 'GMAT', 'GRE', 'SOP', 'Interview', 'Result'))
);

-- ─── Trigger: auto-update last_updated on applications ───────────────────────

create or replace function update_last_updated()
returns trigger as $$
begin
  new.last_updated = now();
  return new;
end;
$$ language plpgsql;

create trigger applications_last_updated
before update on applications
for each row execute function update_last_updated();

-- ─── RLS ──────────────────────────────────────────────────────────────────────

alter table students     enable row level security;
alter table colleges     enable row level security;
alter table applications enable row level security;
alter table deadlines    enable row level security;

-- students: own row only
create policy "students_own_row"
  on students for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- colleges: public read, no user writes
create policy "colleges_public_read"
  on colleges for select
  using (true);

-- applications: own applications only (via student ownership)
create policy "applications_own"
  on applications for all
  using (student_id in (select id from students where user_id = auth.uid()))
  with check (student_id in (select id from students where user_id = auth.uid()));

-- deadlines: public read
create policy "deadlines_public_read"
  on deadlines for select
  using (true);
