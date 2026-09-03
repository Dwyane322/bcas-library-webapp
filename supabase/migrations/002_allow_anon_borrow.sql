-- ============================================================
-- Allow anonymous (kiosk) users to borrow books:
-- create student records and borrowing transactions.
-- ============================================================

CREATE POLICY "Allow anon insert students"
  ON students FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon read transactions"
  ON borrowing_transactions FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert transactions"
  ON borrowing_transactions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update transactions"
  ON borrowing_transactions FOR UPDATE TO anon USING (true);
