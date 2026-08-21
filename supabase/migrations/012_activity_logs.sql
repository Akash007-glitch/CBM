-- ============================================================
-- Migration 012 — activity_logs table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action      text        NOT NULL,
  entity_type text        NOT NULL,
  entity_id   uuid,
  description text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.activity_logs IS 'Append-only audit trail. Normal users can INSERT only, no UPDATE/DELETE.';
