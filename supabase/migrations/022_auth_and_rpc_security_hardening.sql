-- ============================================================
-- Migration 022 — Comprehensive Auth, RPC & RLS Security Hardening
-- ============================================================

-- ── 1. Fix get_dashboard_stats() Anonymous Access & Admin Evaluation ──────
-- Revoke anon access and enforce authenticated caller verification.
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
  v_uid uuid := auth.uid();
  v_is_admin boolean := (v_uid IS NOT NULL) AND public.is_admin();
  v_salesman_id uuid := public.my_salesman_id();
  v_today_date date := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  -- Unauthenticated callers receive zeroed metrics
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT 0::numeric, 0::numeric, 0::numeric, 0::bigint, 0::bigint, 0::numeric;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    -- 1. Today's Cash Sales
    COALESCE((
      SELECT SUM(d.debit)
      FROM public.day_book_entries d
      JOIN public.customers c ON c.id = d.customer_id
      WHERE (d.transaction_date = v_today_date OR d.transaction_date = CURRENT_DATE)
        AND (d.voucher_type = 'Sales' OR d.debit > 0)
        AND (c.name ILIKE '%CASH%' OR d.particulars ILIKE '%CASH%')
        AND (v_is_admin OR c.assigned_salesman_id = v_salesman_id OR c.assigned_salesman_id IS NULL)
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

    -- 2. Today's Collections
    COALESCE((
      SELECT SUM(p.amount)
      FROM public.payments p
      WHERE (p.payment_date::date = v_today_date OR p.payment_date::date = CURRENT_DATE)
        AND (v_is_admin OR p.salesman_id = v_salesman_id)
    ), 0) AS today_collections,

    -- 3. Total Outstanding
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
      WHERE (v_is_admin OR cust.assigned_salesman_id = v_salesman_id OR cust.assigned_salesman_id IS NULL)
        AND cust.is_active = true
        AND cust.name NOT ILIKE '%CASH%'
    ), 0) AS total_outstanding,

    0::bigint AS pending_invoices,

    -- 5. Total Customers
    COALESCE((
      SELECT COUNT(*) 
      FROM public.customers c 
      WHERE (v_is_admin OR c.assigned_salesman_id = v_salesman_id OR c.assigned_salesman_id IS NULL) 
        AND c.is_active = true
        AND c.name NOT ILIKE '%CASH%'
    ), 0) AS total_customers,

    0::numeric AS monthly_revenue;
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated, service_role;

-- ── 2. Scope get_customer_financial_summaries() by Salesman & Admin ──────
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
    AND (
      public.is_admin() 
      OR c.assigned_salesman_id = public.my_salesman_id() 
      OR c.assigned_salesman_id IS NULL
    )
  ORDER BY c.name ASC;
$$;

REVOKE ALL ON FUNCTION public.get_customer_financial_summaries(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_customer_financial_summaries(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_customer_financial_summaries(uuid) TO authenticated, service_role;

-- ── 3. Guard get_customer_ledger() Authorization ───────────────────────────
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_admin() 
    OR EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = p_customer_id 
        AND (c.assigned_salesman_id = public.my_salesman_id() OR c.assigned_salesman_id IS NULL)
    )
  ) THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to view ledger entries for this customer.';
  END IF;

  RETURN QUERY
  SELECT 
    d.id::text AS entry_id,
    'day_book'::text AS source,
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
    'invoice'::text AS source,
    i.invoice_date::date AS entry_date,
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
    'payment'::text AS source,
    p.payment_date::date AS entry_date,
    COALESCE(p.payment_number, p.reference_number, '—') AS voucher_no,
    COALESCE(p.notes, 'Payment Collection') AS particulars,
    0::numeric AS debit,
    p.amount AS credit,
    NULL::numeric AS balance,
    p.created_at
  FROM public.payments p
  WHERE p.customer_id = p_customer_id

  ORDER BY entry_date DESC, created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_ledger(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_customer_ledger(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_customer_ledger(uuid) TO authenticated, service_role;

-- ── 4. Harden log_activity() Against User Spoofing ─────────────────────────
CREATE OR REPLACE FUNCTION public.log_activity(
  p_action text,
  p_description text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_effective_user_id uuid;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated caller cannot log activity.';
  END IF;

  -- Only admins may specify a target user_id on behalf of another user
  IF public.is_admin() AND p_user_id IS NOT NULL THEN
    v_effective_user_id := p_user_id;
  ELSE
    v_effective_user_id := v_caller_id;
  END IF;

  INSERT INTO public.activity_logs (user_id, action, description, entity_type, entity_id, metadata)
  VALUES (
    v_effective_user_id,
    p_action,
    p_description,
    p_entity_type,
    p_entity_id,
    p_metadata
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_activity(text, text, text, uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_activity(text, text, text, uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_activity(text, text, text, uuid, uuid, jsonb) TO authenticated, service_role;

-- ── 5. Update Customers RLS for Unassigned/Imported Customers ─────────────
DROP POLICY IF EXISTS "customers_select" ON public.customers;
CREATE POLICY "customers_select" ON public.customers
  FOR SELECT TO authenticated
  USING (
    assigned_salesman_id = (SELECT public.my_salesman_id())
    OR assigned_salesman_id IS NULL
    OR (SELECT public.is_admin())
  );

DROP POLICY IF EXISTS "customers_insert" ON public.customers;
CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (
    assigned_salesman_id = (SELECT public.my_salesman_id())
    OR assigned_salesman_id IS NULL
    OR (SELECT public.is_admin())
  );

DROP POLICY IF EXISTS "customers_update" ON public.customers;
CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE TO authenticated
  USING (
    assigned_salesman_id = (SELECT public.my_salesman_id())
    OR assigned_salesman_id IS NULL
    OR (SELECT public.is_admin())
  )
  WITH CHECK (
    assigned_salesman_id = (SELECT public.my_salesman_id())
    OR assigned_salesman_id IS NULL
    OR (SELECT public.is_admin())
  );

-- ── 6. Profiles Policy & Role Protection Trigger ───────────────────────────
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.is_active IS DISTINCT FROM NEW.is_active) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Privilege escalation rejected: only administrators can change user roles or active status.';
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
  WITH CHECK (id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

-- ── 7. Reload PostgREST Schema Cache ───────────────────────────────────────
NOTIFY pgrst, 'reload schema';
