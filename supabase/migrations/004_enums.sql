-- ============================================================
-- Migration 004 — Custom ENUM types
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'salesman');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.invoice_status AS ENUM (
    'draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM (
    'cash', 'bank_transfer', 'upi', 'cheque', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
