-- ============================================================
-- Migration 023 — Sync Profiles and Salesmen Name/Email
-- ============================================================

-- ── 1. One-time data sync: update salesmen name & email from profiles ──────
UPDATE public.salesmen s
SET 
  name = COALESCE(NULLIF(p.full_name, ''), s.name),
  email = COALESCE(p.email, s.email),
  updated_at = now()
FROM public.profiles p
WHERE s.user_id = p.id;

-- ── 2. Trigger function to auto-sync profiles -> salesmen on update ───────
CREATE OR REPLACE FUNCTION public.sync_profile_to_salesman()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If full_name or email changed on profiles, propagate to salesmen table
  UPDATE public.salesmen
  SET 
    name = COALESCE(NULLIF(NEW.full_name, ''), split_part(NEW.email, '@', 1)),
    email = NEW.email,
    updated_at = now()
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_profile_to_salesman() FROM PUBLIC;

-- ── 3. Create Trigger on public.profiles ────────────────────────────────────
DROP TRIGGER IF EXISTS on_profile_updated_sync_salesman ON public.profiles;
CREATE TRIGGER on_profile_updated_sync_salesman
  AFTER UPDATE OF full_name, email ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_salesman();

-- ── 4. Reload PostgREST Schema Cache ───────────────────────────────────────
NOTIFY pgrst, 'reload schema';
