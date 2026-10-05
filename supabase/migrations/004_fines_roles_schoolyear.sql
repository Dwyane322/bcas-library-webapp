-- ============================================================
-- BCAS Library Management System - Fines, Roles, School Year
-- ============================================================

-- ENUM TYPES
CREATE TYPE staff_role AS ENUM ('Admin', 'Librarian', 'Staff');

-- ============================================================
-- 1. FINE SETTINGS
-- ============================================================
CREATE TABLE fine_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fine_rate_per_day DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  max_fine DECIMAL(10,2) NOT NULL DEFAULT 500.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default fine settings
INSERT INTO fine_settings (fine_rate_per_day, max_fine) VALUES (5.00, 500.00);

-- ============================================================
-- 2. SCHOOL YEARS
-- ============================================================
CREATE TABLE school_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert current school year
INSERT INTO school_years (name, start_date, end_date, is_active) 
VALUES ('2025-2026', '2025-06-01', '2026-05-31', true);

-- ============================================================
-- 3. STAFF TABLE (User Roles)
-- ============================================================
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role staff_role NOT NULL DEFAULT 'Staff',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default admin (using env vars for credentials)
INSERT INTO staff (staff_id, name, role) 
VALUES ('admin', 'System Administrator', 'Admin');

-- ============================================================
-- 4. UPDATE STUDENTS TABLE
-- ============================================================

-- Add new columns for OASIS import
ALTER TABLE students 
  ADD COLUMN student_number TEXT UNIQUE,
  ADD COLUMN first_name TEXT,
  ADD COLUMN last_name TEXT,
  ADD COLUMN middle_name TEXT,
  ADD COLUMN grade_level TEXT,
  ADD COLUMN program TEXT;

-- ============================================================
-- 5. UPDATE BORROWING TRANSACTIONS
-- ============================================================

-- Add fine fields
ALTER TABLE borrowing_transactions 
  ADD COLUMN fine_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN fine_paid BOOLEAN DEFAULT false;

-- Add school year reference
ALTER TABLE borrowing_transactions 
  ADD COLUMN school_year_id UUID REFERENCES school_years(id);

-- ============================================================
-- 6. HELPER FUNCTIONS
-- ============================================================

-- Function: Calculate fine for a transaction
CREATE OR REPLACE FUNCTION calculate_fine(p_transaction_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_due_date TIMESTAMPTZ;
  v_date_returned TIMESTAMPTZ;
  v_days_overdue INT;
  v_fine_rate DECIMAL(10,2);
  v_max_fine DECIMAL(10,2);
  v_fine DECIMAL(10,2);
BEGIN
  -- Get transaction details
  SELECT due_date, date_returned 
  INTO v_due_date, v_date_returned
  FROM borrowing_transactions 
  WHERE id = p_transaction_id;

  -- Get fine settings
  SELECT fine_rate_per_day, max_fine 
  INTO v_fine_rate, v_max_fine
  FROM fine_settings 
  LIMIT 1;

  -- Calculate days overdue
  IF v_date_returned IS NULL THEN
    v_days_overdue := EXTRACT(DAY FROM now() - v_due_date)::INT;
  ELSE
    v_days_overdue := EXTRACT(DAY FROM v_date_returned - v_due_date)::INT;
  END IF;

  -- Calculate fine (only if overdue)
  IF v_days_overdue > 0 THEN
    v_fine := v_days_overdue * v_fine_rate;
    v_fine := LEAST(v_fine, v_max_fine);
  ELSE
    v_fine := 0;
  END IF;

  RETURN v_fine;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Auto-assign school year to new transactions
CREATE OR REPLACE FUNCTION assign_school_year()
RETURNS TRIGGER AS $$
BEGIN
  NEW.school_year_id := (
    SELECT id FROM school_years 
    WHERE is_active = true 
    LIMIT 1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Set active school year (only one can be active)
CREATE OR REPLACE FUNCTION set_active_school_year(p_school_year_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE school_years SET is_active = false;
  UPDATE school_years SET is_active = true WHERE id = p_school_year_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get active school year
CREATE OR REPLACE FUNCTION get_active_school_year()
RETURNS UUID AS $$
  SELECT id FROM school_years WHERE is_active = true LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- 7. TRIGGERS
-- ============================================================

-- Trigger: Auto-assign school year to new transactions
CREATE TRIGGER trg_assign_school_year
  BEFORE INSERT ON borrowing_transactions
  FOR EACH ROW
  EXECUTE FUNCTION assign_school_year();

-- ============================================================
-- 8. VIEWS
-- ============================================================

-- View: Fine summary by student
CREATE VIEW student_fines AS
SELECT
  bt.student_id,
  s.name AS student_name,
  s.student_number,
  COUNT(bt.id) AS total_transactions,
  SUM(CASE WHEN bt.fine_amount > 0 THEN 1 ELSE 0 END) AS transactions_with_fines,
  SUM(bt.fine_amount) AS total_fines,
  SUM(CASE WHEN bt.fine_paid THEN bt.fine_amount ELSE 0 END) AS fines_paid,
  SUM(CASE WHEN NOT bt.fine_paid THEN bt.fine_amount ELSE 0 END) AS fines_pending
FROM borrowing_transactions bt
JOIN students s ON s.id = bt.student_id
GROUP BY bt.student_id, s.name, s.student_number;

-- View: School year circulation summary
CREATE VIEW school_year_summary AS
SELECT
  sy.id AS school_year_id,
  sy.name AS school_year_name,
  COUNT(bt.id) AS total_transactions,
  SUM(CASE WHEN bt.status = 'Active' THEN 1 ELSE 0 END) AS currently_borrowed,
  SUM(CASE WHEN bt.status = 'Returned' THEN 1 ELSE 0 END) AS returned,
  SUM(CASE WHEN bt.status = 'Overdue' THEN 1 ELSE 0 END) AS overdue,
  SUM(bt.fine_amount) AS total_fines,
  SUM(CASE WHEN bt.fine_paid THEN bt.fine_amount ELSE 0 END) AS fines_collected
FROM school_years sy
LEFT JOIN borrowing_transactions bt ON bt.school_year_id = sy.id
GROUP BY sy.id, sy.name;

-- ============================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE fine_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Fine settings
CREATE POLICY "Staff can read fine_settings"
  ON fine_settings FOR SELECT USING (true);

CREATE POLICY "Staff can manage fine_settings"
  ON fine_settings FOR UPDATE USING (true);

-- School years
CREATE POLICY "Staff can read school_years"
  ON school_years FOR SELECT USING (true);

CREATE POLICY "Staff can manage school_years"
  ON school_years FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update school_years"
  ON school_years FOR UPDATE USING (true);

CREATE POLICY "Staff can delete school_years"
  ON school_years FOR DELETE USING (true);

-- Staff can read and manage staff table
CREATE POLICY "Staff can read staff"
  ON staff FOR SELECT USING (true);

CREATE POLICY "Staff can insert staff"
  ON staff FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update staff"
  ON staff FOR UPDATE USING (true);

CREATE POLICY "Staff can delete staff"
  ON staff FOR DELETE USING (true);
