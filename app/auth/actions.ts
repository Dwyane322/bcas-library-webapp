"use server";

import { cookies } from "next/headers";
import type { StaffRole } from "@/lib/types";

export interface SessionData {
  authenticated: boolean;
  staffId: string;
  name: string;
  role: StaffRole;
}

export async function login(staffId: string, password: string) {
  // Check against staff table
  const { getStaffByUserId } = await import("@/lib/supabase/staff");
  const staff = await getStaffByUserId(staffId);

  if (staff && staff.is_active) {
    const storedPassword = staff.password_hash
      ? Buffer.from(staff.password_hash, "base64").toString("utf-8")
      : null;

    if (!storedPassword || storedPassword !== password) {
      return { success: false, error: "Invalid staff ID or password." };
    }

    const sessionData: SessionData = {
      authenticated: true,
      staffId,
      name: staff.name,
      role: staff.role,
    };

    const cookieStore = await cookies();
    cookieStore.set("librarian_session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return { success: true, role: staff.role };
  }

  return { success: false, error: "Invalid staff ID or password." };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("librarian_session");
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("librarian_session");

  if (!session?.value) return null;

  try {
    const data = JSON.parse(session.value) as SessionData;
    if (data.authenticated) return data;
    return null;
  } catch {
    return null;
  }
}

export async function hasPermission(requiredRole: StaffRole): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const roleHierarchy: Record<StaffRole, number> = {
    "Admin": 3,
    "Librarian": 2,
    "Staff": 1,
  };

  return roleHierarchy[session.role] >= roleHierarchy[requiredRole];
}

export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.role === "Admin";
}
