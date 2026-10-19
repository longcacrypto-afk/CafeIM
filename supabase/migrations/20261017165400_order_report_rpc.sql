/*
# Order detail report RPC

1. Functions
- `order_report(days int)` — SECURITY DEFINER returning one row per completed
  order with computed item count, so the report screen can list every order
  (id, table, payment, total, items, completed_at) without client-side joins.
  Rows are limited to the last `days` days.

2. Security
- Explicit revoke from anon; only authenticated + owner can execute.
*/

CREATE OR REPLACE FUNCTION order_report(days integer DEFAULT 7)
RETURNS TABLE (
  order_id uuid,
  table_name text,
  payment_method text,
  total integer,
  item_count integer,
  item_summary text,
  completed_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.table_name, o.payment_method, o.total,
         COALESCE(SUM(oi.quantity), 0)::integer,
         string_agg(oi.product_name || ' x' || oi.quantity, ', ' ORDER BY oi.created_at),
         o.completed_at
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.status = 'completed'
    AND o.completed_at >= now() - (days || ' days')::interval
  GROUP BY o.id
  ORDER BY o.completed_at DESC;
$$;

REVOKE ALL ON FUNCTION order_report(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION order_report(integer) TO authenticated;
