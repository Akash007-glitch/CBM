-- ============================================================
-- Migration 013 — Views, Functions, RPCs, and Automation Triggers
-- ============================================================

-- ── 1. Salesman ID helper for RLS policies ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.my_salesman_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.salesmen WHERE user_id = (SELECT auth.uid()) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_salesman_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_salesman_id() TO authenticated;

-- ── 2. Outstanding Invoices View ─────────────────────────────────────────────
CREATE OR REPLACE VIEW public.invoice_outstanding
WITH (security_invoker = true)
AS
SELECT 
  i.id AS invoice_id,
  i.invoice_number,
  i.customer_id,
  c.name AS customer_name,
  i.salesman_id,
  i.invoice_date,
  i.due_date,
  i.total_amount AS invoice_total,
  COALESCE(SUM(pa.allocated_amount), 0) AS paid_amount,
  (i.total_amount - COALESCE(SUM(pa.allocated_amount), 0)) AS outstanding_amount,
  i.status,
  CASE 
    WHEN i.due_date IS NOT NULL AND now() > i.due_date AND (i.total_amount - COALESCE(SUM(pa.allocated_amount), 0)) > 0
    THEN EXTRACT(DAY FROM now() - i.due_date)::integer
    ELSE 0
  END AS days_overdue
FROM public.invoices i
JOIN public.customers c ON c.id = i.customer_id
LEFT JOIN public.payment_allocations pa ON pa.invoice_id = i.id
WHERE i.status != 'cancelled'
GROUP BY i.id, i.invoice_number, i.customer_id, c.name, i.salesman_id, i.invoice_date, i.due_date, i.total_amount, i.status;

-- ── 3. Dashboard Stats RPC ───────────────────────────────────────────────────
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
  v_is_admin boolean := public.is_admin();
  v_salesman_id uuid := public.my_salesman_id();
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((
      SELECT SUM(i.total_amount)
      FROM public.invoices i
      WHERE i.invoice_date >= CURRENT_DATE
        AND i.status != 'cancelled'
        AND (v_is_admin OR i.salesman_id = v_salesman_id)
    ), 0) AS today_sales,
    COALESCE((
      SELECT SUM(p.amount)
      FROM public.payments p
      WHERE p.payment_date >= CURRENT_DATE
        AND (v_is_admin OR p.salesman_id = v_salesman_id)
    ), 0) AS today_collections,
    COALESCE((
      SELECT SUM(io.outstanding_amount) 
      FROM public.invoice_outstanding io 
      WHERE (v_is_admin OR io.salesman_id = v_salesman_id) 
        AND io.outstanding_amount > 0
    ), 0) AS total_outstanding,
    COALESCE((
      SELECT COUNT(*) 
      FROM public.invoices inv 
      WHERE (v_is_admin OR inv.salesman_id = v_salesman_id) 
        AND inv.status IN ('issued', 'partially_paid', 'overdue')
    ), 0) AS pending_invoices,
    COALESCE((
      SELECT COUNT(*) 
      FROM public.customers cust 
      WHERE (v_is_admin OR cust.assigned_salesman_id = v_salesman_id) 
        AND cust.is_active = true
    ), 0) AS total_customers,
    COALESCE((
      SELECT SUM(i.total_amount)
      FROM public.invoices i
      WHERE i.invoice_date >= date_trunc('month', CURRENT_DATE)
        AND i.status != 'cancelled'
        AND (v_is_admin OR i.salesman_id = v_salesman_id)
    ), 0) AS monthly_revenue;
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;

-- ── 4. Sales Trend RPC ───────────────────────────────────────────────────────
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
GRANT EXECUTE ON FUNCTION public.get_sales_trend(text, text) TO authenticated;

-- ── 5. Activity Feed RPC ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_activity_feed(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  action text,
  entity_type text,
  entity_id uuid,
  description text,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := public.is_admin();
BEGIN
  RETURN QUERY
  SELECT a.id, a.user_id, a.action, a.entity_type, a.entity_id, a.description, a.metadata, a.created_at
  FROM public.activity_logs a
  WHERE v_is_admin OR a.user_id = (SELECT auth.uid())
  ORDER BY a.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_activity_feed(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_activity_feed(integer, integer) TO authenticated;

-- ── 6. Log Activity Helper ───────────────────────────────────────────────────
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
BEGIN
  INSERT INTO public.activity_logs (user_id, action, description, entity_type, entity_id, metadata)
  VALUES (
    COALESCE(p_user_id, (SELECT auth.uid())),
    p_action,
    p_description,
    p_entity_type,
    p_entity_id,
    p_metadata
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_activity(text, text, text, uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_activity(text, text, text, uuid, uuid, jsonb) TO authenticated;

-- ── 7. Recalculate Invoice Status Trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recalculate_invoice_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);
  v_total numeric;
  v_paid numeric;
BEGIN
  SELECT total_amount INTO v_total FROM public.invoices WHERE id = v_invoice_id;
  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_paid FROM public.payment_allocations WHERE invoice_id = v_invoice_id;

  IF v_total IS NOT NULL THEN
    IF v_paid >= v_total THEN
      UPDATE public.invoices SET status = 'paid', updated_at = now() WHERE id = v_invoice_id;
    ELSIF v_paid > 0 THEN
      UPDATE public.invoices SET status = 'partially_paid', updated_at = now() WHERE id = v_invoice_id;
    ELSE
      UPDATE public.invoices SET status = 'issued', updated_at = now() WHERE id = v_invoice_id AND status != 'cancelled';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_invoice_status ON public.payment_allocations;
CREATE TRIGGER trg_recalculate_invoice_status
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_invoice_status();
