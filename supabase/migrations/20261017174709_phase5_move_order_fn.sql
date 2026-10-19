/*
# Phase 5: merge/move orders between tables

1. Functions
- `move_order(p_order_id uuid, p_target_table text)` — moves an open order to
  another table (or 'Mang về'). Any authenticated staff can move; only open
  orders (pending/brewing/ready) can move. SECURITY DEFINER so staff without
  direct UPDATE rights on orders can still reseat guests.

2. Security
- Revoke from PUBLIC/anon, grant execute to authenticated.
*/

CREATE OR REPLACE FUNCTION move_order(p_order_id uuid, p_target_table text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  status_text text;
BEGIN
  SELECT status INTO status_text FROM orders WHERE id = p_order_id;
  IF status_text IS NULL THEN
    RAISE EXCEPTION 'order not found';
  END IF;
  IF status_text NOT IN ('pending', 'brewing', 'ready') THEN
    RAISE EXCEPTION 'only open orders can be moved';
  END IF;
  IF p_target_table IS NULL OR btrim(p_target_table) = '' THEN
    RAISE EXCEPTION 'target table required';
  END IF;
  UPDATE orders SET table_name = btrim(p_target_table) WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION move_order(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION move_order(uuid, text) TO authenticated;
