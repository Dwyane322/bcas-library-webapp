-- ============================================================
-- BCAS Library Management System - Audit trail + Delete archive
-- 005_activity_logs_archive.sql
--
-- 1. activity_logs: records every ADD / EDIT / DELETE / BORROW /
--    RETURN (plus RESTORE / PERMANENT_DELETE) together with the
--    staff member (id, name, role) who performed it.
-- 2. deleted_archive: stores a snapshot of every deleted record
--    so deletes can be reviewed, restored, or purged.
-- 3. borrowing_transactions.handled_by_*: who processed each
--    borrow / return (staff id, name, role).
-- ============================================================

-- ------------------------------------------------------------
-- 1. ACTIVITY LOGS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id TEXT,
  staff_name TEXT,
  staff_role staff_role,
  action TEXT NOT NULL CHECK (action IN ('ADD', 'EDIT', 'DELETE', 'BORROW', 'RETURN', 'RESTORE', 'PERMANENT_DELETE')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('book', 'transaction', 'student', 'staff', 'school_year', 'fine', 'archive')),
  entity_id TEXT,
  description TEXT NOT NULL DEFAULT '',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_staff ON activity_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type);

-- ------------------------------------------------------------
-- 2. DELETED ARCHIVE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deleted_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT 'book',
  entity_id TEXT,
  data JSONB,
  deleted_by_staff_id TEXT,
  deleted_by_name TEXT,
  deleted_by_role staff_role,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  restored BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_deleted_archive_entity ON deleted_archive(entity_type);
CREATE INDEX IF NOT EXISTS idx_deleted_archive_deleted_at ON deleted_archive(deleted_at DESC);

-- ------------------------------------------------------------
-- 3. WHO HANDLED EACH CIRCULATION TRANSACTION
-- ------------------------------------------------------------
ALTER TABLE borrowing_transactions
  ADD COLUMN IF NOT EXISTS handled_by_staff_id TEXT,
  ADD COLUMN IF NOT EXISTS handled_by_name TEXT,
  ADD COLUMN IF NOT EXISTS handled_by_role staff_role;

-- ------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (mirrors existing permissive policies)
-- ------------------------------------------------------------
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deleted_archive ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'Staff can read activity_logs'
  ) THEN
    CREATE POLICY "Staff can read activity_logs"
      ON activity_logs FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'Staff can insert activity_logs'
  ) THEN
    CREATE POLICY "Staff can insert activity_logs"
      ON activity_logs FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'Staff can delete activity_logs'
  ) THEN
    CREATE POLICY "Staff can delete activity_logs"
      ON activity_logs FOR DELETE USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'deleted_archive' AND policyname = 'Staff can read deleted_archive'
  ) THEN
    CREATE POLICY "Staff can read deleted_archive"
      ON deleted_archive FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'deleted_archive' AND policyname = 'Staff can insert deleted_archive'
  ) THEN
    CREATE POLICY "Staff can insert deleted_archive"
      ON deleted_archive FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'deleted_archive' AND policyname = 'Staff can update deleted_archive'
  ) THEN
    CREATE POLICY "Staff can update deleted_archive"
      ON deleted_archive FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'deleted_archive' AND policyname = 'Staff can delete deleted_archive'
  ) THEN
    CREATE POLICY "Staff can delete deleted_archive"
      ON deleted_archive FOR DELETE USING (true);
  END IF;
END
$$;
