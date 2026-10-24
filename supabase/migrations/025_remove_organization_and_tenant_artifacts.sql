-- ============================================================
-- Migration 025 — Remove All Organization & Tenant Artifacts
-- ============================================================
-- This project does not use multi-tenancy or organizations.
-- This script completely cleans up orphaned organization_id columns,
-- removes invalid tenant policies, and restores standard CBM policies.
--
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── 1. Drop all tenant RLS policies ─────────────────────────
DROP POLICY IF EXISTS "invoices_tenant_delete" ON public.invoices;
DROP POLICY IF EXISTS "invoices_tenant_select" ON public.invoices;
DROP POLICY IF EXISTS "invoices_tenant_insert" ON public.invoices;
DROP POLICY IF EXISTS "invoices_tenant_update" ON public.invoices;

DROP POLICY IF EXISTS "invoice_items_tenant_select" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_tenant_insert" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_tenant_update" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_tenant_delete" ON public.invoice_items;

DROP POLICY IF EXISTS "payments_tenant_select" ON public.payments;
DROP POLICY IF EXISTS "payments_tenant_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_tenant_update" ON public.payments;
DROP POLICY IF EXISTS "payments_tenant_delete" ON public.payments;

DROP POLICY IF EXISTS "payment_allocations_tenant_select" ON public.payment_allocations;
DROP POLICY IF EXISTS "payment_allocations_tenant_insert" ON public.payment_allocations;
DROP POLICY IF EXISTS "payment_allocations_tenant_update" ON public.payment_allocations;
DROP POLICY IF EXISTS "payment_allocations_tenant_delete" ON public.payment_allocations;

DROP POLICY IF EXISTS "activity_logs_tenant_select" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_tenant_insert" ON public.activity_logs;

DROP POLICY IF EXISTS "salesmen_tenant_select" ON public.salesmen;
DROP POLICY IF EXISTS "salesmen_tenant_insert" ON public.salesmen;
DROP POLICY IF EXISTS "salesmen_tenant_update" ON public.salesmen;
DROP POLICY IF EXISTS "salesmen_tenant_delete" ON public.salesmen;

DROP POLICY IF EXISTS "customers_tenant_select" ON public.customers;
DROP POLICY IF EXISTS "customers_tenant_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_tenant_update" ON public.customers;
DROP POLICY IF EXISTS "customers_tenant_delete" ON public.customers;

DROP POLICY IF EXISTS "day_book_entries_tenant_select" ON public.day_book_entries;
DROP POLICY IF EXISTS "day_book_entries_tenant_insert" ON public.day_book_entries;
DROP POLICY IF EXISTS "day_book_entries_tenant_update" ON public.day_book_entries;
DROP POLICY IF EXISTS "day_book_entries_tenant_delete" ON public.day_book_entries;

DROP POLICY IF EXISTS "import_batches_tenant_select" ON public.import_batches;
DROP POLICY IF EXISTS "import_batches_tenant_insert" ON public.import_batches;
DROP POLICY IF EXISTS "import_batches_tenant_update" ON public.import_batches;
DROP POLICY IF EXISTS "import_batches_tenant_delete" ON public.import_batches;

DROP POLICY IF EXISTS "import_errors_tenant_select" ON public.import_errors;
DROP POLICY IF EXISTS "import_errors_tenant_insert" ON public.import_errors;
DROP POLICY IF EXISTS "import_errors_tenant_delete" ON public.import_errors;

-- ── 2. Drop orphaned organization_id columns from all tables ─
ALTER TABLE public.activity_logs DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.customers DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.day_book_entries DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.import_batches DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.import_errors DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.invoice_items DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.payment_allocations DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.payments DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public.salesmen DROP COLUMN IF EXISTS organization_id CASCADE;

-- ── 3. Drop orphaned organization helper functions ──────────
DROP FUNCTION IF EXISTS public.is_org_member(uuid);
DROP FUNCTION IF EXISTS public.is_org_admin(uuid);
DROP FUNCTION IF EXISTS public.is_org_member();
DROP FUNCTION IF EXISTS public.is_org_admin();

-- ── 4. Restore Standard CBM Policies ─────────────────────────
-- Customers
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

-- Salesmen
DROP POLICY IF EXISTS "salesmen_select" ON public.salesmen;
DROP POLICY IF EXISTS "salesmen_admin_all" ON public.salesmen;

CREATE POLICY "salesmen_select" ON public.salesmen
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

CREATE POLICY "salesmen_admin_all" ON public.salesmen
  FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- Invoices
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

-- Invoice Items
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

-- Payments
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

-- Payment Allocations
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

-- Activity Logs
DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;

CREATE POLICY "activity_logs_select" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

CREATE POLICY "activity_logs_insert" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
  WITH CHECK (id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

-- ── 5. Reload PostgREST Schema Cache ─────────────────────────
NOTIFY pgrst, 'reload schema';
