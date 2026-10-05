import { createClient } from "@/utils/client";
import type { FineSetting, StudentFine } from "@/lib/types";

const supabase = createClient();

export async function getFineSettings(): Promise<FineSetting> {
  const { data, error } = await supabase
    .from("fine_settings")
    .select("*")
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

export async function updateFineSettings(id: string, updates: Partial<Omit<FineSetting, "id" | "created_at">>): Promise<FineSetting> {
  const { data, error } = await supabase
    .from("fine_settings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function calculateFine(transactionId: string): Promise<number> {
  const { data, error } = await supabase.rpc("calculate_fine", {
    p_transaction_id: transactionId
  });

  if (error) throw error;
  return data ?? 0;
}

export async function payFine(transactionId: string): Promise<void> {
  const fine = await calculateFine(transactionId);

  const { error } = await supabase
    .from("borrowing_transactions")
    .update({ fine_paid: true })
    .eq("id", transactionId);

  if (error) throw error;
}

export async function updateTransactionFine(transactionId: string, fineAmount: number): Promise<void> {
  const { error } = await supabase
    .from("borrowing_transactions")
    .update({ fine_amount: fineAmount })
    .eq("id", transactionId);

  if (error) throw error;
}

export async function getStudentFines(): Promise<StudentFine[]> {
  const { data, error } = await supabase
    .from("student_fines")
    .select("*")
    .order("total_fines", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getPendingFinesTotal(): Promise<number> {
  const { data, error } = await supabase
    .from("borrowing_transactions")
    .select("fine_amount")
    .gt("fine_amount", 0)
    .eq("fine_paid", false);

  if (error) throw error;
  return (data ?? []).reduce((sum, tx) => sum + (tx.fine_amount || 0), 0);
}

export async function getPaidFinesTotal(): Promise<number> {
  const { data, error } = await supabase
    .from("borrowing_transactions")
    .select("fine_amount")
    .gt("fine_amount", 0)
    .eq("fine_paid", true);

  if (error) throw error;
  return (data ?? []).reduce((sum, tx) => sum + (tx.fine_amount || 0), 0);
}
