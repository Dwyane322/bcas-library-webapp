import { createClient } from "@/utils/client";
import type { Student } from "@/lib/types";

const supabase = createClient();

type StudentInsert = Omit<Student, "id" | "created_at">;

export async function getStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function getStudentById(id: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getStudentByNumber(studentNumber: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("student_number", studentNumber)
    .single();

  if (error) throw error;
  return data;
}

export async function searchStudents(query: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .or(`name.ilike.%${query}%,section.ilike.%${query}%,student_number.ilike.%${query}%`)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function createStudent(student: StudentInsert): Promise<Student> {
  const { data, error } = await supabase
    .from("students")
    .insert(student)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateStudent(id: string, updates: Partial<StudentInsert>): Promise<Student> {
  const { data, error } = await supabase
    .from("students")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertStudent(student: StudentInsert): Promise<Student> {
  const { data, error } = await supabase
    .from("students")
    .upsert(student, { onConflict: "student_number" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertStudents(students: StudentInsert[]): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;

  for (const student of students) {
    try {
      const { error } = await supabase
        .from("students")
        .upsert(student, { onConflict: "student_number" });

      if (error) {
        errors.push(`${student.student_number}: ${error.message}`);
      } else {
        inserted++;
      }
    } catch (e) {
      errors.push(`${student.student_number}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  return { inserted, errors };
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getStudentCount(): Promise<number> {
  const { count, error } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}
