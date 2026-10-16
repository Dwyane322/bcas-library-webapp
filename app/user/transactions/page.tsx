"use client";

import { useState, useEffect, useMemo } from "react";
import { Download, DollarSign, User, Hash, BookOpen, GraduationCap, Layers, Printer, Pencil, Trash2, ShieldAlert } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import Modal, { ConfirmModal } from "@/components/ui/modal";
import SearchInput from "@/components/ui/search-input";
import Select from "@/components/ui/select";
import Badge from "@/components/ui/badge";
import DataTable from "@/components/ui/data-table";
import { getSession } from "@/app/auth/actions";
import { canEdit, canDelete } from "@/lib/permissions";
import {
  getTransactions,
  updateTransactionDetails,
  deleteTransaction,
} from "@/lib/supabase/transactions";
import type { BorrowingTransactionWithDetails, StaffRole } from "@/lib/types";

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [allTransactions, setAllTransactions] = useState<BorrowingTransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<BorrowingTransactionWithDetails["students"] | null>(null);
  const [role, setRole] = useState<StaffRole | null>(null);

  // Only an explicit Staff role is restricted (session loads async).
  const allowEdit = role ? canEdit(role) : true;
  const allowDelete = role ? canDelete(role) : true;
  const staffRestricted = role === "Staff";

  // Edit / delete state
  const [editingTx, setEditingTx] = useState<BorrowingTransactionWithDetails | null>(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editFine, setEditFine] = useState("0.00");
  const [editFinePaid, setEditFinePaid] = useState(false);
  const [deletingTx, setDeletingTx] = useState<BorrowingTransactionWithDetails | null>(null);

  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const [data, session] = await Promise.all([getTransactions(), getSession()]);
        setAllTransactions(data);
        if (session) setRole(session.role);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  const reload = async () => {
    setAllTransactions(await getTransactions());
  };

  const filtered = useMemo(() => {
    const now = new Date();
    return allTransactions.filter((tx) => {
      const txDate = new Date(tx.date_borrowed);
      const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
      const matchesDateRange =
        dateRange === "all" ||
        (dateRange === "7d" && diffDays <= 7) ||
        (dateRange === "30d" && diffDays <= 30) ||
        (dateRange === "90d" && diffDays <= 90);

      const studentName = tx.students?.name ?? "";
      const bookTitle = tx.books?.title ?? "";
      const matchesSearch =
        search === "" ||
        studentName.toLowerCase().includes(search.toLowerCase()) ||
        bookTitle.toLowerCase().includes(search.toLowerCase());

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "Borrow" && tx.status === "Active") ||
        (typeFilter === "Return" && tx.status === "Returned") ||
        (typeFilter === "Overdue" && tx.status === "Overdue") ||
        (typeFilter === "Fine" && (tx.fine_amount ?? 0) > 0);

      return matchesDateRange && matchesSearch && matchesType;
    });
  }, [allTransactions, search, dateRange, typeFilter]);

  const totalFines = useMemo(() => {
    return filtered.reduce((sum, tx) => sum + (tx.fine_amount ?? 0), 0);
  }, [filtered]);

  const pendingFines = useMemo(() => {
    return filtered
      .filter((tx) => !tx.fine_paid && (tx.fine_amount ?? 0) > 0)
      .reduce((sum, tx) => sum + (tx.fine_amount ?? 0), 0);
  }, [filtered]);

  const handleExportCSV = () => {
    const header = "Date Borrowed,Date Returned,Due Date,Student,Student Number,Book,Author,Status,Fine,Fine Paid,Handled By,Handler Role\n";
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = filtered
      .map((tx) =>
        [
          esc(new Date(tx.date_borrowed).toLocaleString()),
          esc(tx.date_returned ? new Date(tx.date_returned).toLocaleString() : ""),
          esc(new Date(tx.due_date).toLocaleString()),
          esc(tx.students?.name ?? ""),
          esc(tx.students?.student_number ?? ""),
          esc(tx.books?.title ?? ""),
          esc(tx.books?.author ?? ""),
          esc(tx.status),
          (tx.fine_amount ?? 0).toFixed(2),
          (tx.fine_amount ?? 0) > 0 ? (tx.fine_paid ? "Yes" : "No") : "",
          esc(tx.handled_by_name ?? ""),
          esc(tx.handled_by_role ?? ""),
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handlePrint = () => {
    window.print();
  };

  const openEditModal = (tx: BorrowingTransactionWithDetails) => {
    if (!allowEdit) return;
    setEditingTx(tx);
    setEditDueDate(tx.due_date ? new Date(tx.due_date).toISOString().split("T")[0] : "");
    setEditFine((tx.fine_amount ?? 0).toFixed(2));
    setEditFinePaid(!!tx.fine_paid);
    setModalError(null);
  };

  const handleEditSubmit = async () => {
    if (!editingTx || !allowEdit) return;
    const fine = parseFloat(editFine);
    if (Number.isNaN(fine) || fine < 0) {
      setModalError("Enter a valid fine amount.");
      return;
    }
    setBusy(true);
    setModalError(null);
    try {
      await updateTransactionDetails(editingTx.id, {
        due_date: editDueDate || undefined,
        fine_amount: fine,
        fine_paid: editFinePaid,
      });
      setEditingTx(null);
      await reload();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Failed to update transaction.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTx || !allowDelete) return;
    setBusy(true);
    try {
      await deleteTransaction(deletingTx.id);
      setDeletingTx(null);
      await reload();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Failed to delete transaction.");
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: "date",
      header: "Date & Time",
      render: (row: BorrowingTransactionWithDetails) => (
        <div>
          <div className="text-slate-800">{new Date(row.date_borrowed).toLocaleDateString()}</div>
          <div className="text-xs text-slate-500">
            {row.date_returned ? `Returned ${new Date(row.date_returned).toLocaleDateString()}` : `Due ${new Date(row.due_date).toLocaleDateString()}`}
          </div>
        </div>
      ),
    },
    {
      key: "student",
      header: "Student",
      render: (row: BorrowingTransactionWithDetails) => (
        <div>
          <div className="font-medium text-slate-800">{row.students?.name ?? "—"}</div>
          <div className="text-xs text-slate-500">{row.students?.student_number || row.students?.section || ""}</div>
        </div>
      ),
    },
    {
      key: "book",
      header: "Book Details",
      render: (row: BorrowingTransactionWithDetails) => (
        <div>
          <div className="font-medium text-slate-800">{row.books?.title ?? "—"}</div>
          <div className="text-xs text-slate-500">{row.books?.author ?? ""}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: BorrowingTransactionWithDetails) => <Badge label={row.status} />,
    },
    {
      key: "fine",
      header: "Fine",
      render: (row: BorrowingTransactionWithDetails) => {
        const fine = row.fine_amount ?? 0;
        if (fine === 0) return <span className="text-slate-400">—</span>;
        return (
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-amber-500" />
            <span className={row.fine_paid ? "text-emerald-600" : "text-amber-600"}>
              {fine.toFixed(2)}
            </span>
            {row.fine_paid && (
              <span className="text-xs text-emerald-600 ml-1">(Paid)</span>
            )}
          </div>
        );
      },
    },
    {
      key: "handledBy",
      header: "Handled By",
      render: (row: BorrowingTransactionWithDetails) => {
        if (!row.handled_by_name) return <span className="text-slate-400">—</span>;
        return (
          <div>
            <div className="font-medium text-slate-800">{row.handled_by_name}</div>
            {row.handled_by_role && (
              <div className="text-xs text-slate-500">{row.handled_by_role}</div>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: BorrowingTransactionWithDetails) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {allowEdit && (
            <button onClick={() => openEditModal(row)} className="text-slate-400 hover:text-slate-600 transition-colors" title="Edit transaction">
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {allowDelete && (
            <button onClick={() => { setModalError(null); setDeletingTx(row); }} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete transaction">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ].filter((col) => col.key !== "actions" || allowEdit || allowDelete);

  return (
    <>
      <div className="animate-fade-in-up stagger-1 no-print">
        <PageHeader
        title="Transactions"
        actions={
          <>
            <Select
              value={dateRange}
              onChange={setDateRange}
              options={[
                { label: "Last 7 Days", value: "7d" },
                { label: "Last 30 Days", value: "30d" },
                { label: "Last 90 Days", value: "90d" },
                { label: "All Time", value: "all" },
              ]}
            />
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { label: "All Types", value: "all" },
                { label: "Borrow", value: "Borrow" },
                { label: "Return", value: "Return" },
                { label: "Overdue", value: "Overdue" },
                { label: "With Fine", value: "Fine" },
              ]}
            />
            <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors no-print">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button onClick={handlePrint} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors no-print">
              <Printer className="w-4 h-4" />
              Print
            </button>
          </>
        }
      />
      </div>

      {staffRestricted && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-sm text-amber-800 animate-fade-in-up stagger-2 no-print">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Borrows are recorded automatically via Circulation scanning. Editing or deleting a transaction requires a Librarian or Admin.</span>
        </div>
      )}

      {/* Fine Summary */}
      {totalFines > 0 && (
        <div className="mb-4 p-4 bg-amber-50 rounded-xl border border-amber-200 animate-fade-in-up stagger-2">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-amber-800">Fine Summary</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-amber-600">Total Fines:</span>
              <span className="ml-2 font-medium text-amber-800">₱{totalFines.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-amber-600">Pending:</span>
              <span className="ml-2 font-medium text-amber-800">₱{pendingFines.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-amber-600">Collected:</span>
              <span className="ml-2 font-medium text-emerald-700">₱{(totalFines - pendingFines).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 animate-fade-in-up stagger-3" data-print-area>
        <div className="hidden print:block mb-4 print-header">
          <h2 className="text-xl font-bold text-slate-900">BCAS Library — Transactions</h2>
          <p className="text-sm text-slate-500">
            Generated {new Date().toLocaleString()} • {filtered.length} record(s) • Total fines ₱{totalFines.toFixed(2)} (Pending ₱{pendingFines.toFixed(2)})
          </p>
        </div>
        <div className="mb-5 no-print">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by student or book title..."
          />
        </div>
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading transactions...</div>
        ) : (
          <>
            <div className="print:hidden">
              <DataTable
                columns={columns}
                data={filtered}
                pageSize={5}
                keyExtractor={(row) => row.id}
                onRowClick={(row) => setSelectedStudent(row.students)}
                emptyMessage="No transactions found."
              />
            </div>
            {/* Print-only full list (screen table is paginated) */}
            <div className="hidden print:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-2 py-2 font-semibold text-slate-500">Date Borrowed</th>
                    <th className="text-left px-2 py-2 font-semibold text-slate-500">Student</th>
                    <th className="text-left px-2 py-2 font-semibold text-slate-500">Book</th>
                    <th className="text-left px-2 py-2 font-semibold text-slate-500">Status</th>
                    <th className="text-left px-2 py-2 font-semibold text-slate-500">Fine</th>
                    <th className="text-left px-2 py-2 font-semibold text-slate-500">Handled By</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 text-slate-600">
                        {new Date(tx.date_borrowed).toLocaleDateString()}
                        <div className="text-xs text-slate-400">
                          {tx.date_returned ? `Returned ${new Date(tx.date_returned).toLocaleDateString()}` : `Due ${new Date(tx.due_date).toLocaleDateString()}`}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-medium text-slate-800">{tx.students?.name ?? "—"}</div>
                        <div className="text-xs text-slate-500">{tx.students?.student_number || tx.students?.section || ""}</div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-medium text-slate-800">{tx.books?.title ?? "—"}</div>
                        <div className="text-xs text-slate-500">{tx.books?.author ?? ""}</div>
                      </td>
                      <td className="px-2 py-2 text-slate-600">{tx.status}</td>
                      <td className="px-2 py-2 text-slate-600">
                        {(tx.fine_amount ?? 0) > 0 ? `₱${(tx.fine_amount ?? 0).toFixed(2)}${tx.fine_paid ? " (Paid)" : ""}` : "—"}
                      </td>
                      <td className="px-2 py-2 text-slate-600">
                        {tx.handled_by_name ? `${tx.handled_by_name}${tx.handled_by_role ? ` (${tx.handled_by_role})` : ""}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="py-8 text-center text-slate-400 text-sm">No transactions found.</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Edit Transaction Modal */}
      <Modal
        open={!!editingTx}
        onClose={() => setEditingTx(null)}
        title="Edit Transaction"
        subtitle={editingTx ? `${editingTx.books?.title ?? ""} / ${editingTx.students?.name ?? ""}` : undefined}
        size="sm"
        footer={
          <>
            <button
              onClick={() => setEditingTx(null)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEditSubmit}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save Changes"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {modalError && editingTx && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{modalError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
            <input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fine Amount (₱)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={editFine}
              onChange={(e) => setEditFine(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editFinePaid}
                onChange={(e) => setEditFinePaid(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-slate-700">Fine paid</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={!!deletingTx}
        onClose={() => { setDeletingTx(null); setModalError(null); }}
        onConfirm={handleDelete}
        title="Delete Transaction"
        message={
          modalError ??
          (deletingTx
            ? `Delete the ${deletingTx.status.toLowerCase()} transaction for "${deletingTx.books?.title ?? ""}" / ${deletingTx.students?.name ?? ""}? It will be moved to the Archive${deletingTx.status === "Active" || deletingTx.status === "Overdue" ? " and the book marked Available" : ""}. This will be recorded in the Activity Logs.`
            : "")
        }
        confirmLabel="Delete"
        confirming={busy}
      />

      {/* Student Info Modal */}
      <Modal
        open={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title="Student Information"
        subtitle={selectedStudent?.name}
        size="sm"
        footer={
          <button
            onClick={() => setSelectedStudent(null)}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        }
      >
        {selectedStudent && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{selectedStudent.name}</p>
                <p className="text-xs text-slate-500">Student</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">Student ID</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{selectedStudent.student_number || "—"}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">Section</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{selectedStudent.section || "—"}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">Grade Level</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{selectedStudent.grade_level || "—"}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">Program</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{selectedStudent.program || "—"}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
