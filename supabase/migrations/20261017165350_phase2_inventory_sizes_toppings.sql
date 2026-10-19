/*
# Phase 2: inventory, recipes, sizes, toppings, table management

1. New Tables
- `ingredients` — raw materials with stock levels (name, unit g|ml|pcs, stock, min_stock)
- `product_ingredients` — recipe lines (product_id, ingredient_id, qty per M cup)
- `product_sizes` — S/M/L price variants per drink
- `toppings` — sellable add-ons (name, price, active)

2. Modified Tables
- `order_items`: + `toppings` jsonb default '[]', + `size_price` int

3. Automation
- Trigger `deduct_stock_trigger`: on order item insert, subtract recipe
  quantities from ingredient stock (SECURITY DEFINER so all staff can sell).

4. Security
- RLS on all new tables; authenticated read, owner-only writes.
- `tables`: owner-only insert/delete; authenticated read/update (occupied flag).

5. Seed
- 12 common ingredients, 4 toppings, S/M/L for all products, basic recipes.
*/

CREATE TABLE IF NOT EXISTS ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'g' CHECK (unit IN ('g', 'ml', 'pcs')),
  stock numeric NOT NULL DEFAULT 0,
  min_stock numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ing_read" ON ingredients;
CREATE POLICY "ing_read" ON ingredients FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "ing_write" ON ingredients;
CREATE POLICY "ing_write" ON ingredients FOR INSERT TO authenticated WITH CHECK (is_owner());
DROP POLICY IF EXISTS "ing_update" ON ingredients;
CREATE POLICY "ing_update" ON ingredients FOR UPDATE TO authenticated USING (is_owner()) WITH CHECK (is_owner());
DROP POLICY IF EXISTS "ing_delete" ON ingredients;
CREATE POLICY "ing_delete" ON ingredients FOR DELETE TO authenticated USING (is_owner());

CREATE TABLE IF NOT EXISTS product_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  qty numeric NOT NULL DEFAULT 0,
  UNIQUE (product_id, ingredient_id)
);

ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recipe_read" ON product_ingredients;
CREATE POLICY "recipe_read" ON product_ingredients FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "recipe_write" ON product_ingredients;
CREATE POLICY "recipe_write" ON product_ingredients FOR INSERT TO authenticated WITH CHECK (is_owner());
DROP POLICY IF EXISTS "recipe_update" ON product_ingredients;
CREATE POLICY "recipe_update" ON product_ingredients FOR UPDATE TO authenticated USING (is_owner()) WITH CHECK (is_owner());
DROP POLICY IF EXISTS "recipe_delete" ON product_ingredients;
CREATE POLICY "recipe_delete" ON product_ingredients FOR DELETE TO authenticated USING (is_owner());

CREATE TABLE IF NOT EXISTS product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size text NOT NULL CHECK (size IN ('S', 'M', 'L')),
  price integer NOT NULL,
  UNIQUE (product_id, size)
);

ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sizes_read" ON product_sizes;
CREATE POLICY "sizes_read" ON product_sizes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "sizes_write" ON product_sizes;
CREATE POLICY "sizes_write" ON product_sizes FOR INSERT TO authenticated WITH CHECK (is_owner());
DROP POLICY IF EXISTS "sizes_update" ON product_sizes;
CREATE POLICY "sizes_update" ON product_sizes FOR UPDATE TO authenticated USING (is_owner()) WITH CHECK (is_owner());
DROP POLICY IF EXISTS "sizes_delete" ON product_sizes;
CREATE POLICY "sizes_delete" ON product_sizes FOR DELETE TO authenticated USING (is_owner());

CREATE TABLE IF NOT EXISTS toppings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE toppings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "toppings_read" ON toppings;
CREATE POLICY "toppings_read" ON toppings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "toppings_write" ON toppings;
CREATE POLICY "toppings_write" ON toppings FOR INSERT TO authenticated WITH CHECK (is_owner());
DROP POLICY IF EXISTS "toppings_update" ON toppings;
CREATE POLICY "toppings_update" ON toppings FOR UPDATE TO authenticated USING (is_owner()) WITH CHECK (is_owner());
DROP POLICY IF EXISTS "toppings_delete" ON toppings;
CREATE POLICY "toppings_delete" ON toppings FOR DELETE TO authenticated USING (is_owner());

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS toppings jsonb NOT NULL DEFAULT '[]';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size_price integer;

CREATE OR REPLACE FUNCTION deduct_stock_on_order_item() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE ingredients i
  SET stock = stock - (r.qty * NEW.quantity)
  FROM product_ingredients r
  WHERE r.ingredient_id = i.id AND r.product_id = NEW.product_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deduct_stock_trigger ON order_items;
CREATE TRIGGER deduct_stock_trigger
AFTER INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION deduct_stock_on_order_item();

DROP POLICY IF EXISTS "tables_insert_owner" ON tables;
CREATE POLICY "tables_insert_owner" ON tables FOR INSERT TO authenticated WITH CHECK (is_owner());
DROP POLICY IF EXISTS "tables_update_owner" ON tables;
CREATE POLICY "tables_update_owner" ON tables FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tables_delete_owner" ON tables;
CREATE POLICY "tables_delete_owner" ON tables FOR DELETE TO authenticated USING (is_owner());

INSERT INTO ingredients (name, unit, stock, min_stock) VALUES
  ('Cà phê rang xay', 'g', 5000, 1000),
  ('Cà phê hạt Arabica', 'g', 3000, 800),
  ('Sữa đặc', 'ml', 8000, 2000),
  ('Sữa tươi', 'ml', 20000, 5000),
  ('Đường', 'g', 10000, 2000),
  ('Đá viên', 'g', 30000, 8000),
  ('Nước lọc', 'ml', 100000, 20000),
  ('Bột cacao', 'g', 2000, 500),
  ('Bột trà xanh matcha', 'g', 1500, 400),
  ('Trà đen', 'g', 2000, 500),
  ('Trân châu đen', 'g', 3000, 800),
  ('Bột kem', 'g', 4000, 1000);

INSERT INTO toppings (name, price) VALUES
  ('Trân châu', 8000),
  ('Kem sữa', 7000),
  ('Thạch', 6000),
  ('Extra shot', 10000);

INSERT INTO product_sizes (product_id, size, price)
SELECT p.id, s.size, GREATEST(0, p.price + s.delta)
FROM products p
CROSS JOIN (VALUES ('S', -5000), ('M', 0), ('L', 8000)) AS s(size, delta)
WHERE NOT EXISTS (SELECT 1 FROM product_sizes ps WHERE ps.product_id = p.id);

WITH recipes(pname, ing, qty) AS (VALUES
  ('cà phê đen đá', 'Cà phê rang xay', 18),
  ('cà phê đen đá', 'Nước lọc', 45),
  ('cà phê đen đá', 'Đường', 10),
  ('cà phê đen đá', 'Đá viên', 80),
  ('cà phê sữa đá', 'Cà phê rang xay', 18),
  ('cà phê sữa đá', 'Sữa đặc', 25),
  ('cà phê sữa đá', 'Đá viên', 80),
  ('bạc xỉu', 'Cà phê rang xay', 8),
  ('bạc xỉu', 'Sữa tươi', 120),
  ('bạc xỉu', 'Đường', 10),
  ('bạc xỉu', 'Đá viên', 80),
  ('cà phê muối', 'Cà phê rang xay', 18),
  ('cà phê muối', 'Sữa đặc', 20),
  ('cà phê muối', 'Bột kem', 10),
  ('cà phê muối', 'Đá viên', 80),
  ('espresso', 'Cà phê hạt Arabica', 20),
  ('cappuccino', 'Cà phê hạt Arabica', 18),
  ('cappuccino', 'Sữa tươi', 120),
  ('cappuccino', 'Bột cacao', 3),
  ('trà sữa trân châu', 'Trà đen', 12),
  ('trà sữa trân châu', 'Sữa tươi', 150),
  ('trà sữa trân châu', 'Đường', 15),
  ('trà sữa trân châu', 'Trân châu đen', 50),
  ('trà đào cam sả', 'Trà đen', 12),
  ('trà đào cam sả', 'Đường', 20),
  ('trà đào cam sả', 'Đá viên', 100),
  ('trà vải', 'Trà đen', 12),
  ('trà vải', 'Đường', 20),
  ('trà vải', 'Đá viên', 100),
  ('sinh tố bơ', 'Sữa tươi', 150),
  ('sinh tố bơ', 'Đường', 20),
  ('sinh tố xoài', 'Sữa tươi', 150),
  ('sinh tố xoài', 'Đường', 20)
)
INSERT INTO product_ingredients (product_id, ingredient_id, qty)
SELECT p.id, i.id, r.qty
FROM recipes r
JOIN ingredients i ON i.name = r.ing
JOIN products p ON lower(p.name) = r.pname
ON CONFLICT DO NOTHING;
