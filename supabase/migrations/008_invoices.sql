-- ============================================================
-- Migration 008 — invoices table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  text           NOT NULL UNIQUE,
  customer_id     uuid           NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  salesman_id     uuid           NOT NULL REFERENCES public.salesmen(id) ON DELETE RESTRICT,
  invoice_date    timestamptz    NOT NULL DEFAULT now(),
  due_date        timestamptz,
  subtotal        numeric(14,2)  NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount numeric(14,2)  NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount    numeric(14,2)  NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status          text           NOT NULL DEFAULT 'issued'
                                 CHECK (status IN ('draft','issued','partially_paid','paid','overdue','cancelled')),
  notes           text,
  created_by      uuid           NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at      timestamptz    NOT NULL DEFAULT now(),
  updated_at      timestamptz    NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.invoices        IS 'Sales invoices. Status is auto-managed by trigger on payment_allocations.';
COMMENT ON COLUMN public.invoices.status IS 'draft|issued|partially_paid|paid|overdue|cancelled — recalculated by trigger.';
