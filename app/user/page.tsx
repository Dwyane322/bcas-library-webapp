"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookMarked,
  FileText,
  BookCopy,
  AlertTriangle,
  ClipboardList,
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4 animate-fade-in-up stagger-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Dashboard
          </h2>
        </div>
        <Link href="/user/scan" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
          <BookMarked className="w-4 h-4" />
          <span>Borrow Book</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fade-in-up stagger-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Total Books
            </span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">
            {loading ? "—" : totalBooks.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fade-in-up stagger-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Currently Borrowed
            </span>
            <BookCopy className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">
            {loading ? "—" : stats.total_borrowed.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-amber-300 p-5 animate-fade-in-up stagger-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">
              Overdue Books
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-amber-600">
            {loading ? "—" : stats.total_overdue.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 animate-fade-in-up stagger-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Total Returns
            </span>
            <ClipboardList className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">
            {loading ? "—" : stats.total_returned.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 animate-fade-in-up stagger-6">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">
            Recent Transactions
          </h3>
          <Link
            href="/user/transactions"
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
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
    </>
  );
}
