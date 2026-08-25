-- ============================================================
-- Migration 016 — Security Fix: Profile Role Protection & Realtime Allocations
-- ============================================================

-- ── 1. Restrict profiles UPDATE policy to Admins only ─────────
-- Regular users must NOT be able to directly modify their role column in profiles.
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- ── 2. Guard Trigger: Prevent non-admin role escalation on profiles ──
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Privilege escalation rejected: only administrators can change user roles.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_profile_role_update ON public.profiles;
CREATE TRIGGER trg_check_profile_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_role_update();

-- ── 3. Add payment_allocations to Supabase Realtime Publication ─
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_allocations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. Reload PostgREST Schema Cache ───────────────────────────
NOTIFY pgrst, 'reload schema';
