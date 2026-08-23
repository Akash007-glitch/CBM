-- ============================================================
-- Migration 005 — profiles table (full schema)
-- Supersedes 001_profiles_rls.sql and 002_fix_profiles_admin_rls.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text        NOT NULL DEFAULT '',
  email       text,
  phone       text,
  role        text        NOT NULL DEFAULT 'salesman'
                          CHECK (role IN ('admin', 'salesman')),
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.profiles      IS 'One row per auth user; holds the app role and basic info.';
COMMENT ON COLUMN public.profiles.role IS 'Either ''admin'' or ''salesman''. Cannot be changed by the user themselves.';

-- Auto-insert profile when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(NEW.raw_user_meta_data->>'role', 'salesman');
  v_name text := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1));
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (NEW.id, v_name, NEW.email, v_role)
  ON CONFLICT (id) DO UPDATE 
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;

  IF v_role = 'salesman' THEN
    INSERT INTO public.salesmen (user_id, name, email, is_active)
    VALUES (NEW.id, v_name, NEW.email, true)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recursion-safe admin check helper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
