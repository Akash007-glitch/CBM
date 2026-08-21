-- ============================================================
-- Migration 011 — payment_allocations table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id       uuid           NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  invoice_id       uuid           NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  allocated_amount numeric(14,2)  NOT NULL CHECK (allocated_amount > 0),
  created_at       timestamptz    NOT NULL DEFAULT now(),
  UNIQUE(payment_id, invoice_id)
);

COMMENT ON TABLE public.payment_allocations IS 'Links payments to invoices. Prevents over-allocation via trigger.';
