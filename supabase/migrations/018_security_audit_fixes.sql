-- ============================================================
-- Migration 018 — Security Audit Hardening: Auth Trigger & Permissions Fix
-- ============================================================

-- ── 1. Harden handle_new_user Trigger ──────────────────────────
-- Ensure new user accounts default strictly to 'salesman'.
-- Prevent unauthenticated / client-side privilege escalation via raw_user_meta_data->>'role'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1));
BEGIN
  -- Default every new user to 'salesman'.
  -- Administrative role elevation must be performed explicitly via admin APIs or service role.
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (NEW.id, v_name, NEW.email, 'salesman')
  ON CONFLICT (id) DO UPDATE 
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;

  -- Create linked salesman row for the new user
  INSERT INTO public.salesmen (user_id, name, email, is_active)
  VALUES (NEW.id, v_name, NEW.email, true)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- ── 2. Revoke Unnecessary Anon Grants on Day Book Tables ───────
-- Day book tables must only be accessible to authenticated users (and service role).
REVOKE SELECT ON TABLE public.import_batches   FROM anon;
REVOKE SELECT ON TABLE public.day_book_entries FROM anon;
REVOKE SELECT ON TABLE public.import_errors    FROM anon;

-- ── 3. Reload PostgREST Schema Cache ───────────────────────────
NOTIFY pgrst, 'reload schema';
