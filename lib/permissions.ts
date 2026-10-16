import type { StaffRole } from "@/lib/types";

// ============================================================
// Role permissions matrix
// - Admin / Librarian: full access (add, edit, delete, borrow,
//   settings, archive management)
// - Staff: adding (books/students) and borrowing/returning only.
//   No edit, no delete, no settings changes, no archive restore.
// ============================================================

export function canAdd(role: StaffRole | null | undefined): boolean {
  return role === "Admin" || role === "Librarian" || role === "Staff";
}

export function canBorrow(role: StaffRole | null | undefined): boolean {
  return role === "Admin" || role === "Librarian" || role === "Staff";
}

export function canEdit(role: StaffRole | null | undefined): boolean {
  return role === "Admin" || role === "Librarian";
}

export function canDelete(role: StaffRole | null | undefined): boolean {
  return role === "Admin" || role === "Librarian";
}

export function canManageSettings(role: StaffRole | null | undefined): boolean {
  // Fine settings + school years
  return role === "Admin" || role === "Librarian";
}

export function canManageStaff(role: StaffRole | null | undefined): boolean {
  return role === "Admin";
}

export function canImport(role: StaffRole | null | undefined): boolean {
  // Bulk import is reserved for Admin / Librarian
  return role === "Admin" || role === "Librarian";
}

export function canManageArchive(role: StaffRole | null | undefined): boolean {
  // Restore / permanently delete archived records
  return role === "Admin" || role === "Librarian";
}

export const STAFF_RESTRICTED_MESSAGE =
  "Your Staff account is limited to adding books and borrowing/returning. Editing and deleting require a Librarian or Admin.";
