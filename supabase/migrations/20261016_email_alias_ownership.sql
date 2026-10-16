-- Scoped ownership fix for the existing alias helper. Existing aliases and the
-- alias-generation/idempotency behavior are preserved. No data is migrated.
-- Dependency review: no catalog dependencies, routine callers or trigger callers
-- were found; repository frontend/extension do not invoke this helper.
create or replace function public.create_email_alias(p_student_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text; v_first text; v_last text; v_alias text;
begin
  -- SECURITY DEFINER makes current_user the function owner, so it cannot identify
  -- the caller. The signed JWT role allows trusted server provisioning only;
  -- all ordinary authenticated callers must own the referenced student record.
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    if auth.uid() is null or not exists (
      select 1 from public.students
      where id = p_student_id and user_id = auth.uid()
    ) then
      raise exception 'You may only manage your own admissions email alias.'
        using errcode = '42501';
    end if;
  end if;

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

-- PUBLIC's default EXECUTE grant must also be removed; revoking only anon would
-- leave inherited execution available. Existing owner/server privileges remain.
revoke execute on function public.create_email_alias(uuid) from public, anon;
grant execute on function public.create_email_alias(uuid) to authenticated, service_role;
