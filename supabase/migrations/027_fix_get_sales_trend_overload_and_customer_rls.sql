-- ============================================================
-- Migration 027 — Fix get_sales_trend overload and customer RLS
-- ============================================================

-- 1. Drop the duplicate get_sales_trend(date, date) overload
-- PostgREST cannot choose between (date, date) and (text, text) when string args are supplied
DROP FUNCTION IF EXISTS public.get_sales_trend(date, date);

-- 2. Ensure canonical get_sales_trend(text, text) is properly defined and granted
CREATE OR REPLACE FUNCTION public.get_sales_trend(p_start_date text, p_end_date text)
RETURNS TABLE (sale_date text, sales numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := public.is_admin();
  v_salesman_id uuid := public.my_salesman_id();
BEGIN
  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(p_start_date::date, p_end_date::date, '1 day'::interval)::date AS d
  )
  SELECT 
    to_char(dates.d, 'YYYY-MM-DD') AS sale_date,
    COALESCE(SUM(i.total_amount), 0) AS sales
  FROM dates
  LEFT JOIN public.invoices i 
    ON i.invoice_date::date = dates.d 
    AND (v_is_admin OR i.salesman_id = v_salesman_id)
    AND i.status != 'cancelled'
  GROUP BY dates.d
  ORDER BY dates.d;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sales_trend(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sales_trend(text, text) TO authenticated, service_role;

-- 3. Drop obsolete log_activity(uuid, text, text, uuid, text, jsonb) overload
DROP FUNCTION IF EXISTS public.log_activity(uuid, text, text, uuid, text, jsonb);

-- 4. Clean up rogue SaaS / multi-tenant functions
DROP FUNCTION IF EXISTS public.get_saas_dashboard_kpis(date, date);
DROP FUNCTION IF EXISTS public.get_saas_dashboard_kpis(date, date, uuid);
DROP FUNCTION IF EXISTS public.get_saas_sales_trend(date, date, text);
DROP FUNCTION IF EXISTS public.get_saas_sales_trend(date, date, text, uuid);
DROP FUNCTION IF EXISTS public.get_saas_outstanding_aging();
DROP FUNCTION IF EXISTS public.get_saas_outstanding_aging(uuid);
DROP FUNCTION IF EXISTS public.get_saas_top_customers(integer);
DROP FUNCTION IF EXISTS public.get_saas_top_customers(integer, uuid);
DROP FUNCTION IF EXISTS public.get_saas_salesman_performance();
DROP FUNCTION IF EXISTS public.get_saas_salesman_performance(uuid);
DROP FUNCTION IF EXISTS public.get_saas_recent_activity(integer);
DROP FUNCTION IF EXISTS public.get_saas_recent_activity(integer, uuid);

-- 5. Fix Customers RLS so salesmen can view and interact with unassigned / imported customers
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

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
