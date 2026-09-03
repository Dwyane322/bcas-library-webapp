-- ============================================================
-- BCAS Library Management System - Database Schema
-- Run this in Supabase SQL Editor or via CLI
-- ============================================================

-- ENUM TYPES
CREATE TYPE book_status AS ENUM ('Available', 'Borrowed', 'Lost', 'Damaged');
CREATE TYPE material_type AS ENUM ('Book', 'Non-Book');
CREATE TYPE borrow_status AS ENUM ('Active', 'Returned', 'Overdue');

-- ============================================================
-- 1. CLASSIFICATIONS
-- ============================================================
CREATE TABLE classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO classifications (name) VALUES
  ('Applied Science'),
  ('Computer Science, Information & General Works'),
  ('Literature'),
  ('Arts & Recreation'),
  ('History and Geography'),
  ('Philosophy and Psychology'),
  ('Social Sciences'),
  ('Religion'),
  ('Language'),
  ('Natural Sciences & Mathematics');

-- ============================================================
-- 2. STUDENTS
-- ============================================================
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  section TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. BOOKS / MATERIALS
-- ============================================================
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  accession_number TEXT NOT NULL UNIQUE,
  classification_id UUID NOT NULL REFERENCES classifications(id) ON DELETE RESTRICT,
  shelf_location TEXT,
  material_type material_type NOT NULL DEFAULT 'Book',
  status book_status NOT NULL DEFAULT 'Available',
  is_library_use_only BOOLEAN NOT NULL DEFAULT false,
  qr_code TEXT UNIQUE,
  barcode TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_books_classification ON books(classification_id);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_accession ON books(accession_number);
CREATE INDEX idx_books_barcode ON books(barcode);
CREATE INDEX idx_books_qr_code ON books(qr_code);

-- ============================================================
-- 4. BORROWING TRANSACTIONS
-- ============================================================
CREATE TABLE borrowing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  date_borrowed TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_returned TIMESTAMPTZ,
  due_date TIMESTAMPTZ NOT NULL,
  status borrow_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_student ON borrowing_transactions(student_id);
CREATE INDEX idx_transactions_book ON borrowing_transactions(book_id);
CREATE INDEX idx_transactions_status ON borrowing_transactions(status);
CREATE INDEX idx_transactions_due_date ON borrowing_transactions(due_date);

-- ============================================================
-- 5. LIBRARY VISITS
-- ============================================================
CREATE TABLE library_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visits_student ON library_visits(student_id);
CREATE INDEX idx_visits_date ON library_visits(visited_at);

-- ============================================================
-- 6. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_student ON notifications(student_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- ============================================================
-- 7. HELPER FUNCTIONS
-- ============================================================

-- Function: Get current borrow count for a student
CREATE OR REPLACE FUNCTION get_student_borrow_count(p_student_id UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM borrowing_transactions
  WHERE student_id = p_student_id
    AND status = 'Active';
$$ LANGUAGE sql STABLE;

-- Function: Check if student can borrow (max 2 active borrows)
CREATE OR REPLACE FUNCTION can_student_borrow(p_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT get_student_borrow_count(p_student_id) < 2;
$$ LANGUAGE sql STABLE;

-- Function: Check if a book is borrowable
CREATE OR REPLACE FUNCTION is_book_borrowable(p_book_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    b.status = 'Available'
    AND b.is_library_use_only = false
  FROM books b
  WHERE b.id = p_book_id;
$$ LANGUAGE sql STABLE;

-- Function: Auto-update book status after borrow
CREATE OR REPLACE FUNCTION handle_borrow()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE books SET status = 'Borrowed', updated_at = now()
  WHERE id = NEW.book_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-update book status after return
CREATE OR REPLACE FUNCTION handle_return()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Returned' AND OLD.status = 'Active' THEN
    UPDATE books SET status = 'Available', updated_at = now()
    WHERE id = NEW.book_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-detect and update overdue transactions
CREATE OR REPLACE FUNCTION update_overdue_status()
RETURNS void AS $$
BEGIN
  UPDATE borrowing_transactions
  SET status = 'Overdue'
  WHERE status = 'Active'
    AND due_date < now();

  -- Create notifications for newly overdue books
  INSERT INTO notifications (student_id, book_id, message)
  SELECT
    bt.student_id,
    bt.book_id,
    'Overdue: "' || b.title || '" is past its due date.'
  FROM borrowing_transactions bt
  JOIN books b ON b.id = bt.book_id
  WHERE bt.status = 'Overdue'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.student_id = bt.student_id
        AND n.book_id = bt.book_id
        AND n.message LIKE 'Overdue:%'
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-update book status on borrow
CREATE TRIGGER trg_handle_borrow
  AFTER INSERT ON borrowing_transactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_borrow();

-- Trigger: auto-update book status on return
CREATE TRIGGER trg_handle_return
  AFTER UPDATE ON borrowing_transactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_return();

-- ============================================================
-- 8. VIEWS (Dashboard queries)
-- ============================================================

-- View: Active overdue books with student info
CREATE VIEW overdue_books AS
SELECT
  bt.id AS transaction_id,
  bt.student_id,
  s.name AS student_name,
  s.section AS student_section,
  bt.book_id,
  b.title AS book_title,
  b.author AS book_author,
  b.accession_number,
  b.classification_id,
  c.name AS classification_name,
  bt.date_borrowed,
  bt.due_date,
  EXTRACT(DAY FROM now() - bt.due_date)::INT AS days_overdue
FROM borrowing_transactions bt
JOIN students s ON s.id = bt.student_id
JOIN books b ON b.id = bt.book_id
JOIN classifications c ON c.id = b.classification_id
WHERE bt.status IN ('Active', 'Overdue')
  AND bt.due_date < now()
ORDER BY bt.due_date ASC;

-- View: Dashboard circulation stats
CREATE VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*)::INT FROM borrowing_transactions WHERE status = 'Active') AS total_borrowed,
  (SELECT COUNT(*)::INT FROM borrowing_transactions WHERE status = 'Returned') AS total_returned,
  (SELECT COUNT(*)::INT FROM overdue_books) AS total_overdue;

-- View: Circulation activity by classification
CREATE VIEW circulation_by_classification AS
SELECT
  c.name AS classification_name,
  COUNT(bt.id) AS total_transactions,
  SUM(CASE WHEN bt.status IN ('Active', 'Overdue') THEN 1 ELSE 0 END) AS currently_borrowed,
  SUM(CASE WHEN bt.status = 'Returned' THEN 1 ELSE 0 END) AS returned
FROM borrowing_transactions bt
JOIN books b ON b.id = bt.book_id
JOIN classifications c ON c.id = b.classification_id
GROUP BY c.name
ORDER BY total_transactions DESC;

-- View: Most borrowed books
CREATE VIEW most_borrowed_books AS
SELECT
  b.id,
  b.title,
  b.author,
  c.name AS classification_name,
  COUNT(bt.id) AS borrow_count,
  b.status AS current_status
FROM books b
JOIN classifications c ON c.id = b.classification_id
LEFT JOIN borrowing_transactions bt ON bt.book_id = b.id
GROUP BY b.id, b.title, b.author, c.name, b.status
ORDER BY borrow_count DESC;

-- View: Active users ranking
CREATE VIEW active_users AS
SELECT
  s.id,
  s.name,
  s.section,
  (SELECT COUNT(*) FROM library_visits lv WHERE lv.student_id = s.id) AS total_visits,
  (SELECT COUNT(*) FROM borrowing_transactions bt WHERE bt.student_id = s.id) AS total_borrowed
FROM students s
ORDER BY total_visits DESC, total_borrowed DESC;

-- ============================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- Enable RLS on all tables. Policies below allow
-- authenticated users full access (staff access).
-- Adjust for your auth model.
-- ============================================================

ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Staff (authenticated) can read everything
CREATE POLICY "Staff can read classifications"
  ON classifications FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can read students"
  ON students FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage students"
  ON students FOR ALL TO authenticated USING (true);

CREATE POLICY "Staff can manage books"
  ON books FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow anon insert books"
  ON books FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update books"
  ON books FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anon delete books"
  ON books FOR DELETE TO anon USING (true);

CREATE POLICY "Staff can manage transactions"
  ON borrowing_transactions FOR ALL TO authenticated USING (true);

CREATE POLICY "Staff can manage visits"
  ON library_visits FOR ALL TO authenticated USING (true);

CREATE POLICY "Staff can manage notifications"
  ON notifications FOR ALL TO authenticated USING (true);

-- Allow anonymous read access for testing (remove in production)
CREATE POLICY "Allow anon read classifications"
  ON classifications FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read books"
  ON books FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read students"
  ON students FOR SELECT TO anon USING (true);
