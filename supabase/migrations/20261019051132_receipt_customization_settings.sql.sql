/*
# Receipt customization columns for cafe_settings

1. Plain-English explanation
- Lets the cafe owner customize how printed receipts look: paper width (58mm/80mm), footer note,
  whether to print the store address, hotline, QR code (for reviews/payment link), and a header slogan.
- Also adds a "bank account" line so shops that accept bank transfer can print account info on the bill.

2. Modified tables
- `cafe_settings`: adds 6 new columns (all nullable text/boolean, safe defaults):
  - `receipt_width` (text, default '80'): paper width preset, '58' or '80'
  - `receipt_show_address` (boolean, default true): print store address
  - `receipt_show_hotline` (boolean, default true): print hotline
  - `receipt_show_qr` (boolean, default false): print QR code at bottom
  - `receipt_qr_data` (text, nullable): URL/text encoded in the printed QR (e.g. review page, payment link)
  - `receipt_bank_info` (text, nullable): bank account line printed on receipts

3. Security
- No RLS changes; `cafe_settings` keeps its existing policies (single row id=1, read/write by staff).

4. Important notes
- Idempotent: uses IF NOT EXISTS so it can be re-run safely.
- No data is removed or modified.
*/

ALTER TABLE cafe_settings ADD COLUMN IF NOT EXISTS receipt_width text NOT NULL DEFAULT '80';
ALTER TABLE cafe_settings ADD COLUMN IF NOT EXISTS receipt_show_address boolean NOT NULL DEFAULT true;
ALTER TABLE cafe_settings ADD COLUMN IF NOT EXISTS receipt_show_hotline boolean NOT NULL DEFAULT true;
ALTER TABLE cafe_settings ADD COLUMN IF NOT EXISTS receipt_show_qr boolean NOT NULL DEFAULT false;
ALTER TABLE cafe_settings ADD COLUMN IF NOT EXISTS receipt_qr_data text;
ALTER TABLE cafe_settings ADD COLUMN IF NOT EXISTS receipt_bank_info text;
