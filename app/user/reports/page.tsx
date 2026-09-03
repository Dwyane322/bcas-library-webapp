"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import Select from "@/components/ui/select";
import StatsCard from "@/components/ui/stats-card";
import Badge from "@/components/ui/badge";
import GroupedBarChartCard from "@/components/charts/grouped-bar-chart-card";
import DonutChartCard from "@/components/charts/donut-chart-card";
import {
  getDashboardStats,
  getMostBorrowedBooks,
  getOverdueBooks,
  getCirculationActivity,
} from "@/lib/supabase/dashboard";
import type {
  DashboardStats,
  MostBorrowedBookRow,
  OverdueBookRow,
} from "@/lib/types";
import type { DailyCirculation } from "@/lib/supabase/dashboard";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("circulation");
  const [dateRange, setDateRange] = useState("30d");

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [circulationData, setCirculationData] = useState<DailyCirculation[]>([]);
  const [overdueBooks, setOverdueBooks] = useState<OverdueBookRow[]>([]);
  const [mostBorrowed, setMostBorrowed] = useState<MostBorrowedBookRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const days = dateRange === "7d" ? 7 : dateRange === "90d" ? 90 : dateRange === "year" ? 365 : 30;
        const [statsData, circData, overdueData, borrowedData] = await Promise.all([
          getDashboardStats(),
          getCirculationActivity(days),
          getOverdueBooks(),
          getMostBorrowedBooks(10),
        ]);
        setStats(statsData);
        setCirculationData(circData);
        setOverdueBooks(overdueData);
        setMostBorrowed(borrowedData);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [dateRange]);

  const overdueSlices = [
    { name: "1-7 Days", value: overdueBooks.filter((o) => o.days_overdue <= 7).length, color: "#047857" },
    { name: "8-14 Days", value: overdueBooks.filter((o) => o.days_overdue > 7 && o.days_overdue <= 14).length, color: "#fca5a5" },
    { name: "15+ Days", value: overdueBooks.filter((o) => o.days_overdue > 14).length, color: "#e2e8f0" },
  ];

  const reportStats = stats
    ? [
        {
          label: "Currently Borrowed",
          value: stats.total_borrowed.toLocaleString(),
          trend: "Active loans",
          trendUp: true,
          icon: "arrows-right-left",
        },
        {
          label: "Total Returned",
          value: stats.total_returned.toLocaleString(),
          trend: "All time",
          trendUp: true,
          icon: "users",
        },
        {
          label: "Overdue Items",
          value: stats.total_overdue.toLocaleString(),
          trend: stats.total_overdue > 0 ? "Requires attention" : "All clear",
          trendUp: stats.total_overdue === 0,
          icon: "alert-triangle",
        },
        {
          label: "Overdue Books",
          value: overdueBooks.length.toString(),
          detail: "Individual overdue records",
          icon: "package",
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Review circulation statistics and library performance."
        actions={
          <>
            <Select
              value={reportType}
              onChange={setReportType}
              options={[
                { label: "Circulation Summary", value: "circulation" },
                { label: "Overdue Report", value: "overdue" },
                { label: "Popular Books", value: "popular" },
              ]}
            />
            <Select
              value={dateRange}
              onChange={setDateRange}
              options={[
                { label: "Last 7 Days", value: "7d" },
                { label: "Last 30 Days", value: "30d" },
                { label: "Last 90 Days", value: "90d" },
                { label: "This Year", value: "year" },
              ]}
            />
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </>
        }
      />

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-24 mb-3" />
                <div className="h-8 bg-slate-100 rounded w-16" />
              </div>
            ))
          : reportStats.map((stat) => (
              <StatsCard key={stat.label} {...stat} />
            ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2">
          <GroupedBarChartCard
            title="Circulation Activity"
            data={circulationData}
            xAxisKey="day"
            bars={[
              { dataKey: "borrows", fill: "#047857", name: "Borrows" },
              { dataKey: "returns", fill: "#c7d2fe", name: "Returns" },
            ]}
          />
        </div>
        <div>
          <DonutChartCard
            title="Overdue Status"
            data={overdueSlices}
            centerLabel="Total"
          />
        </div>
      </div>

      {/* Most borrowed table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Most Borrowed Titles</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500">
                  Title & Author
                </th>
                <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500 hidden sm:table-cell">
                  Category
                </th>
                <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500">
                  Checkouts
                </th>
                <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400">Loading...</td>
                </tr>
              ) : mostBorrowed.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400">No data available.</td>
                </tr>
              ) : (
                mostBorrowed.map((book) => (
                  <tr
                    key={book.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 sm:px-5 py-4">
                      <div className="font-medium text-slate-800">{book.title}</div>
                      <div className="text-xs text-slate-500">{book.author}</div>
                      <div className="text-xs text-slate-400 sm:hidden mt-0.5">{book.classification_name}</div>
                    </td>
                    <td className="px-4 sm:px-5 py-4 text-slate-600 hidden sm:table-cell">{book.classification_name}</td>
                    <td className="px-4 sm:px-5 py-4 font-semibold text-slate-800">
                      {book.borrow_count}
                    </td>
                    <td className="px-4 sm:px-5 py-4">
                      <Badge label={book.current_status} />
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
