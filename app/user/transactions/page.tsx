"use client";

import { useState, useEffect, useMemo } from "react";
import { Download, DollarSign, User, Hash, BookOpen, GraduationCap, Layers } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import Modal from "@/components/ui/modal";
import SearchInput from "@/components/ui/search-input";
import Select from "@/components/ui/select";
import Badge from "@/components/ui/badge";
import DataTable from "@/components/ui/data-table";
import { getTransactions } from "@/lib/supabase/transactions";
import type { BorrowingTransactionWithDetails } from "@/lib/types";

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [allTransactions, setAllTransactions] = useState<BorrowingTransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<BorrowingTransactionWithDetails["students"] | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const data = await getTransactions();
        setAllTransactions(data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

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
  ];

  return (
    <>
      <div className="animate-fade-in-up stagger-1">
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
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </>
        }
      />
      </div>

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

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 animate-fade-in-up stagger-3">
        <div className="mb-5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by student or book title..."
          />
        </div>
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading transactions...</div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            pageSize={5}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => setSelectedStudent(row.students)}
            emptyMessage="No transactions found."
          />
        )}
      </div>

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
