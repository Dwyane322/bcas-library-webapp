import { createClient } from "@/utils/client";
import type { LibraryVisit } from "@/lib/types";

const supabase = createClient();

/** Record a library visit for a student */
export async function recordVisit(studentId: string): Promise<LibraryVisit> {
  const { data, error } = await supabase
    .from("library_visits")
    .insert({ student_id: studentId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Get all visits for a student */
export async function getStudentVisits(studentId: string): Promise<LibraryVisit[]> {
  const { data, error } = await supabase
    .from("library_visits")
    .select("*")
    .eq("student_id", studentId)
    .order("visited_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Get visit count for a student */
export async function getStudentVisitCount(studentId: string): Promise<number> {
  const { count, error } = await supabase
    .from("library_visits")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId);

  if (error) throw error;
  return count ?? 0;
}

/** Get visit count for a student within a date range */
export async function getStudentVisitCountInRange(
  studentId: string,
  startDate: string,
  endDate: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("library_visits")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId)
    .gte("visited_at", startDate)
    .lte("visited_at", endDate);

  if (error) throw error;
  return count ?? 0;
}

/** Get total visits today */
export async function getTodayVisitCount(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("library_visits")
    .select("*", { count: "exact", head: true })
    .gte("visited_at", today.toISOString());

  if (error) throw error;
  return count ?? 0;
}
