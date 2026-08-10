-- Migration 002 — make the admin profile policy recursion-safe.
-- Run this after 001_profiles_rls.sql in the Supabase SQL Editor.

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
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "admins can read all profiles" ON public.profiles;
CREATE POLICY "admins can read all profiles"
  ON public.profiles
  FOR SELECT
  USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "admins can update profiles" ON public.profiles;
CREATE POLICY "admins can update profiles"
  ON public.profiles
  FOR UPDATE
  USING ((SELECT public.is_admin()));
