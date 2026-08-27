-- ============================================================
-- Migration 020 — Real Day Book Schema (Voucher Type & Number)
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'day_book_entries' AND column_name = 'voucher_type'
  ) THEN
    ALTER TABLE public.day_book_entries ADD COLUMN voucher_type text;
  END IF;
END $$;

COMMENT ON COLUMN public.day_book_entries.voucher_type IS 'Type of voucher, e.g. Sales, Receipt, Payment, Journal';
COMMENT ON COLUMN public.day_book_entries.voucher_ref IS 'Voucher number / invoice reference, e.g. 1909, 1910';
