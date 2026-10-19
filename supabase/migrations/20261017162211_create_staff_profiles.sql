/*
# Staff profiles for role-based access

1. New Tables
- `staff` — profile row for each app user (linked 1-1 to auth.users)
  - `id` (uuid, PK, = auth.users.id)
  - `name` (text, display name)
  - `role` (text: owner | cashier | barista)
  - `created_at` (timestamp)

2. Security
- Enable RLS on `staff`.
- Every signed-in user can read all staff rows (needed to render names) and
  update their own row. Only the owner role can insert new staff or delete.
  Role checks read from the user's JWT app_metadata (server-managed, not
  user-editable) via a small helper `is_owner()`.

3. Notes
- auth.users handles credentials; this table only holds display info + role.
*/

CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'cashier' CHECK (role IN ('owner', 'cashier', 'barista')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_owner() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner', false
  );
$$;

DROP POLICY IF EXISTS "staff_read" ON staff;
CREATE POLICY "staff_read" ON staff FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert_owner" ON staff;
CREATE POLICY "staff_insert_owner" ON staff FOR INSERT
TO authenticated WITH CHECK (is_owner());

DROP POLICY IF EXISTS "staff_update_self" ON staff;
CREATE POLICY "staff_update_self" ON staff FOR UPDATE
TO authenticated USING (auth.uid() = id OR is_owner()) WITH CHECK (auth.uid() = id OR is_owner());

DROP POLICY IF EXISTS "staff_delete_owner" ON staff;
CREATE POLICY "staff_delete_owner" ON staff FOR DELETE
TO authenticated USING (is_owner());
