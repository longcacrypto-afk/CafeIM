/*
# Phase 9: Discounts on orders

## What changed
Adds discount support to orders — either a fixed VND amount or a percentage.

### New Columns on `orders`
- `discount_type` text: 'none' | 'amount' | 'percent' (default 'none')
- `discount_value` int: the raw input — VND amount or percentage points (default 0)
- `discount_amount` int: the computed discount in VND, stored for reporting (default 0)

### Security
No new policies needed — existing order INSERT/UPDATE policies cover the new columns.
Staff can apply discounts at order creation and payment time. The `total` column
already stores the final total after discount; `discount_amount` is for audit/reporting.

### Notes
- `total` remains the amount the customer pays (after discount).
- When discount_type = 'amount': discount_amount = min(discount_value, subtotal)
- When discount_type = 'percent': discount_amount = round(subtotal * discount_value / 100)
- The close_shift function already sums `orders.total`, so discounted orders are
  automatically reflected in shift revenue.
*/

ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'none';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_value int NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount int NOT NULL DEFAULT 0;