-- ============================================================
-- Migration 009 — invoice_items table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid           NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description     text           NOT NULL,
  quantity        numeric(12,2)  NOT NULL CHECK (quantity > 0),
  unit_price      numeric(14,2)  NOT NULL CHECK (unit_price >= 0),
  discount_amount numeric(14,2)  NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  line_total      numeric(14,2)  NOT NULL CHECK (line_total >= 0),
  created_at      timestamptz    NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invoice_items IS 'Line items for an invoice. Cascades delete with parent invoice.';
