import { createClient } from "@/utils/client";
import type { SchoolYear, SchoolYearSummary } from "@/lib/types";

const supabase = createClient();

export async function getSchoolYears(): Promise<SchoolYear[]> {
  const { data, error } = await supabase
    .from("school_years")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getActiveSchoolYear(): Promise<SchoolYear | null> {
  const { data, error } = await supabase
    .from("school_years")
    .select("*")
    .eq("is_active", true)
    .single();

  if (error) throw error;
  return data;
}

export async function createSchoolYear(year: Omit<SchoolYear, "id" | "created_at">): Promise<SchoolYear> {
  const { data, error } = await supabase
    .from("school_years")
    .insert(year)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSchoolYear(id: string, updates: Partial<Omit<SchoolYear, "id" | "created_at">>): Promise<SchoolYear> {
  const { data, error } = await supabase
    .from("school_years")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setActiveSchoolYear(id: string): Promise<void> {
  const { error } = await supabase.rpc("set_active_school_year", {
    p_school_year_id: id
  });

  if (error) throw error;
}

export async function deleteSchoolYear(id: string): Promise<void> {
  const { error } = await supabase
    .from("school_years")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getSchoolYearSummaries(): Promise<SchoolYearSummary[]> {
  const { data, error } = await supabase
    .from("school_year_summary")
    .select("*")
    .order("school_year_name", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
