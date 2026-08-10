-- ============================================================
-- Migration 001 — profiles table, trigger, and RLS policies
-- Run this in the Supabase SQL Editor (Database → SQL Editor)
-- ============================================================

-- ── 1. profiles table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role        text        NOT NULL DEFAULT 'salesman'
                          CHECK (role IN ('admin', 'salesman')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.profiles      IS 'One row per auth user; holds the app role.';
COMMENT ON COLUMN public.profiles.role IS 'Either ''admin'' or ''salesman''.';

-- ── 2. Trigger: auto-insert profile on new auth user ─────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'salesman')
  ON CONFLICT (id) DO NOTHING;   -- idempotent if row already exists
  RETURN NEW;
END;
$$;

-- Drop the trigger first so this script is re-runnable
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 3. Backfill existing users (uncomment if you have existing users) ─────────
--
-- INSERT INTO public.profiles (id, role)
-- SELECT id, 'salesman'
-- FROM auth.users
-- ON CONFLICT (id) DO NOTHING;
--
-- To promote a specific user to admin, run:
-- UPDATE public.profiles SET role = 'admin' WHERE id = '<user-uuid>';

-- ── 4. Enable RLS ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── 5. RLS policies ───────────────────────────────────────────────────────────

-- Policy: each user can read their own profile row
DROP POLICY IF EXISTS "users can read own profile" ON public.profiles;
CREATE POLICY "users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: admins can read ALL profile rows
DROP POLICY IF EXISTS "admins can read all profiles" ON public.profiles;
CREATE POLICY "admins can read all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS caller
      WHERE caller.id = auth.uid()
        AND caller.role = 'admin'
    )
  );

-- Policy: admins can update any profile (e.g. change roles)
DROP POLICY IF EXISTS "admins can update profiles" ON public.profiles;
CREATE POLICY "admins can update profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS caller
      WHERE caller.id = auth.uid()
        AND caller.role = 'admin'
    )
  );

-- ── 6. (Optional) Grant anon/authenticated access ────────────────────────────
-- The service role bypasses RLS by default; no extra grants needed for it.

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
