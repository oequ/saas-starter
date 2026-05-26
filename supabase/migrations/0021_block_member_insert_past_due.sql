-- 0021 · BEFORE INSERT trigger: block new members/invitations when past_due (M1)
--
-- The invite_organization_member RPC already checks billing status, but
-- direct INSERTs through RLS bypass that check.  This trigger enforces
-- the constraint at the database level for any insert path.

create or replace function private.block_insert_if_payment_past_due()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
      from public.organization_billing b
     where b.organization_id = NEW.organization_id
       and b.subscription_status in ('past_due', 'unpaid')
  ) then
    raise exception 'cannot add members while billing is past due'
      using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_block_member_insert_past_due on public.organization_members;
create trigger trg_block_member_insert_past_due
  before insert on public.organization_members
  for each row
  execute function private.block_insert_if_payment_past_due();

drop trigger if exists trg_block_invitation_insert_past_due on public.organization_invitations;
create trigger trg_block_invitation_insert_past_due
  before insert on public.organization_invitations
  for each row
  execute function private.block_insert_if_payment_past_due();
