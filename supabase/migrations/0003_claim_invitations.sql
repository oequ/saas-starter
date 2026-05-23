-- 0003 · Claim pending invitations when a user registers (or on demand)

-- ---------------------------------------------------------------------------
-- Claim helper (security definer — reads auth.users by current uid)
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
  v_claimed integer;
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

  insert into public.organization_members (organization_id, user_id, role)
  select i.organization_id, v_uid, i.role
    from public.organization_invitations i
   where i.email = v_email
  on conflict do nothing;

  get diagnostics v_claimed = row_count;

  delete from public.organization_invitations i
   where i.email = v_email;

  return v_claimed;
end;
$$;

revoke all on function public.claim_my_invitations() from public, anon;
grant execute on function public.claim_my_invitations() to authenticated;

-- ---------------------------------------------------------------------------
-- Trigger: new auth.users row → claim invitations by email
-- ---------------------------------------------------------------------------

create or replace function public.handle_auth_user_claim_invitations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(new.email);
begin
  if v_email is null or v_email = '' then
    return new;
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  select i.organization_id, new.id, i.role
    from public.organization_invitations i
   where i.email = v_email
  on conflict do nothing;

  delete from public.organization_invitations i
   where i.email = v_email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_claim_invitations on auth.users;
create trigger on_auth_user_claim_invitations
  after insert on auth.users
  for each row
  execute function public.handle_auth_user_claim_invitations();

-- ---------------------------------------------------------------------------
-- Delete organization (owner only)
-- ---------------------------------------------------------------------------

grant delete on public.organizations to authenticated;

drop policy if exists "orgs_delete_owner" on public.organizations;
create policy "orgs_delete_owner"
  on public.organizations
  for delete
  to authenticated
  using (private.is_org_owner(id));
