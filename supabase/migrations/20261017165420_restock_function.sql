/*
# Restock function

1. Functions
- `restock_ingredient(p_id uuid, amount numeric)` — adds `amount` to an
  ingredient's stock and returns the updated row. SECURITY DEFINER so
  authenticated staff (owner UI) can restock without direct table write.

2. Security
- Revoke from PUBLIC/anon; grant execute to authenticated.
*/

CREATE OR REPLACE FUNCTION restock_ingredient(p_id uuid, amount numeric)
RETURNS ingredients
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  updated ingredients;
BEGIN
  IF amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;
  UPDATE ingredients SET stock = stock + amount WHERE id = p_id RETURNING * INTO updated;
  IF updated IS NULL THEN
    RAISE EXCEPTION 'ingredient not found';
  END IF;
  RETURN updated;
END;
$$;

REVOKE ALL ON FUNCTION restock_ingredient(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION restock_ingredient(uuid, numeric) TO authenticated;
