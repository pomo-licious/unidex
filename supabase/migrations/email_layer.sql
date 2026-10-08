-- ─────────────────────────────────────────────────────────────────────────────
-- Email layer foundation (concierge): per-student inbound aliases + email capture.
-- Foundation only — no sending/forwarding, no legal text.
-- ─────────────────────────────────────────────────────────────────────────────

-- colleges.domain — used to match an inbound sender's domain to a college.
alter table public.colleges add column if not exists domain text;

-- Best-effort backfill from website_url (host, minus scheme / www / path), so
-- sender-domain matching has something to match against. Null stays null.
update public.colleges
set domain = lower(regexp_replace(website_url, '^https?://(www\.)?([^/]+).*$', '\2'))
where domain is null and website_url ~ '^https?://';

-- ── email_aliases ────────────────────────────────────────────────────────────
create table if not exists public.email_aliases (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  alias       text not null unique,          -- name@apply.unidex.co.in
  created_at  timestamptz not null default now(),
  active      boolean not null default true
);

-- ── inbound_emails ───────────────────────────────────────────────────────────
create table if not exists public.inbound_emails (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.students(id) on delete cascade,
  alias              text,
  from_address       text,
  subject            text,
  body_text          text,
  body_html          text,
  received_at        timestamptz,
  parsed_status      text,                    -- verification | acknowledgement | interview_call | rejection | offer | other
  matched_college_id uuid references public.colleges(id) on delete set null,
  forwarded_at       timestamptz,
  raw                jsonb
);

create index if not exists idx_email_aliases_alias     on public.email_aliases (alias);
create index if not exists idx_inbound_emails_student   on public.inbound_emails (student_id);
create index if not exists idx_inbound_emails_received  on public.inbound_emails (received_at desc);

-- ── RLS: students read their own only; no client writes (edge fn = service role) ──
alter table public.email_aliases  enable row level security;
alter table public.inbound_emails enable row level security;

drop policy if exists "students read own aliases" on public.email_aliases;
create policy "students read own aliases" on public.email_aliases
for select to authenticated
using (student_id in (select id from public.students where user_id = auth.uid()));

drop policy if exists "students read own inbound emails" on public.inbound_emails;
create policy "students read own inbound emails" on public.inbound_emails
for select to authenticated
using (student_id in (select id from public.students where user_id = auth.uid()));

-- Grants: the edge function (service_role) reads/writes; authenticated students
-- read their own via the RLS policies above. (Newly-created tables don't inherit
-- these automatically here.)
grant select, insert, update, delete on public.email_aliases  to service_role;
grant select, insert, update, delete on public.inbound_emails to service_role;
grant select on public.email_aliases  to authenticated;
grant select on public.inbound_emails to authenticated;

-- ── Helper: create (or return existing) an email alias for a student ─────────
-- firstname.lastname.<short random> @apply.unidex.co.in. Idempotent: returns the
-- student's existing active alias instead of minting a second one.
create or replace function public.create_email_alias(p_student_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text; v_first text; v_last text; v_alias text;
begin
  select alias into v_alias from public.email_aliases
    where student_id = p_student_id and active = true
    order by created_at limit 1;
  if v_alias is not null then return v_alias; end if;

  select name into v_name from public.students where id = p_student_id;
  if v_name is null then raise exception 'student % not found', p_student_id; end if;

  v_first := lower(regexp_replace(split_part(v_name, ' ', 1), '[^a-zA-Z0-9]', '', 'g'));
  v_last  := lower(regexp_replace(split_part(v_name, ' ', 2), '[^a-zA-Z0-9]', '', 'g'));
  if v_first = '' then v_first := 'student'; end if;
  if v_last  = '' then v_last  := 'user'; end if;

  v_alias := v_first || '.' || v_last || '.' || substr(md5(random()::text), 1, 6) || '@apply.unidex.co.in';
  insert into public.email_aliases (student_id, alias) values (p_student_id, v_alias);
  return v_alias;
end;
$$;
