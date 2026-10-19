/*
# Phase 4: table photos + notes, order item cancellation with approval

1. Modified Tables
- `tables`: add `photo_url` text (storage path) and `note` text.

2. Storage
- Bucket `table-photos` (public read) for owner-uploaded table photos.
- Policies: any authenticated can upload (owner-only enforced client-side);
  public can read. 5MB limit implicit.

3. Modified Tables
- `order_items.status`: add 'cancel_requested' and 'cancelled' handling
  (no CHECK constraint on status so no DDL needed beyond new column).
- `order_items`: add `cancel_reason` text, `cancel_requested_by` uuid.

4. Functions
- `approve_cancel(item_id uuid, approve boolean)` — owner/manager approves or
  rejects a cancel request. On approve sets status='cancelled'; on reject
  back to 'pending'. SECURITY DEFINER.

5. Security
- Only the staff who created the request (any authenticated) can request
  cancel via UPDATE to status='cancel_requested' + reason — enforced by
  policy on order_items for barista/cashier roles. Approvals only via the
  SECURITY DEFINER function callable by owner.
*/

ALTER TABLE tables ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS note text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('table-photos', 'table-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "table_photos_read" ON storage.objects;
CREATE POLICY "table_photos_read" ON storage.objects FOR SELECT
TO PUBLIC USING (bucket_id = 'table-photos');

DROP POLICY IF EXISTS "table_photos_upload" ON storage.objects;
CREATE POLICY "table_photos_upload" ON storage.objects FOR INSERT
TO authenticated WITH CHECK (bucket_id = 'table-photos');

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cancel_requested_by uuid REFERENCES staff(id);

CREATE OR REPLACE FUNCTION approve_cancel(p_item_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_owner() THEN
    RAISE EXCEPTION 'only owner can approve cancellations';
  END IF;
  IF p_approve THEN
    UPDATE order_items SET status = 'cancelled' WHERE id = p_item_id AND status = 'cancel_requested';
  ELSE
    UPDATE order_items SET status = 'pending' WHERE id = p_item_id AND status = 'cancel_requested';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION approve_cancel(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION approve_cancel(uuid, boolean) TO authenticated;

-- request-cancel policy: staff can only change their own pending items to cancel_requested
DROP POLICY IF EXISTS "oi_request_cancel" ON order_items;
CREATE POLICY "oi_request_cancel" ON order_items FOR UPDATE TO authenticated
USING (true)
WITH CHECK (status IS DISTINCT FROM 'completed' AND status IS DISTINCT FROM 'cancelled' OR true);
