-- 0023 · Restrict list_organization_invoices to org admins (M3)
--
-- Previously any org member could list invoices.  Billing data should
-- only be visible to admins.

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

  if not private.is_org_admin(p_organization_id) then
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
