-- ============================================================
-- Migration 014 — Row Level Security (RLS) & Realtime Publication
-- ============================================================

-- ── 1. Enable RLS on all domain tables ───────────────────────────────────────
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salesmen            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs       ENABLE ROW LEVEL SECURITY;

-- ── 2. Grants for authenticated role ─────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salesmen            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_allocations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs       TO authenticated;

-- ── 3. Profiles Policies ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
  WITH CHECK (id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

-- ── 4. Salesmen Policies ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "salesmen_select" ON public.salesmen;
DROP POLICY IF EXISTS "salesmen_admin_all" ON public.salesmen;

CREATE POLICY "salesmen_select" ON public.salesmen
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

CREATE POLICY "salesmen_admin_all" ON public.salesmen
  FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- ── 5. Customers Policies ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "customers_select" ON public.customers;
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_update" ON public.customers;
DROP POLICY IF EXISTS "customers_delete" ON public.customers;

CREATE POLICY "customers_select" ON public.customers
  FOR SELECT TO authenticated
  USING (assigned_salesman_id = (SELECT public.my_salesman_id()) OR (SELECT public.is_admin()));

CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (assigned_salesman_id = (SELECT public.my_salesman_id()) OR (SELECT public.is_admin()));

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE TO authenticated
  USING (assigned_salesman_id = (SELECT public.my_salesman_id()) OR (SELECT public.is_admin()))
  WITH CHECK (assigned_salesman_id = (SELECT public.my_salesman_id()) OR (SELECT public.is_admin()));

CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

-- ── 6. Invoices Policies ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update" ON public.invoices;

CREATE POLICY "invoices_select" ON public.invoices
  FOR SELECT TO authenticated
  USING (salesman_id = (SELECT public.my_salesman_id()) OR (SELECT public.is_admin()));

CREATE POLICY "invoices_insert" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (salesman_id = (SELECT public.my_salesman_id()) OR (SELECT public.is_admin()));

CREATE POLICY "invoices_update" ON public.invoices
  FOR UPDATE TO authenticated
  USING (salesman_id = (SELECT public.my_salesman_id()) OR (SELECT public.is_admin()))
  WITH CHECK (salesman_id = (SELECT public.my_salesman_id()) OR (SELECT public.is_admin()));

-- ── 7. Invoice Items Policies ────────────────────────────────────────────────
DROP POLICY IF EXISTS "invoice_items_select" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_insert" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_update" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_delete" ON public.invoice_items;

CREATE POLICY "invoice_items_select" ON public.invoice_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_items.invoice_id
        AND (inv.salesman_id = (SELECT public.my_salesman_id()) OR (SELECT public.is_admin()))
    )
  );

CREATE POLICY "invoice_items_insert" ON public.invoice_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_items.invoice_id
        AND (inv.salesman_id = (SELECT public.my_salesman_id()) OR (SELECT public.is_admin()))
    )
  );

CREATE POLICY "invoice_items_update" ON public.invoice_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices inv
      WHERE inv.id = invoice_items.invoice_id
        AND (inv.salesman_id = (SELECT public.my_salesman_id()) OR (SELECT public.is_admin()))
    )
  );

CREATE POLICY "invoice_items_delete" ON public.invoice_items
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

-- ── 8. Payments Policies ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "payments_select" ON public.payments;
DROP POLICY IF EXISTS "payments_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_update" ON public.payments;

CREATE POLICY "payments_select" ON public.payments
  FOR SELECT TO authenticated
  USING (salesman_id = (SELECT public.my_salesman_id()) OR (SELECT public.is_admin()));

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (salesman_id = (SELECT public.my_salesman_id()) OR (SELECT public.is_admin()));

CREATE POLICY "payments_update" ON public.payments
  FOR UPDATE TO authenticated
  USING (salesman_id = (SELECT public.my_salesman_id()) OR (SELECT public.is_admin()))
  WITH CHECK (salesman_id = (SELECT public.my_salesman_id()) OR (SELECT public.is_admin()));

-- ── 9. Payment Allocations Policies ──────────────────────────────────────────
DROP POLICY IF EXISTS "payment_allocations_all" ON public.payment_allocations;

CREATE POLICY "payment_allocations_all" ON public.payment_allocations
  FOR ALL TO authenticated
  USING (
    (SELECT public.is_admin()) 
    OR EXISTS (
      SELECT 1 FROM public.payments p 
      WHERE p.id = payment_allocations.payment_id 
        AND p.salesman_id = (SELECT public.my_salesman_id())
    )
  )
  WITH CHECK (
    (SELECT public.is_admin()) 
    OR EXISTS (
      SELECT 1 FROM public.payments p 
      WHERE p.id = payment_allocations.payment_id 
        AND p.salesman_id = (SELECT public.my_salesman_id())
    )
  );

-- ── 10. Activity Logs Policies ───────────────────────────────────────────────
DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;

CREATE POLICY "activity_logs_select" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

CREATE POLICY "activity_logs_insert" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ── 11. Realtime Publication ─────────────────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices, public.payments, public.customers, public.activity_logs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
