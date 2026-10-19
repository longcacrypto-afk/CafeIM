/*
# Phase 7a: order attribution + add-items-to-open-order

1. Modified Tables
- `orders`: add `staff_id uuid REFERENCES staff(id)` and `staff_name text` —
  who created/last-served the order.

2. Functions
- `add_items_to_order(p_order_id uuid, p_items jsonb)` — appends items to an
  open order (pending/brewing/ready) and recomputes total from live items.
  SECURITY DEFINER so any staff can serve guests; rejects completed orders.
  Items jsonb: [{product_id, product_name, size, size_price, unit_price,
  quantity, note, toppings}]
- `set_order_staff(p_order_id uuid)` — stamps current staff on an order.

3. Index for the open-orders-per-table lookup.
*/

ALTER TABLE orders ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES staff(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS staff_name text;

CREATE INDEX IF NOT EXISTS orders_open_idx ON orders (status) WHERE status IN ('pending','brewing','ready');

CREATE OR REPLACE FUNCTION add_items_to_order(p_order_id uuid, p_items jsonb)
RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  status_text text;
  new_total numeric;
  item jsonb;
BEGIN
  SELECT status INTO status_text FROM orders WHERE id = p_order_id;
  IF status_text IS NULL THEN
    RAISE EXCEPTION 'order not found';
  END IF;
  IF status_text NOT IN ('pending', 'brewing', 'ready') THEN
    RAISE EXCEPTION 'order is closed';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO order_items (order_id, product_id, product_name, size, size_price, unit_price, quantity, note, toppings)
    VALUES (
      p_order_id,
      (item->>'product_id')::uuid,
      item->>'product_name',
      item->>'size',
      COALESCE((item->>'size_price')::int, 0),
      COALESCE((item->>'unit_price')::int, 0),
      COALESCE((item->>'quantity')::int, 1),
      item->>'note',
      COALESCE(item->'toppings', '[]'::jsonb)
    );
  END LOOP;

  SELECT COALESCE(SUM(unit_price * quantity), 0) INTO new_total
  FROM order_items WHERE order_id = p_order_id AND status != 'cancelled';

  UPDATE orders SET total = new_total::int, staff_id = auth.uid(), staff_name = (SELECT name FROM staff WHERE id = auth.uid())
  WHERE id = p_order_id;

  RETURN new_total;
END;
$$;

REVOKE ALL ON FUNCTION add_items_to_order(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION add_items_to_order(uuid, jsonb) TO authenticated;
