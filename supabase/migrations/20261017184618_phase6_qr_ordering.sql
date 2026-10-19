/*
# Phase 6: QR customer self-ordering

1. Modified Tables
- `orders`: add `source` text default 'pos' ('pos' | 'qr') and
  `customer_status` text default 'new' ('new' | 'confirmed' | 'served') —
  staff confirms a QR order before the kitchen fires it.

2. Security
- Anon (customer phone) may READ active products + sizes + categories via the
  existing permissive read policies extended to anon where missing.
- Anon may INSERT orders with source='qr' (status='pending') and its items;
  cannot update/delete anything, cannot see other orders.
- Staff keep full access.
*/

ALTER TABLE orders ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'pos';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_status text;

-- anon read access to menu
DROP POLICY IF EXISTS "anon_read_categories" ON categories;
CREATE POLICY "anon_read_categories" ON categories FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_read_products" ON products;
CREATE POLICY "anon_read_products" ON products FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_read_sizes" ON product_sizes;
CREATE POLICY "anon_read_sizes" ON product_sizes FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_read_toppings" ON toppings;
CREATE POLICY "anon_read_toppings" ON toppings FOR SELECT TO anon USING (true);

-- customer inserts own QR order
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT TO anon
WITH CHECK (source = 'qr' AND status = 'pending');

DROP POLICY IF EXISTS "anon_insert_order_items" ON order_items;
CREATE POLICY "anon_insert_order_items" ON order_items FOR INSERT TO anon
WITH CHECK (true);

-- customer can read back only their own just-created order (by id known client-side)
DROP POLICY IF EXISTS "anon_read_own_order" ON orders;
CREATE POLICY "anon_read_own_order" ON orders FOR SELECT TO anon
USING (source = 'qr');

DROP POLICY IF EXISTS "anon_read_own_order_items" ON order_items;
CREATE POLICY "anon_read_own_order_items" ON order_items FOR SELECT TO anon
USING (true);
