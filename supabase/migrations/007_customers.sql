-- ============================================================
-- Migration 007 — customers table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id                   uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code        text           UNIQUE,
  name                 text           NOT NULL,
  phone                text,
  email                text,
  address              text,
  city                 text,
  state                text,
  pincode              text,
  assigned_salesman_id uuid           REFERENCES public.salesmen(id) ON DELETE SET NULL,
  credit_limit         numeric(14,2)  NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  opening_balance      numeric(14,2)  NOT NULL DEFAULT 0,
  is_active            boolean        NOT NULL DEFAULT true,
  created_at           timestamptz    NOT NULL DEFAULT now(),
  updated_at           timestamptz    NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.customers IS 'Business customers. opening_balance captures pre-existing balance at onboarding.';
COMMENT ON COLUMN public.customers.credit_limit IS 'Maximum credit allowed. Must be >= 0.';
