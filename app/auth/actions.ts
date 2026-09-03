"use server";

import { cookies } from "next/headers";

export async function login(staffId: string, password: string) {
  if (
    staffId === process.env.LIBRARIAN_ID &&
    password === process.env.LIBRARIAN_PASSWORD
  ) {
    const cookieStore = await cookies();
    cookieStore.set("librarian_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return { success: true };
  }
  return { success: false, error: "Invalid staff ID or password." };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("librarian_session");
}
