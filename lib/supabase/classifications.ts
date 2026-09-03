import { createClient } from "@/utils/client";
import type { Classification } from "@/lib/types";

const supabase = createClient();

export async function getClassifications(): Promise<Classification[]> {
  const { data, error } = await supabase
    .from("classifications")
    .select("*")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function getClassificationById(id: string): Promise<Classification | null> {
  const { data, error } = await supabase
    .from("classifications")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createClassification(name: string): Promise<Classification> {
  const { data, error } = await supabase
    .from("classifications")
    .insert({ name })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClassification(id: string): Promise<void> {
  const { error } = await supabase
    .from("classifications")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
