-- Allow deleting books that have borrowing transaction history
-- (was ON DELETE RESTRICT, now CASCADE so transactions are removed with the book)

ALTER TABLE borrowing_transactions
  DROP CONSTRAINT borrowing_transactions_book_id_fkey,
  ADD CONSTRAINT borrowing_transactions_book_id_fkey
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;
