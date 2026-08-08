-- Migration to backfill missing profiles for existing auth.users and repair the on_auth_user_created trigger

-- 1. Ensure handle_new_user trigger function inserts both profile and student role
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; 
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill public.profiles for any existing auth.users missing a profile row
INSERT INTO public.profiles (id, email, profile_completed, is_active, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  false,
  true,
  COALESCE(u.created_at, NOW()),
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL AND u.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 3. Backfill public.user_roles for any existing auth.users missing a role
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id,
  'student'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
