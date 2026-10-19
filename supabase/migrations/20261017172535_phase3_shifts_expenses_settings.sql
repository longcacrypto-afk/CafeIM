/*
# Phase 3: shifts, expenses, cafe settings

1. New Tables
- `shifts` — work shifts: who opened, opening cash, closing cash, computed
  totals at close (revenue by payment method, order count), difference.
  Closed shifts are immutable (no update policy once closed — enforced via
  trigger rejecting updates on closed rows).
- `expenses` — non-ingredient expenses (rent, electricity, salary...) per shift.
- `cafe_settings` — single-row store config (name, address, hotline,
  receipt footer, telegram chat ids).

2. Functions
- `open_shift(opening_cash numeric)` — opens a shift for current staff; fails
  if one is already open. SECURITY DEFINER.
- `close_shift(counted_cash numeric)` — closes current shift: computes revenue
  by payment method + order count from orders completed during the shift,
  records difference, returns the summary. SECURITY DEFINER.

3. Security
- RLS on all tables; authenticated can read own shifts, owner reads all.
- Immutable closed shifts: trigger blocks UPDATE/DELETE on closed rows.
*/

CREATE TABLE IF NOT EXISTS cafe_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name text NOT NULL DEFAULT 'Quán Sáng Tạo',
  address text NOT NULL DEFAULT '',
  hotline text NOT NULL DEFAULT '',
  receipt_footer text NOT NULL DEFAULT 'Cảm ơn quý khách!',
  telegram_chat_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO cafe_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE cafe_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_read" ON cafe_settings;
CREATE POLICY "settings_read" ON cafe_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "settings_update" ON cafe_settings;
CREATE POLICY "settings_update" ON cafe_settings FOR UPDATE TO authenticated USING (is_owner()) WITH CHECK (is_owner());

CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id),
  staff_name text NOT NULL,
  opening_cash numeric NOT NULL DEFAULT 0,
  closing_cash numeric,
  counted_cash numeric,
  difference numeric,
  revenue_cash numeric NOT NULL DEFAULT 0,
  revenue_transfer numeric NOT NULL DEFAULT 0,
  revenue_card numeric NOT NULL DEFAULT 0,
  order_count integer NOT NULL DEFAULT 0,
  item_count integer NOT NULL DEFAULT 0,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS shifts_opened_at_idx ON shifts (opened_at DESC);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shifts_read" ON shifts;
CREATE POLICY "shifts_read" ON shifts FOR SELECT TO authenticated
  USING (is_owner() OR staff_id = auth.uid());
DROP POLICY IF EXISTS "shifts_insert" ON shifts;
CREATE POLICY "shifts_insert" ON shifts FOR INSERT TO authenticated
  WITH CHECK (staff_id = auth.uid());

-- closed shifts are immutable
CREATE OR REPLACE FUNCTION guard_closed_shift() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.closed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'closed shifts are immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS shifts_immutable ON shifts;
CREATE TRIGGER shifts_immutable
BEFORE UPDATE OR DELETE ON shifts
FOR EACH ROW EXECUTE FUNCTION guard_closed_shift();

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  title text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expenses_read" ON expenses;
CREATE POLICY "expenses_read" ON expenses FOR SELECT TO authenticated USING (is_owner());
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated
  WITH CHECK (staff_id = auth.uid() OR is_owner());
DROP POLICY IF EXISTS "expenses_delete" ON expenses;
CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO authenticated USING (is_owner());

-- open_shift: one open shift per staff
CREATE OR REPLACE FUNCTION open_shift(p_opening_cash numeric)
RETURNS shifts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing shifts;
  staff_row staff;
BEGIN
  SELECT * INTO staff_row FROM staff WHERE id = auth.uid();
  IF staff_row.id IS NULL THEN
    RAISE EXCEPTION 'staff profile not found';
  END IF;
  SELECT * INTO existing FROM shifts
  WHERE staff_id = auth.uid() AND closed_at IS NULL
  ORDER BY opened_at DESC LIMIT 1;
  IF existing.id IS NOT NULL THEN
    RAISE EXCEPTION 'shift already open';
  END IF;
  RETURN NULL;
END;
$$;

-- actual opener that inserts (separate to keep the guard simple)
CREATE OR REPLACE FUNCTION open_shift_insert(p_opening_cash numeric)
RETURNS shifts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  staff_row staff;
  created shifts;
BEGIN
  SELECT * INTO staff_row FROM staff WHERE id = auth.uid();
  IF staff_row.id IS NULL THEN
    RAISE EXCEPTION 'staff profile not found';
  END IF;
  IF EXISTS (SELECT 1 FROM shifts WHERE staff_id = auth.uid() AND closed_at IS NULL) THEN
    RAISE EXCEPTION 'shift already open';
  END IF;
  INSERT INTO shifts (staff_id, staff_name, opening_cash)
  VALUES (auth.uid(), staff_row.name, GREATEST(0, p_opening_cash))
  RETURNING * INTO created;
  RETURN created;
END;
$$;

CREATE OR REPLACE FUNCTION close_shift(p_counted_cash numeric)
RETURNS shifts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  open_shift_row shifts;
  rev_cash numeric := 0;
  rev_transfer numeric := 0;
  rev_card numeric := 0;
  ord_count integer := 0;
  itm_count integer := 0;
  closed shifts;
BEGIN
  SELECT * INTO open_shift_row FROM shifts
  WHERE staff_id = auth.uid() AND closed_at IS NULL
  ORDER BY opened_at DESC LIMIT 1
  FOR UPDATE;
  IF open_shift_row.id IS NULL THEN
    RAISE EXCEPTION 'no open shift';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN o.payment_method = 'cash' THEN o.total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN o.payment_method = 'transfer' THEN o.total ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN o.payment_method = 'card' THEN o.total ELSE 0 END), 0),
    COUNT(DISTINCT o.id),
    COALESCE(SUM(oi.quantity), 0)
  INTO rev_cash, rev_transfer, rev_card, ord_count, itm_count
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  WHERE o.status = 'completed'
    AND o.completed_at >= open_shift_row.opened_at
    AND o.completed_at <= now();

  UPDATE shifts SET
    closed_at = now(),
    counted_cash = GREATEST(0, p_counted_cash),
    closing_cash = open_shift_row.opening_cash + rev_cash,
    difference = GREATEST(0, p_counted_cash) - (open_shift_row.opening_cash + rev_cash),
    revenue_cash = rev_cash,
    revenue_transfer = rev_transfer,
    revenue_card = rev_card,
    order_count = ord_count,
    item_count = itm_count
  WHERE id = open_shift_row.id
  RETURNING * INTO closed;

  RETURN closed;
END;
$$;

REVOKE ALL ON FUNCTION open_shift_insert(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION open_shift_insert(numeric) TO authenticated;
REVOKE ALL ON FUNCTION close_shift(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION close_shift(numeric) TO authenticated;
DROP FUNCTION IF EXISTS open_shift(numeric);
