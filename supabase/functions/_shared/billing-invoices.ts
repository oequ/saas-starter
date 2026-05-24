import type Stripe from 'npm:stripe@17.7.0';

export type InvoiceStatusDto =
  | 'draft'
  | 'open'
  | 'paid'
  | 'uncollectible'
  | 'void';

export interface InvoiceDto {
  id: string;
  number: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: InvoiceStatusDto;
  created: string;
  hostedInvoiceUrl: string;
  invoicePdf: string;
}

export interface InvoiceListPageDto {
  items: InvoiceDto[];
  nextCursor: string | null;
}

export function mapStripeInvoiceStatus(
  status: Stripe.Invoice.Status | null,
): InvoiceStatusDto {
  switch (status) {
    case 'draft':
      return 'draft';
    case 'open':
      return 'open';
    case 'paid':
      return 'paid';
    case 'uncollectible':
      return 'uncollectible';
    case 'void':
      return 'void';
    default:
      return 'open';
  }
}

export function mapStripeInvoice(invoice: Stripe.Invoice): InvoiceDto {
  const pdf =
    typeof invoice.invoice_pdf === 'string' ? invoice.invoice_pdf : '';
  const hosted =
    typeof invoice.hosted_invoice_url === 'string'
      ? invoice.hosted_invoice_url
      : pdf;

  return {
    id: invoice.id,
    number: invoice.number ?? invoice.id,
    amountDue: invoice.amount_due ?? 0,
    amountPaid: invoice.amount_paid ?? 0,
    currency: (invoice.currency ?? 'usd').toLowerCase(),
    status: mapStripeInvoiceStatus(invoice.status),
    created: new Date((invoice.created ?? 0) * 1000).toISOString(),
    hostedInvoiceUrl: hosted,
    invoicePdf: pdf || hosted,
  };
}

export function mapDbInvoiceRow(row: {
  id: string;
  number: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  created: string;
  hostedInvoiceUrl: string;
  invoicePdf: string;
}): InvoiceDto {
  const status = row.status as InvoiceStatusDto;
  const normalized: InvoiceStatusDto =
    status === 'draft' ||
    status === 'open' ||
    status === 'paid' ||
    status === 'uncollectible' ||
    status === 'void'
      ? status
      : 'open';

  return {
    id: row.id,
    number: row.number,
    amountDue: row.amountDue,
    amountPaid: row.amountPaid,
    currency: row.currency,
    status: normalized,
    created: row.created,
    hostedInvoiceUrl: row.hostedInvoiceUrl,
    invoicePdf: row.invoicePdf || row.hostedInvoiceUrl,
  };
}

export function parseInvoiceListRpc(data: unknown): InvoiceListPageDto {
  const payload = data as {
    items?: unknown;
    nextCursor?: string | null;
  };

  const items = Array.isArray(payload?.items)
    ? payload.items.map((item) => mapDbInvoiceRow(item as InvoiceDto))
    : [];

  return {
    items,
    nextCursor: payload?.nextCursor ?? null,
  };
}
