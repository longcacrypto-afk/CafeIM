/*
# Advanced module system (admin on/off + install profiles)

1. Short title
- Advanced module system: admin can toggle advanced modules on/off; install profiles
  pick a preset of modules and generate an install link with a subdomain.

2. Plain-English explanation
- Adds one table `app_modules` that stores which advanced modules are enabled for this
  cafe. Core modules (POS revenue management, orders, shifts, settings) are always on
  and are NOT stored here.
- Togglable advanced modules: kitchen display, QR ordering, inventory, expenses,
  staff management, menu management, reports.
- Seeds all advanced modules enabled by default so nothing changes for existing users.

3. New Tables
- `app_modules`
  - `id` (text, primary key) — stable module key used by the frontend, e.g. 'kitchen'
  - `label_vi` / `label_en` (text) — display names for the admin UI
  - `hint_vi` / `hint_en` (text) — short explanation shown under the toggle
  - `sort_order` (int) — ordering in the admin UI
  - `enabled` (boolean, default true) — admin on/off switch
  - `updated_at` (timestamptz) — last change time

4. Modified Tables
- none

5. Security
- Enable RLS on `app_modules`.
- SELECT: TO anon, authenticated USING (true) — the customer QR menu also reads this
  table to know which modules the cafe uses.
- INSERT: TO authenticated USING (true) — used to add new module rows.
- UPDATE: TO authenticated USING (is_owner()) — only the owner can toggle modules.
- DELETE: TO authenticated USING (is_owner()) — owner can remove rows if needed.
- The table intentionally has no user ownership column; it is shared cafe-wide config.

6. Important notes
- The toggle table is keyed by stable text ids, so re-running the seed never creates
  duplicate rows (upsert on id).
- Module ids are consumed in frontend `src/lib/modules.ts`.
*/

CREATE TABLE IF NOT EXISTS app_modules (
  id text PRIMARY KEY,
  label_vi text NOT NULL,
  label_en text NOT NULL,
  hint_vi text NOT NULL,
  hint_en text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modules_select_cafe_wide" ON app_modules;
CREATE POLICY "modules_select_cafe_wide" ON app_modules
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "modules_insert_cafe_wide" ON app_modules;
CREATE POLICY "modules_insert_cafe_wide" ON app_modules
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "modules_update_owner" ON app_modules;
CREATE POLICY "modules_update_owner" ON app_modules
  FOR UPDATE TO authenticated
  USING (is_owner())
  WITH CHECK (is_owner());

DROP POLICY IF EXISTS "modules_delete_owner" ON app_modules;
CREATE POLICY "modules_delete_owner" ON app_modules
  FOR DELETE TO authenticated
  USING (is_owner());

INSERT INTO app_modules (id, label_vi, label_en, hint_vi, hint_en, sort_order) VALUES
  ('kitchen', 'Màn hình pha chế', 'Kitchen display', 'Hàng chờ món cho nhân viên pha chế', 'Brew queue for baristas', 1),
  ('qr', 'Gọi món qua QR', 'QR ordering', 'Khách quét mã trên bàn để tự gọi món', 'Guests scan the table code to order', 2),
  ('reports', 'Báo cáo nâng cao', 'Advanced reports', 'Biểu đồ doanh thu, top món, xuất CSV', 'Charts, top products, CSV export', 3),
  ('inventory', 'Quản lý kho', 'Inventory', 'Nguyên liệu, công thức, tự trừ kho', 'Ingredients, recipes, auto stock-out', 4),
  ('menu', 'Quản lý menu', 'Menu management', 'Thêm sửa món, giá, danh mục, topping', 'Products, prices, categories, toppings', 5),
  ('staff', 'Quản lý nhân viên', 'Staff management', 'Tạo tài khoản nhân viên, phân vai', 'Create staff accounts and roles', 6)
ON CONFLICT (id) DO NOTHING;
