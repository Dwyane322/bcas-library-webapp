import { createClient } from "@/utils/client";
import type { Book, BookWithClassification, BookStatus } from "@/lib/types";

const supabase = createClient();

type BookInsert = Omit<Book, "id" | "created_at" | "updated_at">;
type BookUpdate = Partial<Omit<Book, "id" | "created_at" | "updated_at">>;

// ── Read ──────────────────────────────────────────────────────

export async function getBooks(): Promise<BookWithClassification[]> {
  const { data, error } = await supabase
    .from("books")
    .select("*, classifications(id, name)")
    .order("title");

  if (error) throw error;
  return data ?? [];
}

export async function getBookById(id: string): Promise<BookWithClassification | null> {
  const { data, error } = await supabase
    .from("books")
    .select("*, classifications(id, name)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getBookByAccessionNumber(accessionNumber: string): Promise<BookWithClassification | null> {
  const { data, error } = await supabase
    .from("books")
    .select("*, classifications(id, name)")
    .eq("accession_number", accessionNumber)
    .single();

  if (error) throw error;
  return data;
}

export async function searchBooks(query: string): Promise<BookWithClassification[]> {
  const { data, error } = await supabase
    .from("books")
    .select("*, classifications(id, name)")
    .or(`title.ilike.%${query}%,author.ilike.%${query}%,accession_number.ilike.%${query}%`)
    .order("title");

  if (error) throw error;
  return data ?? [];
}

export async function getBooksByClassification(classificationId: string): Promise<BookWithClassification[]> {
  const { data, error } = await supabase
    .from("books")
    .select("*, classifications(id, name)")
    .eq("classification_id", classificationId)
    .order("title");

  if (error) throw error;
  return data ?? [];
}

export async function getAvailableBooks(): Promise<BookWithClassification[]> {
  const { data, error } = await supabase
    .from("books")
    .select("*, classifications(id, name)")
    .eq("status", "Available")
    .eq("is_library_use_only", false)
    .order("title");

  if (error) throw error;
  return data ?? [];
}

export async function getBorrowableBooks(): Promise<BookWithClassification[]> {
  const { data, error } = await supabase
    .from("books")
    .select("*, classifications(id, name)")
    .eq("status", "Available")
    .eq("is_library_use_only", false)
    .order("title");

  if (error) throw error;
  return data ?? [];
}

export async function getLibraryUseOnlyBooks(): Promise<BookWithClassification[]> {
  const { data, error } = await supabase
    .from("books")
    .select("*, classifications(id, name)")
    .eq("is_library_use_only", true)
    .order("title");

  if (error) throw error;
  return data ?? [];
}

// ── Write ──────────────────────────────────────────────────────

export async function createBook(book: BookInsert): Promise<Book> {
  const { data, error } = await supabase
    .from("books")
    .insert(book)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBook(id: string, updates: BookUpdate): Promise<Book> {
  const { data, error } = await supabase
    .from("books")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBookStatus(id: string, status: BookStatus): Promise<Book> {
  return updateBook(id, { status });
}

export async function updateBookNotes(id: string, notes: string): Promise<Book> {
  return updateBook(id, { notes });
}

export async function deleteBook(id: string): Promise<void> {
  const { error } = await supabase
    .from("books")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ── Bulk ──────────────────────────────────────────────────────

export async function createBooks(books: BookInsert[]): Promise<Book[]> {
  const { data, error } = await supabase
    .from("books")
    .insert(books)
    .select();

  if (error) throw error;
  return data ?? [];
}
