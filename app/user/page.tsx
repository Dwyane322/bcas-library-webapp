"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookMarked,
  FileText,
  BookCopy,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  ClipboardList,
  Megaphone,
  UserPlus,
  BookOpen,
  Printer,
  ClipboardCheck,
} from "lucide-react";
import { getDashboardStats } from "@/lib/supabase/dashboard";
import { getTransactions } from "@/lib/supabase/transactions";
import { getBooks } from "@/lib/supabase/books";
import type { DashboardStats, BorrowingTransactionWithDetails } from "@/lib/types";

const statusColors: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Returned: "bg-slate-100 text-slate-600",
  Overdue: "bg-amber-100 text-amber-700",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({ total_borrowed: 0, total_returned: 0, total_overdue: 0 });
  const [recentTransactions, setRecentTransactions] = useState<BorrowingTransactionWithDetails[]>([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, txData, booksData] = await Promise.all([
          getDashboardStats(),
          getTransactions(),
          getBooks(),
        ]);
        setStats(statsData);
        setRecentTransactions(txData.slice(0, 5));
        setTotalBooks(booksData.length);
      } catch {
        // silent fail - show zeros
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Dashboard Overview
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back. Here is the current status of the library.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/user/transactions" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors">
            <BookMarked className="w-4 h-4" />
            <span className="hidden xs:inline">Borrow Book</span>
            <span className="xs:hidden">Borrow</span>
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Total Books
            </span>
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">
            {loading ? "—" : totalBooks.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-2 text-sm text-slate-500">
            <BookCopy className="w-3.5 h-3.5" />
            In catalog
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Currently Borrowed
            </span>
            <BookCopy className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">
            {loading ? "—" : stats.total_borrowed.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-2 text-sm text-slate-500">
            <ArrowRight className="w-3.5 h-3.5" />
            Active loans
          </div>
        </div>

        <div className="bg-white rounded-xl border border-amber-300 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
              Overdue Books
            </span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-amber-600">
            {loading ? "—" : stats.total_overdue.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-2 text-sm text-amber-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            Requires attention
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Total Returns
            </span>
            <ClipboardList className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">
            {loading ? "—" : stats.total_returned.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-2 text-sm text-slate-500">
            <TrendingUp className="w-3.5 h-3.5" />
            All time
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">
              Recent Transactions
            </h3>
            <Link
              href="/user/transactions"
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500">
                    Book Title
                  </th>
                  <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500 hidden sm:table-cell">
                    Student
                  </th>
                  <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-slate-400">Loading...</td>
                  </tr>
                ) : recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-slate-400">No transactions yet.</td>
                  </tr>
                ) : (
                  recentTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 sm:px-5 py-4 text-slate-800 font-medium">
                        <div className="truncate max-w-[180px] sm:max-w-none">{tx.books?.title ?? "Unknown"}</div>
                        <div className="text-xs text-slate-500 sm:hidden mt-0.5">{tx.students?.name}</div>
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-slate-500 hidden sm:table-cell">
                        {tx.students?.name ?? "—"}
                      </td>
                      <td className="px-4 sm:px-5 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${statusColors[tx.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* System Alert */}
          <div className="bg-red-50 rounded-xl border border-red-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-red-700">System Alert</h3>
            </div>
            <p className="text-sm text-red-600">
              {stats.total_overdue > 0
                ? `${stats.total_overdue} book(s) are currently overdue and require attention.`
                : "All books are on track. No overdue items."}
            </p>
          </div>

          {/* Librarian Tools */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Librarian Tools
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/user/books" className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <UserPlus className="w-5 h-5 text-slate-600" />
                <span className="text-xs font-medium text-slate-700">
                  New Member
                </span>
              </Link>
              <Link href="/user/books" className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <BookOpen className="w-5 h-5 text-slate-600" />
                <span className="text-xs font-medium text-slate-700">
                  Add Book
                </span>
              </Link>
              <Link href="/user/reports" className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <Printer className="w-5 h-5 text-slate-600" />
                <span className="text-xs font-medium text-slate-700">
                  Reports
                </span>
              </Link>
              <Link href="/user/books" className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <ClipboardCheck className="w-5 h-5 text-slate-600" />
                <span className="text-xs font-medium text-slate-700">
                  Inventory
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
