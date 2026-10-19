/*
# Phase 11: Add discount_amount to order_report RPC

## What changed
The `order_report` function now returns `discount_amount` per order so the
Reports screen can show a discount column and total.

## Security
No new policies needed — the RPC is already accessible to authenticated users.
*/

DROP FUNCTION IF EXISTS order_report(int);

CREATE FUNCTION order_report(days int)
RETURNS TABLE (
  order_id uuid,
  table_name text,
  payment_method text,
  total int,
  discount_amount int,
  item_count bigint,
  item_summary text,
  completed_at timestamptz,
  staff_name text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.table_name,
    o.payment_method,
    o.total,
    o.discount_amount,
    COUNT(oi.id),
    STRING_AGG(oi.product_name || ' x' || oi.quantity::text, ', ' ORDER BY oi.created_at),
    o.completed_at,
    o.staff_name
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id AND oi.status != 'cancelled'
  WHERE o.status = 'completed'
    AND o.completed_at >= NOW() - (days || ' days')::interval
  GROUP BY o.id, o.table_name, o.payment_method, o.total, o.discount_amount, o.completed_at, o.staff_name
  ORDER BY o.completed_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION order_report(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION order_report(int) TO authenticated;