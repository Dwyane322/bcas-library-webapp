import { createClient } from "@/utils/client";
import type {
  DashboardStats,
  OverdueBookRow,
  CirculationByClassification,
  MostBorrowedBookRow,
  ActiveUserRow,
} from "@/lib/types";

const supabase = createClient();

// ── Dashboard Stats ───────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const [borrowed, returned, overdue] = await Promise.all([
    supabase
      .from("borrowing_transactions")
      .select("*", { count: "exact", head: true })
      .eq("status", "Active"),
    supabase
      .from("borrowing_transactions")
      .select("*", { count: "exact", head: true })
      .eq("status", "Returned"),
    supabase
      .from("borrowing_transactions")
      .select("*", { count: "exact", head: true })
      .in("status", ["Active", "Overdue"])
      .lt("due_date", new Date().toISOString()),
  ]);

  if (borrowed.error) throw borrowed.error;
  if (returned.error) throw returned.error;
  if (overdue.error) throw overdue.error;

  return {
    total_borrowed: borrowed.count ?? 0,
    total_returned: returned.count ?? 0,
    total_overdue: overdue.count ?? 0,
  };
}

// ── Overdue Books ─────────────────────────────────────────────

export async function getOverdueBooks(): Promise<OverdueBookRow[]> {
  const { data, error } = await supabase
    .from("overdue_books")
    .select("*")
    .order("days_overdue", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ── Circulation by Classification ─────────────────────────────

export async function getCirculationByClassification(): Promise<CirculationByClassification[]> {
  const { data, error } = await supabase
    .from("circulation_by_classification")
    .select("*")
    .order("total_transactions", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ── Most Borrowed Books ──────────────────────────────────────

export async function getMostBorrowedBooks(limit = 10): Promise<MostBorrowedBookRow[]> {
  const { data, error } = await supabase
    .from("most_borrowed_books")
    .select("*")
    .order("borrow_count", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// ── Active Users ──────────────────────────────────────────────

export async function getActiveUsers(limit = 10): Promise<ActiveUserRow[]> {
  const { data, error } = await supabase
    .from("active_users")
    .select("*")
    .order("total_visits", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// ── Circulation Activity (for chart) ──────────────────────────

export interface DailyCirculation {
  day: string;
  borrows: number;
  returns: number;
}

export async function getCirculationActivity(days = 7): Promise<DailyCirculation[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("borrowing_transactions")
    .select("date_borrowed, date_returned, status")
    .gte("date_borrowed", since.toISOString());

  if (error) throw error;

  // Group by day of week
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const grouped: Record<string, { borrows: number; returns: number }> = {};

  dayNames.forEach((d) => (grouped[d] = { borrows: 0, returns: 0 }));

  (data ?? []).forEach((tx) => {
    const borrowDate = new Date(tx.date_borrowed);
    const dayName = dayNames[borrowDate.getDay()];
    grouped[dayName].borrows++;

    if (tx.date_returned) {
      const returnDate = new Date(tx.date_returned);
      const returnDay = dayNames[returnDate.getDay()];
      grouped[returnDay].returns++;
    }
  });

  return dayNames.map((day) => ({
    day,
    borrows: grouped[day].borrows,
    returns: grouped[day].returns,
  }));
}

// ── Award Eligibility ─────────────────────────────────────────

export interface AwardWinner {
  student_id: string;
  student_name: string;
  section: string;
  count: number;
}

export async function getTopVisitors(year?: number): Promise<AwardWinner[]> {
  const y = year ?? new Date().getFullYear();
  const start = `${y}-01-01`;
  const end = `${y}-12-31`;

  const { data, error } = await supabase
    .from("library_visits")
    .select("student_id, students(name, section)")
    .gte("visited_at", start)
    .lte("visited_at", end);

  if (error) throw error;

  // Count visits per student
  const counts: Record<string, { name: string; section: string; count: number }> = {};
  (data ?? []).forEach((v: any) => {
    const sid = v.student_id;
    if (!counts[sid]) {
      counts[sid] = {
        name: v.students?.name ?? "Unknown",
        section: v.students?.section ?? "",
        count: 0,
      };
    }
    counts[sid].count++;
  });

  return Object.entries(counts)
    .map(([student_id, { name, section, count }]) => ({
      student_id,
      student_name: name,
      section,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export async function getTopBorrowers(year?: number): Promise<AwardWinner[]> {
  const y = year ?? new Date().getFullYear();
  const start = `${y}-01-01`;
  const end = `${y}-12-31`;

  const { data, error } = await supabase
    .from("borrowing_transactions")
    .select("student_id, students(name, section)")
    .gte("date_borrowed", start)
    .lte("date_borrowed", end);

  if (error) throw error;

  const counts: Record<string, { name: string; section: string; count: number }> = {};
  (data ?? []).forEach((tx: any) => {
    const sid = tx.student_id;
    if (!counts[sid]) {
      counts[sid] = {
        name: tx.students?.name ?? "Unknown",
        section: tx.students?.section ?? "",
        count: 0,
      };
    }
    counts[sid].count++;
  });

  return Object.entries(counts)
    .map(([student_id, { name, section, count }]) => ({
      student_id,
      student_name: name,
      section,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}
