-- ============================================================
-- Migration 010 — payments table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number   text           UNIQUE,
  customer_id      uuid           NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  salesman_id      uuid           NOT NULL REFERENCES public.salesmen(id) ON DELETE RESTRICT,
  amount           numeric(14,2)  NOT NULL CHECK (amount > 0),
  payment_date     timestamptz    NOT NULL DEFAULT now(),
  payment_method   text           NOT NULL DEFAULT 'cash'
                                  CHECK (payment_method IN ('cash','bank_transfer','upi','cheque','other')),
  reference_number text,
  notes            text,
  created_by       uuid           NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at       timestamptz    NOT NULL DEFAULT now(),
  updated_at       timestamptz    NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payments IS 'Money collected from customers. amount must be > 0.';
