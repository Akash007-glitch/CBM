-- ============================================================
-- Migration 019 — Customer Financial Summaries & Ledger RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_customer_financial_summaries(p_customer_id uuid DEFAULT NULL)
RETURNS TABLE (
  customer_id uuid,
  customer_name text,
  customer_code text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  pincode text,
  gstin text,
  is_active boolean,
  credit_limit numeric,
  opening_balance numeric,
  daybook_debit numeric,
  daybook_credit numeric,
  invoice_debit numeric,
  payment_credit numeric,
  total_debit numeric,
  total_credit numeric,
  total_balance numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id AS customer_id,
    c.name AS customer_name,
    c.customer_code,
    c.phone,
    c.email,
    c.address,
    c.city,
    c.state,
    c.pincode,
    c.gstin,
    c.is_active,
    COALESCE(c.credit_limit, 0) AS credit_limit,
    COALESCE(c.opening_balance, 0) AS opening_balance,
    COALESCE(db.total_debit, 0) AS daybook_debit,
    COALESCE(db.total_credit, 0) AS daybook_credit,
    COALESCE(inv.total_inv, 0) AS invoice_debit,
    COALESCE(pmt.total_pmt, 0) AS payment_credit,
    (COALESCE(db.total_debit, 0) + COALESCE(inv.total_inv, 0)) AS total_debit,
    (COALESCE(db.total_credit, 0) + COALESCE(pmt.total_pmt, 0)) AS total_credit,
    (COALESCE(c.opening_balance, 0) + COALESCE(db.total_debit, 0) + COALESCE(inv.total_inv, 0) - COALESCE(db.total_credit, 0) - COALESCE(pmt.total_pmt, 0)) AS total_balance
  FROM public.customers c
  LEFT JOIN (
    SELECT customer_id, SUM(debit) AS total_debit, SUM(credit) AS total_credit
    FROM public.day_book_entries
    GROUP BY customer_id
  ) db ON db.customer_id = c.id
  LEFT JOIN (
    SELECT customer_id, SUM(total_amount) AS total_inv
    FROM public.invoices
    WHERE status != 'cancelled'
    GROUP BY customer_id
  ) inv ON inv.customer_id = c.id
  LEFT JOIN (
    SELECT customer_id, SUM(amount) AS total_pmt
    FROM public.payments
    GROUP BY customer_id
  ) pmt ON pmt.customer_id = c.id
  WHERE (p_customer_id IS NULL OR c.id = p_customer_id)
  ORDER BY c.name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_customer_financial_summaries(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_financial_summaries(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_customer_ledger(p_customer_id uuid)
RETURNS TABLE (
  entry_id text,
  source text,
  entry_date date,
  voucher_no text,
  particulars text,
  debit numeric,
  credit numeric,
  balance numeric,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.id::text AS entry_id,
    'day_book' AS source,
    d.transaction_date AS entry_date,
    COALESCE(d.voucher_ref, '—') AS voucher_no,
    COALESCE(d.particulars, 'Day Book Entry') AS particulars,
    d.debit,
    d.credit,
    d.balance,
    d.created_at
  FROM public.day_book_entries d
  WHERE d.customer_id = p_customer_id

  UNION ALL

  SELECT 
    i.id::text AS entry_id,
    'invoice' AS source,
    i.invoice_date AS entry_date,
    i.invoice_number AS voucher_no,
    'Invoice Issued' AS particulars,
    i.total_amount AS debit,
    0::numeric AS credit,
    NULL::numeric AS balance,
    i.created_at
  FROM public.invoices i
  WHERE i.customer_id = p_customer_id AND i.status != 'cancelled'

  UNION ALL

  SELECT 
    p.id::text AS entry_id,
    'payment' AS source,
    p.payment_date AS entry_date,
    COALESCE(p.payment_number, p.reference_number, '—') AS voucher_no,
    COALESCE(p.notes, 'Payment Collection') AS particulars,
    0::numeric AS debit,
    p.amount AS credit,
    NULL::numeric AS balance,
    p.created_at
  FROM public.payments p
  WHERE p.customer_id = p_customer_id

  ORDER BY entry_date DESC, created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_customer_ledger(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_customer_ledger(uuid) TO authenticated, service_role;
