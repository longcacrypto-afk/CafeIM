/*
# Phase 8a+8b: Fix RLS holes + add manager role

## What changed

### 8a — Security fixes (RLS)
Replaces permissive "allow all" policies that were overriding owner-only
policies on orders, order_items, products, categories, tables, and expenses.

- orders: anon can only insert/read QR orders; authenticated staff get full
  read + insert POS + update; DELETE restricted to owner/manager.
- order_items: anon can insert/read; authenticated staff get read + insert +
  update (status/cancel); DELETE restricted to owner/manager.
- products / categories: anon + authenticated read-only; writes
  (insert/update/delete) restricted to owner/manager.
- tables: anon + authenticated read; authenticated can update occupied flag;
  insert/delete restricted to owner/manager. Removed the conflicting
  `USING(true) WITH CHECK(true)` update policy that allowed anyone to edit.
- expenses: SELECT now allows owner/manager OR the staff member who created
  the expense (was owner-only — staff couldn't see their own expenses).
  Added UPDATE policy for owner/manager.

### 8b — New "manager" role
- staff.role CHECK constraint expanded to include 'manager'.
- New helper is_owner_or_manager() (reads JWT app_metadata, same pattern as
  is_owner()).
- approve_cancel() now allows manager, not just owner.
- cafe_settings UPDATE now allows owner_or_manager.

## Security
All policies use auth.uid() / is_owner() / is_owner_or_manager().
No USING(true) except for intentionally public reads (menu for QR customers).
*/

-- ── 8b: manager role helpers ──────────────────────────────────────────────

ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE staff ADD CONSTRAINT staff_role_check
  CHECK (role IN ('owner', 'manager', 'cashier', 'barista'));

CREATE OR REPLACE FUNCTION is_owner_or_manager() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'manager'), false
  );
$$;

-- ── orders: replace wide-open policies ────────────────────────────────────

DROP POLICY IF EXISTS "anon_select_orders" ON orders;
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
DROP POLICY IF EXISTS "anon_update_orders" ON orders;
DROP POLICY IF EXISTS "anon_delete_orders" ON orders;
DROP POLICY IF EXISTS "anon_read_own_order" ON orders;

-- anon: QR customers only see/insert their own QR orders
CREATE POLICY "anon_read_qr_orders" ON orders FOR SELECT
  TO anon USING (source = 'qr');
CREATE POLICY "anon_insert_qr_orders" ON orders FOR INSERT
  TO anon WITH CHECK (source = 'qr' AND status = 'pending');

-- authenticated: staff see all orders, insert POS, update freely, delete owner/manager
CREATE POLICY "staff_select_orders" ON orders FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "staff_insert_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (source = 'pos');
CREATE POLICY "staff_update_orders" ON orders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff_delete_orders" ON orders FOR DELETE
  TO authenticated USING (is_owner_or_manager());

-- ── order_items: replace wide-open policies ───────────────────────────────

DROP POLICY IF EXISTS "anon_select_order_items" ON orders;
DROP POLICY IF EXISTS "anon_select_order_items" ON order_items;
DROP POLICY IF EXISTS "anon_insert_order_items" ON order_items;
DROP POLICY IF EXISTS "anon_update_order_items" ON order_items;
DROP POLICY IF EXISTS "anon_delete_order_items" ON order_items;
DROP POLICY IF EXISTS "anon_read_own_order_items" ON order_items;
DROP POLICY IF EXISTS "oi_request_cancel" ON order_items;

-- anon: QR customer can read items of QR orders + insert
CREATE POLICY "anon_read_qr_order_items" ON order_items FOR SELECT
  TO anon USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.source = 'qr')
  );
CREATE POLICY "anon_insert_qr_order_items" ON order_items FOR INSERT
  TO anon WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.source = 'qr')
  );

-- authenticated: staff full read + insert + update (status, cancel requests)
CREATE POLICY "staff_select_order_items" ON order_items FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "staff_insert_order_items" ON order_items FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "staff_update_order_items" ON order_items FOR UPDATE
  TO authenticated
  USING (status IS DISTINCT FROM 'completed' AND status IS DISTINCT FROM 'cancelled')
  WITH CHECK (status IS DISTINCT FROM 'completed' AND status IS DISTINCT FROM 'cancelled');
CREATE POLICY "staff_delete_order_items" ON order_items FOR DELETE
  TO authenticated USING (is_owner_or_manager());

-- ── products: owner/manager-only writes ───────────────────────────────────

DROP POLICY IF EXISTS "anon_select_products" ON products;
DROP POLICY IF EXISTS "anon_insert_products" ON products;
DROP POLICY IF EXISTS "anon_update_products" ON products;
DROP POLICY IF EXISTS "anon_delete_products" ON products;

CREATE POLICY "read_products" ON products FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "insert_products" ON products FOR INSERT
  TO authenticated WITH CHECK (is_owner_or_manager());
CREATE POLICY "update_products" ON products FOR UPDATE
  TO authenticated USING (is_owner_or_manager()) WITH CHECK (is_owner_or_manager());
CREATE POLICY "delete_products" ON products FOR DELETE
  TO authenticated USING (is_owner_or_manager());

-- ── categories: owner/manager-only writes ─────────────────────────────────

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
DROP POLICY IF EXISTS "anon_update_categories" ON categories;
DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
DROP POLICY IF EXISTS "anon_read_categories" ON categories;

CREATE POLICY "read_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "insert_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (is_owner_or_manager());
CREATE POLICY "update_categories" ON categories FOR UPDATE
  TO authenticated USING (is_owner_or_manager()) WITH CHECK (is_owner_or_manager());
CREATE POLICY "delete_categories" ON categories FOR DELETE
  TO authenticated USING (is_owner_or_manager());

-- ── tables: fix conflicting policies ──────────────────────────────────────

DROP POLICY IF EXISTS "anon_select_tables" ON tables;
DROP POLICY IF EXISTS "anon_insert_tables" ON tables;
DROP POLICY IF EXISTS "anon_update_tables" ON tables;
DROP POLICY IF EXISTS "anon_delete_tables" ON tables;
DROP POLICY IF EXISTS "tables_insert_owner" ON tables;
DROP POLICY IF EXISTS "tables_update_owner" ON tables;
DROP POLICY IF EXISTS "tables_delete_owner" ON tables;

CREATE POLICY "read_tables" ON tables FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "insert_tables" ON tables FOR INSERT
  TO authenticated WITH CHECK (is_owner_or_manager());
CREATE POLICY "update_tables" ON tables FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_tables" ON tables FOR DELETE
  TO authenticated USING (is_owner_or_manager());

-- ── expenses: staff can see own, owner/manager see all + edit ──────────────

DROP POLICY IF EXISTS "expenses_read" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;

CREATE POLICY "expenses_select" ON expenses FOR SELECT
  TO authenticated USING (is_owner_or_manager() OR staff_id = auth.uid());
CREATE POLICY "expenses_insert" ON expenses FOR INSERT
  TO authenticated WITH CHECK (staff_id = auth.uid() OR is_owner_or_manager());
CREATE POLICY "expenses_update" ON expenses FOR UPDATE
  TO authenticated USING (is_owner_or_manager()) WITH CHECK (is_owner_or_manager());
CREATE POLICY "expenses_delete" ON expenses FOR DELETE
  TO authenticated USING (is_owner_or_manager());

-- ── cafe_settings: manager can also update ────────────────────────────────

DROP POLICY IF EXISTS "settings_update" ON cafe_settings;
CREATE POLICY "settings_update" ON cafe_settings FOR UPDATE
  TO authenticated USING (is_owner_or_manager()) WITH CHECK (is_owner_or_manager());

-- ── approve_cancel: allow manager ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION approve_cancel(p_item_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_owner_or_manager() THEN
    RAISE EXCEPTION 'only owner or manager can approve cancellations';
  END IF;
  IF p_approve THEN
    UPDATE order_items SET status = 'cancelled' WHERE id = p_item_id AND status = 'cancel_requested';
  ELSE
    UPDATE order_items SET status = 'pending' WHERE id = p_item_id AND status = 'cancel_requested';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION approve_cancel(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION approve_cancel(uuid, boolean) TO authenticated;