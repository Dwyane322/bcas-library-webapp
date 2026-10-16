import { createClient } from "@/utils/client";
import { logActivity, getCurrentActor } from "@/lib/supabase/activity-logs";
import { archiveRecord } from "@/lib/supabase/archive";
import type { ActorInfo, BorrowingTransaction, BorrowingTransactionWithDetails } from "@/lib/types";

const supabase = createClient();

/** True when an error is caused by the 005-migration columns not existing yet. */
function isMissingColumnError(error: unknown): boolean {
  const msg =
    (error as { message?: string })?.message ?? (error instanceof Error ? error.message : String(error));
  return /handled_by|column .* does not exist|schema cache|could not find/i.test(msg);
}

function handledByColumns(actor: ActorInfo | null | undefined): Record<string, string | null> {
  return {
    handled_by_staff_id: actor?.staffId ?? null,
    handled_by_name: actor?.name ?? null,
    handled_by_role: (actor?.role as string | undefined) ?? null,
  };
}

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
  actor?: ActorInfo | null,
): Promise<BorrowingTransaction> {
  const resolved = actor ?? (await getCurrentActor().catch(() => null));

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
    return returnBook(activeTx.id, resolved);
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
    return returnBook(existingTx.id, resolved);
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

  const insertPayload: Record<string, unknown> = {
    student_id: student.id,
    book_id: bookId,
    due_date: dueDate.toISOString(),
    status: "Active",
    ...handledByColumns(resolved),
  };

  let { data, error } = await supabase
    .from("borrowing_transactions")
    .insert(insertPayload)
    .select()
    .single();

  // Pre-005-migration DBs lack the handled_by_* columns — retry without them.
  if (error && isMissingColumnError(error)) {
    delete insertPayload.handled_by_staff_id;
    delete insertPayload.handled_by_name;
    delete insertPayload.handled_by_role;
    const retry = await supabase
      .from("borrowing_transactions")
      .insert(insertPayload)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;

  await logActivity({
    action: "BORROW",
    entity_type: "transaction",
    entity_id: (data as BorrowingTransaction)?.id ?? null,
    description: `"${book.title}" borrowed by ${student.name}${resolved ? ` (handled by ${resolved.name}, ${resolved.role})` : ""}.`,
    metadata: {
      book_id: bookId,
      book_title: book.title,
      student_id: student.id,
      student_name: student.name,
    },
    actor: resolved,
  });

  return data;
}

/** Return a book and calculate fine if overdue */
export async function returnBook(transactionId: string, actor?: ActorInfo | null): Promise<BorrowingTransaction> {
  const resolved = actor ?? (await getCurrentActor().catch(() => null));

  // First, calculate the fine
  const { data: transaction, error: fetchError } = await supabase
    .from("borrowing_transactions")
    .select("due_date, students(name), books(title)")
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
  const updatePayload: Record<string, unknown> = {
    status: "Returned",
    date_returned: now.toISOString(),
    fine_amount: fineAmount,
    ...handledByColumns(resolved),
  };

  let { data, error } = await supabase
    .from("borrowing_transactions")
    .update(updatePayload)
    .eq("id", transactionId)
    .eq("status", "Active")
    .select()
    .single();

  // Pre-005-migration DBs lack the handled_by_* columns — retry without them.
  if (error && isMissingColumnError(error)) {
    delete updatePayload.handled_by_staff_id;
    delete updatePayload.handled_by_name;
    delete updatePayload.handled_by_role;
    const retry = await supabase
      .from("borrowing_transactions")
      .update(updatePayload)
      .eq("id", transactionId)
      .eq("status", "Active")
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;

  const txAny = transaction as unknown as {
    students?: { name?: string } | null;
    books?: { title?: string } | null;
  };
  const bookTitle = txAny.books?.title ?? "book";
  const studentName = txAny.students?.name ?? "student";

  await logActivity({
    action: "RETURN",
    entity_type: "transaction",
    entity_id: transactionId,
    description:
      `"${bookTitle}" returned by ${studentName}` +
      (fineAmount > 0 ? ` (overdue fine ₱${fineAmount.toFixed(2)})` : " (no fine)") +
      (resolved ? ` — handled by ${resolved.name}, ${resolved.role}` : ""),
    metadata: {
      book_title: bookTitle,
      student_name: studentName,
      fine_amount: fineAmount,
    },
    actor: resolved,
  });

  return data;
}

// ── Manual Edit / Delete (Transactions page) ────────────────

export interface TransactionEditInput {
  due_date?: string;
  fine_amount?: number;
  fine_paid?: boolean;
}

/** Edit a transaction (due date / fine). Restricted to Librarian/Admin in the UI. */
export async function updateTransactionDetails(
  id: string,
  updates: TransactionEditInput,
  actor?: ActorInfo | null
): Promise<BorrowingTransaction> {
  const resolved = actor ?? (await getCurrentActor().catch(() => null));

  const { data: current } = await supabase
    .from("borrowing_transactions")
    .select("due_date, fine_amount, fine_paid, students(name), books(title)")
    .eq("id", id)
    .single();

  const payload: Record<string, unknown> = {};
  if (updates.due_date !== undefined) {
    const due = new Date(updates.due_date);
    if (Number.isNaN(+due)) throw new Error("Invalid due date.");
    payload.due_date = due.toISOString();
  }
  if (updates.fine_amount !== undefined) payload.fine_amount = updates.fine_amount;
  if (updates.fine_paid !== undefined) payload.fine_paid = updates.fine_paid;
  if (Object.keys(payload).length === 0) throw new Error("Nothing to update.");

  const { data, error } = await supabase
    .from("borrowing_transactions")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  const cur = (current ?? {}) as {
    students?: { name?: string } | null;
    books?: { title?: string } | null;
  };
  await logActivity({
    action: "EDIT",
    entity_type: "transaction",
    entity_id: id,
    description: `Edited transaction: "${cur.books?.title ?? id}" / ${cur.students?.name ?? "student"} (changed: ${Object.keys(payload).join(", ")}).`,
    metadata: { changed_fields: Object.keys(payload), updates: payload },
    actor: resolved,
  });

  return data;
}

/** Delete (void) a transaction. Archived first; frees the book if still out. */
export async function deleteTransaction(id: string, actor?: ActorInfo | null): Promise<void> {
  const resolved = actor ?? (await getCurrentActor().catch(() => null));

  const { data: current, error: fetchError } = await supabase
    .from("borrowing_transactions")
    .select("*, students(name), books(title)")
    .eq("id", id)
    .single();

  if (fetchError || !current) throw new Error("Transaction not found.");

  const cur = current as BorrowingTransaction & {
    students?: { name?: string } | null;
    books?: { title?: string } | null;
  };

  await archiveRecord({
    entity_type: "transaction",
    entity_id: id,
    data: current as unknown as Record<string, unknown>,
    actor: resolved,
  });

  // No delete-trigger resets the book, so free it manually when still out.
  if (cur.status === "Active" || cur.status === "Overdue") {
    await supabase.from("books").update({ status: "Available" }).eq("id", cur.book_id);
  }

  const { error } = await supabase.from("borrowing_transactions").delete().eq("id", id);
  if (error) throw error;

  await logActivity({
    action: "DELETE",
    entity_type: "transaction",
    entity_id: id,
    description: `Deleted transaction: "${cur.books?.title ?? cur.book_id}" / ${cur.students?.name ?? cur.student_id} (moved to archive${cur.status === "Active" || cur.status === "Overdue" ? "; book marked Available" : ""}).`,
    metadata: { book_title: cur.books?.title, student_name: cur.students?.name, status: cur.status },
    actor: resolved,
  });
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
