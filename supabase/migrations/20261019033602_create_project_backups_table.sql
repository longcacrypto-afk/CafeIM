/*
# Create project_backups table

1. Purpose
- Stores compressed source-code backups of this project so they survive even if workspace files are lost.

2. New Table `project_backups`
- `id` (uuid, primary key)
- `filename` (text, not null) — name of the archive file
- `content_base64` (text, not null) — base64-encoded gzip tar of the source
- `size_bytes` (integer, not null) — original archive size
- `notes` (text) — summary of what was implemented at backup time
- `created_at` (timestamptz, default now())

3. Security
- RLS enabled.
- Intentionally app-managed single-tenant table: anon + authenticated can insert and read.
- No delete policy: backups are append-only to prevent accidental data loss.
*/

CREATE TABLE IF NOT EXISTS project_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  content_base64 text NOT NULL,
  size_bytes integer NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_project_backups" ON project_backups;
CREATE POLICY "read_project_backups" ON project_backups
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_project_backups" ON project_backups;
CREATE POLICY "insert_project_backups" ON project_backups
  FOR INSERT TO anon, authenticated WITH CHECK (true);
