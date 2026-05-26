-- 0017 · Optional seats_limit on update_organization_plan (Team per-seat mock / checkout)

drop function if exists public.update_organization_plan(uuid, text);

create or replace function public.update_organization_plan(
  p_organization_id uuid,
  p_plan_id text,
  p_seats_limit integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_plan_id text := lower(trim(p_plan_id));
  v_row public.organizations;
  v_seats_limit integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not private.is_org_admin(p_organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_plan_id not in ('free', 'pro', 'team') then
    raise exception 'invalid plan id' using errcode = '22023';
  end if;

  if p_seats_limit is not null then
    v_seats_limit := greatest(1, least(p_seats_limit, 50));
  else
    v_seats_limit := private.seat_limit_for_plan(v_plan_id);
  end if;

  update public.organizations o
     set plan_id = v_plan_id,
         seats_limit = v_seats_limit
   where o.id = p_organization_id
   returning * into v_row;

  if v_row.id is null then
    raise exception 'organization not found' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'plan_id', v_row.plan_id,
    'seats_limit', v_row.seats_limit,
    'seats_used', private.org_seats_used(p_organization_id)
  );
end;
$$;

revoke all on function public.update_organization_plan(uuid, text, integer) from public, anon;
grant execute on function public.update_organization_plan(uuid, text, integer) to authenticated;
