-- ModeFlow regression fixes
-- Safe to run after 20260907_modeflow_production_hardening.sql.
-- Fixes first-workspace owner duplication and audit trigger compatibility.

create or replace function public.audit_business_change()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_business uuid;
  v_entity text;
  v_id text;
  v_row jsonb;
begin
  v_entity := TG_TABLE_NAME;

  if TG_OP = 'DELETE' then
    v_row := to_jsonb(OLD);
    v_business := coalesce(
      nullif(v_row->>'business_id','')::uuid,
      nullif(v_row->>'id','')::uuid
    );
    v_id := coalesce(v_row->>'id', v_row->>'user_id', '');

    insert into public.audit_logs(
      business_id,actor_user_id,action,entity_type,entity_id,old_data
    ) values (
      v_business,auth.uid(),lower(TG_OP),v_entity,v_id,v_row
    );
    return OLD;
  end if;

  v_row := to_jsonb(NEW);
  v_business := coalesce(
    nullif(v_row->>'business_id','')::uuid,
    nullif(v_row->>'id','')::uuid
  );
  v_id := coalesce(v_row->>'id', v_row->>'user_id', '');

  insert into public.audit_logs(
    business_id,actor_user_id,action,entity_type,entity_id,old_data,new_data
  ) values (
    v_business,
    auth.uid(),
    lower(TG_OP),
    v_entity,
    v_id,
    case when TG_OP='UPDATE' then to_jsonb(OLD) else null end,
    v_row
  );
  return NEW;
end;
$$;

create or replace function public.create_business_with_owner(
  p_name text,
  p_slug text default null,
  p_phone text default null,
  p_address text default null
)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_business uuid;
  v_slug text;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;
  if length(trim(coalesce(p_name,''))) < 2 or length(trim(p_name)) > 120 then
    raise exception 'Business name must be between 2 and 120 characters';
  end if;
  if (select count(*) from public.business_members where user_id=v_user) >= 20 then
    raise exception 'Workspace limit reached';
  end if;

  v_slug := coalesce(
    nullif(trim(p_slug),''),
    lower(regexp_replace(trim(p_name),'[^a-zA-Z0-9]+','-','g')) || '-' ||
    substr(replace(gen_random_uuid()::text,'-',''),1,6)
  );

  insert into public.businesses(name,slug,phone,address,created_by)
  values(
    trim(p_name),
    v_slug,
    nullif(trim(p_phone),''),
    nullif(trim(p_address),''),
    v_user
  ) returning id into v_business;

  -- The base schema trigger already creates the owner membership.
  -- Keep this fallback idempotent so a missing/disabled trigger still cannot
  -- leave a workspace without an owner or create a duplicate membership.
  insert into public.business_members(business_id,user_id,role)
  values(v_business,v_user,'owner')
  on conflict (business_id,user_id) do nothing;

  return v_business;
end;
$$;

revoke all on function public.create_business_with_owner(text,text,text,text) from public, anon;
grant execute on function public.create_business_with_owner(text,text,text,text) to authenticated;
revoke all on function public.audit_business_change() from public, anon;
