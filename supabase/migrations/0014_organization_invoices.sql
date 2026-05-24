-- 0014 · Provider-agnostic invoice mirror (custom / YooKassa; Stripe uses live API in Edge Function)

create table public.organization_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null,
  external_invoice_id text not null,
  invoice_number text not null default '',
  amount_due bigint not null default 0,
  amount_paid bigint not null default 0,
  currency text not null default 'usd',
  status text not null,
  invoice_created_at timestamptz not null,
  hosted_url text not null default '',
  invoice_pdf text not null default '',
  created_at timestamptz not null default now(),
  constraint organization_invoices_provider_external_unique
    unique (provider, external_invoice_id)
);

create index organization_invoices_org_created_idx
  on public.organization_invoices (organization_id, invoice_created_at desc);

alter table public.organization_invoices enable row level security;

grant select on public.organization_invoices to authenticated;

drop policy if exists "org_invoices_select_member" on public.organization_invoices;
create policy "org_invoices_select_member"
  on public.organization_invoices
  for select
  to authenticated
  using (private.is_org_member(organization_id));

create or replace function public.upsert_organization_invoice(
  p_organization_id uuid,
  p_provider text,
  p_external_invoice_id text,
  p_invoice_number text,
  p_amount_due bigint,
  p_amount_paid bigint,
  p_currency text,
  p_status text,
  p_invoice_created_at timestamptz,
  p_hosted_url text default '',
  p_invoice_pdf text default ''
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_provider text := lower(trim(p_provider));
  v_status text := lower(trim(p_status));
begin
  if v_provider = '' or trim(p_external_invoice_id) = '' then
    raise exception 'provider and external_invoice_id required' using errcode = '22023';
  end if;

  if v_status not in ('draft', 'open', 'paid', 'uncollectible', 'void') then
    raise exception 'invalid invoice status' using errcode = '22023';
  end if;

  insert into public.organization_invoices (
    organization_id,
    provider,
    external_invoice_id,
    invoice_number,
    amount_due,
    amount_paid,
    currency,
    status,
    invoice_created_at,
    hosted_url,
    invoice_pdf
  )
  values (
    p_organization_id,
    v_provider,
    trim(p_external_invoice_id),
    coalesce(trim(p_invoice_number), ''),
    coalesce(p_amount_due, 0),
    coalesce(p_amount_paid, 0),
    lower(coalesce(trim(p_currency), 'usd')),
    v_status,
    p_invoice_created_at,
    coalesce(trim(p_hosted_url), ''),
    coalesce(trim(p_invoice_pdf), '')
  )
  on conflict (provider, external_invoice_id) do update
    set organization_id = excluded.organization_id,
        invoice_number = excluded.invoice_number,
        amount_due = excluded.amount_due,
        amount_paid = excluded.amount_paid,
        currency = excluded.currency,
        status = excluded.status,
        invoice_created_at = excluded.invoice_created_at,
        hosted_url = excluded.hosted_url,
        invoice_pdf = excluded.invoice_pdf;
end;
$$;

create or replace function public.list_organization_invoices(
  p_organization_id uuid,
  p_limit integer default 24,
  p_cursor text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 24), 100));
  v_cursor_created timestamptz;
  v_cursor_id uuid;
  v_rows public.organization_invoices[];
  v_items jsonb := '[]'::jsonb;
  v_row public.organization_invoices;
  v_next_cursor text := null;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if not private.is_org_member(p_organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_cursor is not null and trim(p_cursor) <> '' then
    select i.invoice_created_at, i.id
      into v_cursor_created, v_cursor_id
      from public.organization_invoices i
     where i.organization_id = p_organization_id
       and i.id = trim(p_cursor)::uuid
     limit 1;
  end if;

  select array_agg(i order by i.invoice_created_at desc, i.id desc)
    into v_rows
    from (
      select *
        from public.organization_invoices i
       where i.organization_id = p_organization_id
         and (
           v_cursor_id is null
           or (i.invoice_created_at, i.id) < (v_cursor_created, v_cursor_id)
         )
       order by i.invoice_created_at desc, i.id desc
       limit v_limit + 1
    ) i;

  if v_rows is null then
    return jsonb_build_object('items', '[]'::jsonb, 'nextCursor', null);
  end if;

  if array_length(v_rows, 1) > v_limit then
    v_rows := v_rows[1:v_limit];
    v_next_cursor := v_rows[array_length(v_rows, 1)].id::text;
  end if;

  foreach v_row in array v_rows loop
    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'id', v_row.id::text,
        'number', v_row.invoice_number,
        'amountDue', v_row.amount_due,
        'amountPaid', v_row.amount_paid,
        'currency', v_row.currency,
        'status', v_row.status,
        'created', v_row.invoice_created_at,
        'hostedInvoiceUrl', v_row.hosted_url,
        'invoicePdf', v_row.invoice_pdf
      )
    );
  end loop;

  return jsonb_build_object(
    'items', v_items,
    'nextCursor', v_next_cursor
  );
end;
$$;

revoke all on function public.upsert_organization_invoice(
  uuid, text, text, text, bigint, bigint, text, text, timestamptz, text, text
) from public, anon, authenticated;

revoke all on function public.list_organization_invoices(uuid, integer, text)
  from public, anon, authenticated;

grant execute on function public.upsert_organization_invoice(
  uuid, text, text, text, bigint, bigint, text, text, timestamptz, text, text
) to service_role;

grant execute on function public.list_organization_invoices(uuid, integer, text)
  to authenticated, service_role;
