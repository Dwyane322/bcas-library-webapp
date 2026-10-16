import { createClient } from "@/utils/client";
import { logActivity, getCurrentActor } from "@/lib/supabase/activity-logs";
import { archiveRecord } from "@/lib/supabase/archive";
import type { ActorInfo, Book, BookWithClassification, BookStatus } from "@/lib/types";

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

export async function createBook(book: BookInsert, actor?: ActorInfo | null): Promise<Book> {
  const { data, error } = await supabase
    .from("books")
    .insert(book)
    .select()
    .single();

  if (error) throw error;

  const resolved = actor ?? (await getCurrentActor().catch(() => null));
  await logActivity({
    action: "ADD",
    entity_type: "book",
    entity_id: (data as Book)?.id ?? null,
    description: `Added book "${book.title}" by ${book.author} (Accession #: ${book.accession_number}).`,
    metadata: { title: book.title, author: book.author, accession_number: book.accession_number },
    actor: resolved,
  });

  return data;
}

export async function updateBook(id: string, updates: BookUpdate, actor?: ActorInfo | null): Promise<Book> {
  const { data, error } = await supabase
    .from("books")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  const resolved = actor ?? (await getCurrentActor().catch(() => null));
  const changedKeys = Object.keys(updates).filter((k) => k !== "updated_at");
  await logActivity({
    action: "EDIT",
    entity_type: "book",
    entity_id: id,
    description: `Edited book "${(data as Book)?.title ?? id}" (changed: ${changedKeys.join(", ") || "—"}).`,
    metadata: { changed_fields: changedKeys, updates },
    actor: resolved,
  });

  return data;
}

export async function updateBookStatus(id: string, status: BookStatus): Promise<Book> {
  return updateBook(id, { status });
}

export async function updateBookNotes(id: string, notes: string): Promise<Book> {
  return updateBook(id, { notes });
}

export async function deleteBook(id: string, actor?: ActorInfo | null): Promise<void> {
  const resolved = actor ?? (await getCurrentActor().catch(() => null));

  // Snapshot the record first so it can be archived + restored later.
  let snapshot: Record<string, unknown> | null = null;
  try {
    const { data } = await supabase.from("books").select("*").eq("id", id).single();
    snapshot = (data as Record<string, unknown> | null) ?? null;
  } catch {
    snapshot = null;
  }

  const { error } = await supabase
    .from("books")
    .delete()
    .eq("id", id);

  if (error) throw error;

  await archiveRecord({
    entity_type: "book",
    entity_id: id,
    data: snapshot,
    actor: resolved,
  });

  await logActivity({
    action: "DELETE",
    entity_type: "book",
    entity_id: id,
    description: snapshot
      ? `Deleted book "${String(snapshot.title ?? id)}" by ${String(snapshot.author ?? "unknown")} (moved to archive).`
      : `Deleted book ${id} (moved to archive).`,
    metadata: snapshot ? { title: snapshot.title, author: snapshot.author, accession_number: snapshot.accession_number } : null,
    actor: resolved,
  });
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
