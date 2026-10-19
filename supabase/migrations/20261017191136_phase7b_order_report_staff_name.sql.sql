-- Expose staff attribution in the order report so the owner can filter by staff.
DROP FUNCTION order_report(integer);

CREATE FUNCTION order_report(days integer DEFAULT 7)
RETURNS TABLE (
  order_id uuid,
  table_name text,
  payment_method text,
  total integer,
  item_count integer,
  item_summary text,
  completed_at timestamptz,
  staff_name text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.table_name, o.payment_method, o.total,
         COALESCE(SUM(oi.quantity), 0)::integer,
         string_agg(oi.product_name || ' x' || oi.quantity, ', ' ORDER BY oi.created_at),
         o.completed_at,
         o.staff_name
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id AND oi.status <> 'cancelled'
  WHERE o.status = 'completed'
    AND o.completed_at >= now() - (days || ' days')::interval
  GROUP BY o.id
  ORDER BY o.completed_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION order_report(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION order_report(integer) TO authenticated;