-- 0007 · Seat limits (active members + pending invitations) per organization

alter table public.organizations
  add column if not exists seats_limit integer not null default 3
  check (seats_limit > 0);

comment on column public.organizations.seats_limit is
  'Max seats (organization_members + organization_invitations) for this workspace.';

-- ---------------------------------------------------------------------------
-- Seat helpers (security definer — bypass RLS for accurate counts)
-- ---------------------------------------------------------------------------

create or replace function private.org_seats_used(p_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select (
    (select count(*)::integer
       from public.organization_members m
      where m.organization_id = p_organization_id)
    +
    (select count(*)::integer
       from public.organization_invitations i
      where i.organization_id = p_organization_id)
  );
$$;

create or replace function private.assert_org_seat_available(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_limit integer;
  v_used integer;
begin
  select o.seats_limit
    into v_limit
    from public.organizations o
   where o.id = p_organization_id;

  if v_limit is null then
    raise exception 'organization not found' using errcode = '22023';
  end if;

  v_used := private.org_seats_used(p_organization_id);

  if v_used >= v_limit then
    raise exception 'seats exhausted' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- BEFORE INSERT triggers (defense in depth for direct INSERT via RLS)
-- ---------------------------------------------------------------------------

create or replace function public.enforce_org_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  perform private.assert_org_seat_available(
    case TG_TABLE_NAME
      when 'organization_members' then new.organization_id
      when 'organization_invitations' then new.organization_id
    end
  );
  return new;
end;
$$;

drop trigger if exists organization_members_seat_limit on public.organization_members;
create trigger organization_members_seat_limit
  before insert on public.organization_members
  for each row
  execute function public.enforce_org_seat_limit();

drop trigger if exists organization_invitations_seat_limit on public.organization_invitations;
create trigger organization_invitations_seat_limit
  before insert on public.organization_invitations
  for each row
  execute function public.enforce_org_seat_limit();

-- ---------------------------------------------------------------------------
-- RPC: invite (with seat check)
-- ---------------------------------------------------------------------------

create or replace function public.invite_organization_member(
  p_organization_id uuid,
  p_email text,
  p_role text default 'member'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(p_email));
  v_role text := lower(trim(p_role));
  v_inviter uuid := auth.uid();
  v_user_id uuid;
  v_member public.organization_members;
begin
  if v_inviter is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not private.is_org_admin(p_organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_email !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'invalid invite email' using errcode = '22023';
  end if;

  if v_role not in ('admin', 'member') then
    raise exception 'invalid member role' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.organization_invitations i
     where i.organization_id = p_organization_id and i.email = v_email
  ) then
    raise exception 'invite conflict' using errcode = '23505';
  end if;

  select u.id into v_user_id
    from auth.users u
   where lower(u.email) = v_email
   limit 1;

  if v_user_id is not null then
    if exists (
      select 1 from public.organization_members m
       where m.organization_id = p_organization_id and m.user_id = v_user_id
    ) then
      raise exception 'invite conflict' using errcode = '23505';
    end if;

    perform private.assert_org_seat_available(p_organization_id);

    insert into public.organization_members (organization_id, user_id, role)
    values (p_organization_id, v_user_id, v_role)
    returning * into v_member;

    return jsonb_build_object(
      'kind', 'member',
      'organization_id', v_member.organization_id,
      'user_id', v_member.user_id,
      'role', v_member.role,
      'email', v_email,
      'status', 'active'
    );
  end if;

  perform private.assert_org_seat_available(p_organization_id);

  insert into public.organization_invitations (organization_id, email, role, invited_by)
  values (p_organization_id, v_email, v_role, v_inviter);

  return jsonb_build_object(
    'kind', 'invitation',
    'organization_id', p_organization_id,
    'email', v_email,
    'role', v_role,
    'status', 'invited'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Claim invitations (per-row seat check; skip orgs at capacity)
-- ---------------------------------------------------------------------------

create or replace function public.claim_my_invitations()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_claimed integer := 0;
  v_invite record;
begin
  if v_uid is null then
    return 0;
  end if;

  select lower(u.email)
    into v_email
    from auth.users u
   where u.id = v_uid;

  if v_email is null or v_email = '' then
    return 0;
  end if;

  for v_invite in
    select i.organization_id, i.role, i.invited_by
      from public.organization_invitations i
     where i.email = v_email
  loop
    begin
      delete from public.organization_invitations i
       where i.organization_id = v_invite.organization_id
         and i.email = v_email;

      if exists (
        select 1 from public.organization_members m
         where m.organization_id = v_invite.organization_id
           and m.user_id = v_uid
      ) then
        continue;
      end if;

      perform private.assert_org_seat_available(v_invite.organization_id);

      insert into public.organization_members (organization_id, user_id, role)
      values (v_invite.organization_id, v_uid, v_invite.role);

      v_claimed := v_claimed + 1;
    exception
      when sqlstate 'P0001' then
        insert into public.organization_invitations (organization_id, email, role, invited_by)
        values (v_invite.organization_id, v_email, v_invite.role, v_invite.invited_by)
        on conflict do nothing;
        continue;
    end;
  end loop;

  return v_claimed;
end;
$$;

create or replace function public.handle_auth_user_claim_invitations()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(new.email);
  v_invite record;
begin
  if v_email is null or v_email = '' then
    return new;
  end if;

  for v_invite in
    select i.organization_id, i.role, i.invited_by
      from public.organization_invitations i
     where i.email = v_email
  loop
    begin
      delete from public.organization_invitations i
       where i.organization_id = v_invite.organization_id
         and i.email = v_email;

      if exists (
        select 1 from public.organization_members m
         where m.organization_id = v_invite.organization_id
           and m.user_id = new.id
      ) then
        continue;
      end if;

      perform private.assert_org_seat_available(v_invite.organization_id);

      insert into public.organization_members (organization_id, user_id, role)
      values (v_invite.organization_id, new.id, v_invite.role);
    exception
      when sqlstate 'P0001' then
        insert into public.organization_invitations (organization_id, email, role, invited_by)
        values (v_invite.organization_id, v_email, v_invite.role, v_invite.invited_by)
        on conflict do nothing;
        continue;
    end;
  end loop;

  return new;
end;
$$;
