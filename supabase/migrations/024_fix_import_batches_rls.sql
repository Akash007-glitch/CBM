-- ============================================================
-- Migration 024 — Fix import_batches and Day Book RLS Policies
-- ============================================================

-- ── 1. Ensure profiles has is_active with default true ───────
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.profiles 
SET is_active = true 
WHERE is_active IS NULL;

-- ── 2. Robust is_admin() Helper Function ─────────────────────
-- Handle cases where is_active might be null or unpopulated
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
      AND COALESCE(is_active, true) = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- ── 3. Policies for import_batches ───────────────────────────
DROP POLICY IF EXISTS "import_batches_select" ON public.import_batches;
DROP POLICY IF EXISTS "import_batches_admin_all" ON public.import_batches;
DROP POLICY IF EXISTS "import_batches_insert" ON public.import_batches;
DROP POLICY IF EXISTS "import_batches_update" ON public.import_batches;
DROP POLICY IF EXISTS "import_batches_delete" ON public.import_batches;

-- Allow select for admins OR the user who uploaded the batch
CREATE POLICY "import_batches_select" ON public.import_batches
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()) OR uploaded_by = (SELECT auth.uid()));

-- Allow insert if admin OR if setting uploaded_by to self
CREATE POLICY "import_batches_insert" ON public.import_batches
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.is_admin())
    OR uploaded_by = (SELECT auth.uid())
  );

-- Allow update if admin OR if owner updating their own batch
CREATE POLICY "import_batches_update" ON public.import_batches
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.is_admin())
    OR uploaded_by = (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT public.is_admin())
    OR uploaded_by = (SELECT auth.uid())
  );

-- Allow delete for admins
CREATE POLICY "import_batches_delete" ON public.import_batches
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

-- ── 4. Policies for day_book_entries ─────────────────────────
DROP POLICY IF EXISTS "day_book_entries_select" ON public.day_book_entries;
DROP POLICY IF EXISTS "day_book_entries_admin_all" ON public.day_book_entries;
DROP POLICY IF EXISTS "day_book_entries_insert" ON public.day_book_entries;
DROP POLICY IF EXISTS "day_book_entries_update" ON public.day_book_entries;
DROP POLICY IF EXISTS "day_book_entries_delete" ON public.day_book_entries;

CREATE POLICY "day_book_entries_select" ON public.day_book_entries
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = day_book_entries.customer_id
        AND c.assigned_salesman_id = (SELECT public.my_salesman_id())
    )
  );

-- Allow insert if admin OR if the entry belongs to a batch uploaded by current user
CREATE POLICY "day_book_entries_insert" ON public.day_book_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1 FROM public.import_batches ib
      WHERE ib.id = day_book_entries.import_batch_id
        AND ib.uploaded_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "day_book_entries_update" ON public.day_book_entries
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "day_book_entries_delete" ON public.day_book_entries
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

-- ── 5. Policies for import_errors ────────────────────────────
DROP POLICY IF EXISTS "import_errors_select" ON public.import_errors;
DROP POLICY IF EXISTS "import_errors_admin_all" ON public.import_errors;
DROP POLICY IF EXISTS "import_errors_insert" ON public.import_errors;

CREATE POLICY "import_errors_select" ON public.import_errors
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1 FROM public.import_batches ib
      WHERE ib.id = import_errors.import_batch_id
        AND ib.uploaded_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "import_errors_insert" ON public.import_errors
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1 FROM public.import_batches ib
      WHERE ib.id = import_errors.import_batch_id
        AND ib.uploaded_by = (SELECT auth.uid())
    )
  );

-- ── 6. Reload PostgREST Schema Cache ─────────────────────────
NOTIFY pgrst, 'reload schema';
