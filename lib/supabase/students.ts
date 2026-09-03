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

export async function searchStudents(query: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .or(`name.ilike.%${query}%,section.ilike.%${query}%`)
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

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
