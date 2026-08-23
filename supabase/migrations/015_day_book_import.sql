-- ============================================================
-- Migration 015 — Day Book Import System & Schema Cache Fix
-- Run this script in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── 1. Ensure Schema Usage Grants ────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- ── 2. Add GSTIN to customers table ──────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'gstin'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN gstin text;
  END IF;
END $$;

-- ── 3. Create Import Batches Table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.import_batches (
  id                   uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name            text           NOT NULL,
  file_size            integer,
  target_account       text,
  total_rows           integer        NOT NULL DEFAULT 0,
  successful_rows      integer        NOT NULL DEFAULT 0,
  duplicate_rows       integer        NOT NULL DEFAULT 0,
  failed_rows          integer        NOT NULL DEFAULT 0,
  new_customers_count  integer        NOT NULL DEFAULT 0,
  status               text           NOT NULL DEFAULT 'processing'
                                      CHECK (status IN ('processing', 'completed', 'completed_with_errors', 'failed')),
  uploaded_by          uuid           NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at           timestamptz    NOT NULL DEFAULT now(),
  updated_at           timestamptz    NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.import_batches IS 'Tracks batch Excel/CSV imports of Day Book transactions.';

-- ── 4. Create Day Book Entries Table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.day_book_entries (
  id                 uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id    uuid           REFERENCES public.import_batches(id) ON DELETE SET NULL,
  customer_id        uuid           NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  transaction_date   date           NOT NULL DEFAULT CURRENT_DATE,
  voucher_ref        text,
  particulars        text,
  debit              numeric(14,2)  NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit             numeric(14,2)  NOT NULL DEFAULT 0 CHECK (credit >= 0),
  balance            numeric(14,2),
  amount             numeric(14,2)  NOT NULL DEFAULT 0 CHECK (amount >= 0),
  transaction_type   text           NOT NULL DEFAULT 'debit'
                                    CHECK (transaction_type IN ('debit', 'credit')),
  source             text           NOT NULL DEFAULT 'excel_import',
  duplicate_hash     text           UNIQUE,
  raw_row_data       jsonb,
  created_by         uuid           NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at         timestamptz    NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was already created previously
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'day_book_entries' AND column_name = 'debit') THEN
    ALTER TABLE public.day_book_entries ADD COLUMN debit numeric(14,2) NOT NULL DEFAULT 0 CHECK (debit >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'day_book_entries' AND column_name = 'credit') THEN
    ALTER TABLE public.day_book_entries ADD COLUMN credit numeric(14,2) NOT NULL DEFAULT 0 CHECK (credit >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'day_book_entries' AND column_name = 'balance') THEN
    ALTER TABLE public.day_book_entries ADD COLUMN balance numeric(14,2);
  END IF;
END $$;

COMMENT ON TABLE public.day_book_entries IS 'Day book financial transactions with debit, credit, running balance, linked to customers and import batches.';

-- ── 5. Create Import Errors Table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.import_errors (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id  uuid           NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  row_number       integer        NOT NULL,
  error_reason     text           NOT NULL,
  raw_data         jsonb,
  created_at       timestamptz    NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.import_errors IS 'Failed rows and error reasons for an import batch.';

-- ── 6. Create High-Performance Indexes ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_customers_name_lower ON public.customers (lower(trim(name)));
CREATE INDEX IF NOT EXISTS idx_customers_gstin ON public.customers (gstin) WHERE gstin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_day_book_entries_customer ON public.day_book_entries (customer_id);
CREATE INDEX IF NOT EXISTS idx_day_book_entries_date ON public.day_book_entries (transaction_date);
CREATE INDEX IF NOT EXISTS idx_day_book_entries_batch ON public.day_book_entries (import_batch_id);
CREATE INDEX IF NOT EXISTS idx_day_book_entries_hash ON public.day_book_entries (duplicate_hash);
CREATE INDEX IF NOT EXISTS idx_import_errors_batch ON public.import_errors (import_batch_id);

-- ── 7. Explicit Table Grants for PostgREST & Roles ────────────────────────────
GRANT ALL ON TABLE public.import_batches   TO postgres, authenticated, service_role;
GRANT ALL ON TABLE public.day_book_entries TO postgres, authenticated, service_role;
GRANT ALL ON TABLE public.import_errors    TO postgres, authenticated, service_role;

GRANT SELECT ON TABLE public.import_batches   TO anon;
GRANT SELECT ON TABLE public.day_book_entries TO anon;
GRANT SELECT ON TABLE public.import_errors    TO anon;

-- ── 8. Enable Row Level Security (RLS) ───────────────────────────────────────
ALTER TABLE public.import_batches    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_book_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_errors     ENABLE ROW LEVEL SECURITY;

-- ── 9. Policies for import_batches ───────────────────────────────────────────
DROP POLICY IF EXISTS "import_batches_select" ON public.import_batches;
DROP POLICY IF EXISTS "import_batches_admin_all" ON public.import_batches;

CREATE POLICY "import_batches_select" ON public.import_batches
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()) OR uploaded_by = (SELECT auth.uid()));

CREATE POLICY "import_batches_admin_all" ON public.import_batches
  FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- ── 10. Policies for day_book_entries ────────────────────────────────────────
DROP POLICY IF EXISTS "day_book_entries_select" ON public.day_book_entries;
DROP POLICY IF EXISTS "day_book_entries_admin_all" ON public.day_book_entries;

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

CREATE POLICY "day_book_entries_admin_all" ON public.day_book_entries
  FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- ── 11. Policies for import_errors ───────────────────────────────────────────
DROP POLICY IF EXISTS "import_errors_select" ON public.import_errors;
DROP POLICY IF EXISTS "import_errors_admin_all" ON public.import_errors;

CREATE POLICY "import_errors_select" ON public.import_errors
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY "import_errors_admin_all" ON public.import_errors
  FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- ── 12. Add to Realtime Publication ──────────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.day_book_entries, public.import_batches;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 13. Reload PostgREST Schema Cache ────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
