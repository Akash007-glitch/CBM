-- ============================================================
-- Migration 021 — Dashboard Stats Cash Sales & Party Debit Balance
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE (
  today_sales numeric,
  today_collections numeric,
  total_outstanding numeric,
  pending_invoices bigint,
  total_customers bigint,
  monthly_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := (auth.uid() IS NULL) OR public.is_admin();
  v_salesman_id uuid := public.my_salesman_id();
  v_today_date date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  RETURN QUERY
  SELECT
    -- 1. Today's Cash Sales (Live daily cash sales from daybook & invoices)
    COALESCE((
      SELECT SUM(d.debit)
      FROM public.day_book_entries d
      JOIN public.customers c ON c.id = d.customer_id
      WHERE (d.transaction_date = v_today_date OR d.transaction_date = CURRENT_DATE)
        AND (d.voucher_type = 'Sales' OR d.debit > 0)
        AND (c.name ILIKE '%CASH%' OR d.particulars ILIKE '%CASH%')
        AND (v_is_admin OR c.assigned_salesman_id = v_salesman_id)
    ), 0)
    +
    COALESCE((
      SELECT SUM(i.total_amount)
      FROM public.invoices i
      JOIN public.customers c ON c.id = i.customer_id
      WHERE (i.invoice_date::date = v_today_date OR i.invoice_date::date = CURRENT_DATE)
        AND i.status != 'cancelled'
        AND (c.name ILIKE '%CASH%' OR i.notes ILIKE '%cash%')
        AND (v_is_admin OR i.salesman_id = v_salesman_id)
    ), 0) AS today_sales,

    -- 2. Today's Collections (Payments received today)
    COALESCE((
      SELECT SUM(p.amount)
      FROM public.payments p
      WHERE (p.payment_date::date = v_today_date OR p.payment_date::date = CURRENT_DATE)
        AND (v_is_admin OR p.salesman_id = v_salesman_id)
    ), 0) AS today_collections,

    -- 3. Total Outstanding: Total Debit Balance of the Parties (Debtors)
    COALESCE((
      SELECT SUM(
        CASE 
          WHEN (COALESCE(cust.opening_balance, 0) + COALESCE(db.total_debit, 0) + COALESCE(inv.total_inv, 0) - COALESCE(db.total_credit, 0) - COALESCE(pmt.total_pmt, 0)) > 0 
          THEN (COALESCE(cust.opening_balance, 0) + COALESCE(db.total_debit, 0) + COALESCE(inv.total_inv, 0) - COALESCE(db.total_credit, 0) - COALESCE(pmt.total_pmt, 0))
          ELSE 0 
        END
      )
      FROM public.customers cust
      LEFT JOIN (
        SELECT customer_id, SUM(debit) AS total_debit, SUM(credit) AS total_credit
        FROM public.day_book_entries
        GROUP BY customer_id
      ) db ON db.customer_id = cust.id
      LEFT JOIN (
        SELECT customer_id, SUM(total_amount) AS total_inv
        FROM public.invoices
        WHERE status != 'cancelled'
        GROUP BY customer_id
      ) inv ON inv.customer_id = cust.id
      LEFT JOIN (
        SELECT customer_id, SUM(amount) AS total_pmt
        FROM public.payments
        GROUP BY customer_id
      ) pmt ON pmt.customer_id = cust.id
      WHERE (v_is_admin OR cust.assigned_salesman_id = v_salesman_id)
        AND cust.is_active = true
        AND cust.name NOT ILIKE '%CASH%'
    ), 0) AS total_outstanding,

    -- 4. Pending Invoices (Legacy field, kept for signature compatibility)
    0::bigint AS pending_invoices,

    -- 5. Total Customers (Active debtor parties)
    COALESCE((
      SELECT COUNT(*) 
      FROM public.customers c 
      WHERE (v_is_admin OR c.assigned_salesman_id = v_salesman_id) 
        AND c.is_active = true
        AND c.name NOT ILIKE '%CASH%'
    ), 0) AS total_customers,

    -- 6. Monthly Revenue (Legacy field, kept for signature compatibility)
    0::numeric AS monthly_revenue;
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated, service_role, anon;
NOTIFY pgrst, 'reload schema';
