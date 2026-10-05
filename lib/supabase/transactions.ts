import { createClient } from "@/utils/client";
import type { BorrowingTransaction, BorrowingTransactionWithDetails } from "@/lib/types";

const supabase = createClient();

// ── Read ──────────────────────────────────────────────────────

export async function getTransactions(): Promise<BorrowingTransactionWithDetails[]> {
  const { data, error } = await supabase
    .from("borrowing_transactions")
    .select(`
      *,
      students(id, name, section, student_number, first_name, last_name, middle_name, grade_level, program),
      books(*, classifications(id, name))
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getActiveTransactions(): Promise<BorrowingTransactionWithDetails[]> {
  const { data, error } = await supabase
    .from("borrowing_transactions")
    .select(`
      *,
      students(id, name, section, student_number, first_name, last_name, middle_name, grade_level, program),
      books(*, classifications(id, name))
    `)
    .eq("status", "Active")
    .order("due_date");

  if (error) throw error;
  return data ?? [];
}

export async function getStudentTransactions(studentId: string): Promise<BorrowingTransactionWithDetails[]> {
  const { data, error } = await supabase
    .from("borrowing_transactions")
    .select(`
      *,
      students(id, name, section, student_number, first_name, last_name, middle_name, grade_level, program),
      books(*, classifications(id, name))
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getTransactionById(id: string): Promise<BorrowingTransactionWithDetails | null> {
  const { data, error } = await supabase
    .from("borrowing_transactions")
    .select(`
      *,
      students(id, name, section, student_number, first_name, last_name, middle_name, grade_level, program),
      books(*, classifications(id, name))
    `)
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// ── Borrow Logic ──────────────────────────────────────────────

/** Get the number of books currently borrowed by a student */
export async function getStudentBorrowCount(studentId: string): Promise<number> {
  const { count, error } = await supabase
    .from("borrowing_transactions")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("status", "Active");

  if (error) throw error;
  return count ?? 0;
}

/** Check if a student can borrow (max 2 active borrows) */
export async function canStudentBorrow(studentId: string): Promise<boolean> {
  const count = await getStudentBorrowCount(studentId);
  return count < 2;
}

/** Borrow or return a book - finds student by student_number, checks for active transaction */
export async function borrowBook(
  studentNumber: string,
  bookId: string,
): Promise<BorrowingTransaction> {
  // Auto-return mode: no student number, just return the book directly
  if (!studentNumber.trim()) {
    const { data: activeTx, error: txError } = await supabase
      .from("borrowing_transactions")
      .select("id")
      .eq("book_id", bookId)
      .eq("status", "Active")
      .single();

    if (txError || !activeTx)
      throw new Error("No active borrow found for this book.");
    return returnBook(activeTx.id);
  }

  // 1. Find student by student_number (must exist in the system)
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, name")
    .eq("student_number", studentNumber.trim())
    .single();

  if (studentError || !student) {
    throw new Error(`Student with ID "${studentNumber.trim()}" is not registered in the system.`);
  }

  // 2. Check if student already has this book borrowed → return it
  const { data: existingTx } = await supabase
    .from("borrowing_transactions")
    .select("id")
    .eq("student_id", student.id)
    .eq("book_id", bookId)
    .eq("status", "Active")
    .single();

  if (existingTx) {
    return returnBook(existingTx.id);
  }

  // 3. Check student borrow limit
  const canBorrow = await canStudentBorrow(student.id);
  if (!canBorrow) {
    throw new Error("Student has reached the maximum borrowing limit of 2 books.");
  }

  // 4. Check book is available and borrowable
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .single();

  if (bookError || !book) throw new Error("Book not found.");
  if (book.status !== "Available") throw new Error("Book is not available.");
  if (book.is_library_use_only) throw new Error("This material is Library Use Only and cannot be borrowed.");

  // 5. Create the transaction (due in 5 days)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 5);

  const { data, error } = await supabase
    .from("borrowing_transactions")
    .insert({
      student_id: student.id,
      book_id: bookId,
      due_date: dueDate.toISOString(),
      status: "Active",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Return a book and calculate fine if overdue */
export async function returnBook(transactionId: string): Promise<BorrowingTransaction> {
  // First, calculate the fine
  const { data: transaction, error: fetchError } = await supabase
    .from("borrowing_transactions")
    .select("due_date")
    .eq("id", transactionId)
    .single();

  if (fetchError || !transaction) throw new Error("Transaction not found.");

  const dueDate = new Date(transaction.due_date);
  const now = new Date();
  const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Get fine rate from settings
  const { data: fineSettings } = await supabase
    .from("fine_settings")
    .select("fine_rate_per_day, max_fine")
    .limit(1)
    .single();

  const fineRate = fineSettings?.fine_rate_per_day ?? 5;
  const maxFine = fineSettings?.max_fine ?? 500;
  const fineAmount = Math.min(daysOverdue * fineRate, maxFine);

  // Update the transaction with return date and fine
  const { data, error } = await supabase
    .from("borrowing_transactions")
    .update({
      status: "Returned",
      date_returned: now.toISOString(),
      fine_amount: fineAmount,
    })
    .eq("id", transactionId)
    .eq("status", "Active")
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Overdue ───────────────────────────────────────────────────

/** Manually trigger overdue status update (also runs via cron/trigger) */
export async function updateOverdueStatus(): Promise<void> {
  const { error } = await supabase.rpc("update_overdue_status");
  if (error) throw error;
}

/** Get overdue transactions */
export async function getOverdueTransactions(): Promise<BorrowingTransactionWithDetails[]> {
  const { data, error } = await supabase
    .from("borrowing_transactions")
    .select(`
      *,
      students(id, name, section, student_number, first_name, last_name, middle_name, grade_level, program),
      books(*, classifications(id, name))
    `)
    .in("status", ["Active", "Overdue"])
    .lt("due_date", new Date().toISOString())
    .order("due_date");

  if (error) throw error;
  return data ?? [];
}

// ── Fine Helpers ──────────────────────────────────────────────

/** Calculate fine amount for a transaction */
export async function calculateFineAmount(transactionId: string): Promise<number> {
  const { data: transaction, error: fetchError } = await supabase
    .from("borrowing_transactions")
    .select("due_date, date_returned, fine_amount")
    .eq("id", transactionId)
    .single();

  if (fetchError || !transaction) throw new Error("Transaction not found.");

  // If already returned, use stored fine amount
  if (transaction.date_returned) {
    return transaction.fine_amount ?? 0;
  }

  // Calculate current fine for active overdue transaction
  const dueDate = new Date(transaction.due_date);
  const now = new Date();
  const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

  if (daysOverdue === 0) return 0;

  const { data: fineSettings } = await supabase
    .from("fine_settings")
    .select("fine_rate_per_day, max_fine")
    .limit(1)
    .single();

  const fineRate = fineSettings?.fine_rate_per_day ?? 5;
  const maxFine = fineSettings?.max_fine ?? 500;

  return Math.min(daysOverdue * fineRate, maxFine);
}
