-- ============================================================
-- Migration 006 — salesmen table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.salesmen (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  phone         text,
  email         text,
  employee_code text        UNIQUE,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

COMMENT ON TABLE public.salesmen IS 'Business-specific salesman profile, linked 1:1 to a profiles row with role=salesman.';
