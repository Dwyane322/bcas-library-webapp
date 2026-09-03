// ============================================================
// Database Row Types (mirrors Supabase table schemas)
// ============================================================

export type BookStatus = "Available" | "Borrowed" | "Lost" | "Damaged";
export type MaterialType = "Book" | "Non-Book";
export type BorrowStatus = "Active" | "Returned" | "Overdue";

export interface Classification {
  id: string;
  name: string;
  created_at: string;
}

export interface Student {
  id: string;
  name: string;
  section: string;
  created_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  accession_number: string;
  classification_id: string;
  shelf_location: string | null;
  material_type: MaterialType;
  status: BookStatus;
  is_library_use_only: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BorrowingTransaction {
  id: string;
  student_id: string;
  book_id: string;
  date_borrowed: string;
  date_returned: string | null;
  due_date: string;
  status: BorrowStatus;
  created_at: string;
}

export interface LibraryVisit {
  id: string;
  student_id: string;
  visited_at: string;
}

export interface Notification {
  id: string;
  student_id: string;
  book_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ============================================================
// Extended / Joined Types (for views & queries)
// ============================================================

export interface BookWithClassification extends Book {
  classifications: Pick<Classification, "id" | "name">;
}

export interface BorrowingTransactionWithDetails extends BorrowingTransaction {
  students: Pick<Student, "id" | "name" | "section">;
  books: BookWithClassification;
}

export interface OverdueBookRow {
  transaction_id: string;
  student_id: string;
  student_name: string;
  student_section: string;
  book_id: string;
  book_title: string;
  book_author: string;
  accession_number: string;
  classification_id: string;
  classification_name: string;
  date_borrowed: string;
  due_date: string;
  days_overdue: number;
}

export interface DashboardStats {
  total_borrowed: number;
  total_returned: number;
  total_overdue: number;
}

export interface CirculationByClassification {
  classification_name: string;
  total_transactions: number;
  currently_borrowed: number;
  returned: number;
}

export interface MostBorrowedBookRow {
  id: string;
  title: string;
  author: string;
  classification_name: string;
  borrow_count: number;
  current_status: BookStatus;
}

export interface ActiveUserRow {
  id: string;
  name: string;
  section: string;
  total_visits: number;
  total_borrowed: number;
}


