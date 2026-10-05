import { createClient } from "@/utils/client";
import type { Staff, StaffRole } from "@/lib/types";

const supabase = createClient();

export async function getStaff(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function getActiveStaff(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function getStaffByUserId(staffId: string): Promise<Staff | null> {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("staff_id", staffId)
    .single();

  if (error) throw error;
  return data;
}

export async function createStaff(staff: Omit<Staff, "id" | "created_at">): Promise<Staff> {
  const { data, error } = await supabase
    .from("staff")
    .insert(staff)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateStaff(id: string, updates: Partial<Omit<Staff, "id" | "created_at">>): Promise<Staff> {
  const { data, error } = await supabase
    .from("staff")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteStaff(id: string): Promise<void> {
  const { error } = await supabase
    .from("staff")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function isStaffActive(staffId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("staff")
    .select("is_active")
    .eq("staff_id", staffId)
    .single();

  if (error) return false;
  return data?.is_active ?? false;
}

export async function getStaffRole(staffId: string): Promise<StaffRole | null> {
  const { data, error } = await supabase
    .from("staff")
    .select("role")
    .eq("staff_id", staffId)
    .single();

  if (error) return null;
  return data?.role ?? null;
}

export async function setStaffPassword(id: string, password: string): Promise<void> {
  const passwordHash = btoa(password);
  const { error } = await supabase
    .from("staff")
    .update({ password_hash: passwordHash })
    .eq("id", id);

  if (error) throw error;
}

export async function setStaffPasswordByUserId(staffId: string, password: string): Promise<void> {
  const passwordHash = btoa(password);
  const { error } = await supabase
    .from("staff")
    .update({ password_hash: passwordHash })
    .eq("staff_id", staffId);

  if (error) throw error;
}
