/*
# Phase 10: Move individual order items between orders

## What changed
New function `move_order_item(p_item_id, p_target_order_id)` that transfers a
single order_item from its current order to another open order, then recomputes
the total on both the source and target orders.

## Security
- SECURITY DEFINER so any authenticated staff can perform the transfer.
- Rejects if either order is not open (pending/brewing/ready).
- Rejects if the item is already cancelled or completed.
- Recomputes totals from surviving non-cancelled items on each order.

## Notes
- The item keeps its product_id, price, toppings, note — only order_id changes.
- If the source order has no remaining items, its total becomes 0 but the order
  stays open (staff can add items or close it manually).
*/

CREATE OR REPLACE FUNCTION move_order_item(p_item_id uuid, p_target_order_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_source_order_id uuid;
  v_source_status text;
  v_target_status text;
  v_item_status text;
  v_source_total numeric;
  v_target_total numeric;
BEGIN
  SELECT order_id, status INTO v_source_order_id, v_item_status
  FROM order_items WHERE id = p_item_id;
  IF v_source_order_id IS NULL THEN
    RAISE EXCEPTION 'item not found';
  END IF;
  IF v_item_status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'item is not movable';
  END IF;
  IF v_source_order_id = p_target_order_id THEN
    RAISE EXCEPTION 'source and target are the same order';
  END IF;

  SELECT status INTO v_source_status FROM orders WHERE id = v_source_order_id;
  SELECT status INTO v_target_status FROM orders WHERE id = p_target_order_id;
  IF v_source_status NOT IN ('pending', 'brewing', 'ready') THEN
    RAISE EXCEPTION 'source order is closed';
  END IF;
  IF v_target_status NOT IN ('pending', 'brewing', 'ready') THEN
    RAISE EXCEPTION 'target order is closed';
  END IF;

  UPDATE order_items SET order_id = p_target_order_id WHERE id = p_item_id;

  SELECT COALESCE(SUM(unit_price * quantity), 0) INTO v_source_total
  FROM order_items WHERE order_id = v_source_order_id AND status != 'cancelled';

  SELECT COALESCE(SUM(unit_price * quantity), 0) INTO v_target_total
  FROM order_items WHERE order_id = p_target_order_id AND status != 'cancelled';

  UPDATE orders SET total = v_source_total::int WHERE id = v_source_order_id;
  UPDATE orders SET total = v_target_total::int WHERE id = p_target_order_id;
END;
$$;

REVOKE ALL ON FUNCTION move_order_item(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION move_order_item(uuid, uuid) TO authenticated;