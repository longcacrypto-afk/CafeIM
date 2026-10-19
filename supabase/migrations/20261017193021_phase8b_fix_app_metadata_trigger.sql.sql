/*
# Phase 8b-fix: Copy role from user_metadata to app_metadata on signup

## Problem
`is_owner()` and `is_owner_or_manager()` read from `auth.jwt() -> 'app_metadata' ->> 'role'`,
but `inviteStaff()` in the frontend sets the role via `supabase.auth.signUp({ options: { data: { name, role } } })`
which writes to `raw_user_meta_data`, NOT `raw_app_meta_data`. Without a trigger, the role
never reaches app_metadata and all role-based RLS policies silently fail.

## Fix
1. Create a trigger function `copy_role_to_app_metadata()` that copies `role` (and `name`)
   from `raw_user_meta_data` into `raw_app_meta_data` on INSERT to `auth.users`.
2. Attach it as an AFTER INSERT trigger.
3. Backfill existing users: copy role/name from user_metadata to app_metadata for all
   rows where app_metadata.role IS NULL.

## Security
The trigger function is SECURITY DEFINER (needs to write auth.users).
Only fires on INSERT, copies from user-supplied metadata to server-managed metadata.
*/

CREATE OR REPLACE FUNCTION copy_role_to_app_metadata()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, public AS $$
BEGIN
  IF NEW.raw_user_meta_data ? 'role' THEN
    NEW.raw_app_meta_data := jsonb_set(
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(NEW.raw_user_meta_data ->> 'role')
    );
  END IF;
  IF NEW.raw_user_meta_data ? 'name' THEN
    NEW.raw_app_meta_data := jsonb_set(
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
      '{name}',
      to_jsonb(NEW.raw_user_meta_data ->> 'name')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_app_metadata_role ON auth.users;
CREATE TRIGGER set_app_metadata_role
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION copy_role_to_app_metadata();

-- Backfill existing users
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
      jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb),
        '{role}',
        COALESCE(to_jsonb(raw_user_meta_data ->> 'role'), '"cashier"'::jsonb)
      ),
      '{name}',
      COALESCE(to_jsonb(raw_user_meta_data ->> 'name'), '""'::jsonb)
    )
WHERE raw_app_meta_data ->> 'role' IS NULL;