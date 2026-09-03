import { createClient } from "@/utils/client";
import type { Notification } from "@/lib/types";

const supabase = createClient();

/** Get all notifications (newest first) */
export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Get unread notifications */
export async function getUnreadNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Get unread notification count */
export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) throw error;
  return count ?? 0;
}

/** Mark a notification as read */
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) throw error;
}

/** Mark all notifications as read */
export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false);

  if (error) throw error;
}

/** Get notifications for a specific student */
export async function getStudentNotifications(studentId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
