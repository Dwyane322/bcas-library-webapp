"use client";

import { useState, useEffect, useMemo } from "react";
import { Download } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
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
        (typeFilter === "Overdue" && tx.status === "Overdue");

      return matchesDateRange && matchesSearch && matchesType;
    });
  }, [allTransactions, search, dateRange, typeFilter]);

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
          <div className="text-xs text-slate-500">{row.students?.section ?? ""}</div>
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
  ];

  return (
    <>
      <PageHeader
        title="Transaction History"
        subtitle="Review all borrowing and returning activities."
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
              ]}
            />
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
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
          />
        )}
      </div>
    </>
  );
}
