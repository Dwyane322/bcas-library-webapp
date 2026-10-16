"use client";

import { useState, useEffect } from "react";
import { Download, FileText, BarChart3, DollarSign } from "lucide-react";
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
import { getPendingFinesTotal, getPaidFinesTotal } from "@/lib/supabase/fines";
import { getSchoolYearSummaries } from "@/lib/supabase/school-years";
import type {
  DashboardStats,
  MostBorrowedBookRow,
  OverdueBookRow,
  SchoolYearSummary,
} from "@/lib/types";
import type { DailyCirculation } from "@/lib/supabase/dashboard";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("circulation");
  const [dateRange, setDateRange] = useState("30d");

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [circulationData, setCirculationData] = useState<DailyCirculation[]>([]);
  const [overdueBooks, setOverdueBooks] = useState<OverdueBookRow[]>([]);
  const [mostBorrowed, setMostBorrowed] = useState<MostBorrowedBookRow[]>([]);
  const [pendingFines, setPendingFines] = useState(0);
  const [paidFines, setPaidFines] = useState(0);
  const [schoolYearSummaries, setSchoolYearSummaries] = useState<SchoolYearSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const days = dateRange === "7d" ? 7 : dateRange === "90d" ? 90 : dateRange === "year" ? 365 : 30;
        const [statsData, circData, overdueData, borrowedData, pending, paid, summaries] = await Promise.all([
          getDashboardStats(),
          getCirculationActivity(days),
          getOverdueBooks(),
          getMostBorrowedBooks(10),
          getPendingFinesTotal(),
          getPaidFinesTotal(),
          getSchoolYearSummaries(),
        ]);
        setStats(statsData);
        setCirculationData(circData);
        setOverdueBooks(overdueData);
        setMostBorrowed(borrowedData);
        setPendingFines(pending);
        setPaidFines(paid);
        setSchoolYearSummaries(summaries);
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
          label: "Pending Fines",
          value: `₱${pendingFines.toFixed(2)}`,
          trend: "Collected fines",
          trendUp: false,
          icon: "alert-triangle",
        },
      ]
    : [];

  const handleExportCSV = () => {
    let csvContent = "";
    let filename = "";

    if (reportType === "circulation") {
      csvContent = "Day,Borrows,Returns\n";
      circulationData.forEach(row => {
        csvContent += `${row.day},${row.borrows},${row.returns}\n`;
      });
      filename = `circulation_report_${dateRange}.csv`;
    } else if (reportType === "overdue") {
      csvContent = "Student,Book,Days Overdue,Date Borrowed,Due Date\n";
      overdueBooks.forEach(row => {
        csvContent += `"${row.student_name}","${row.book_title}",${row.days_overdue},${new Date(row.date_borrowed).toLocaleDateString()},${new Date(row.due_date).toLocaleDateString()}\n`;
      });
      filename = `overdue_report_${dateRange}.csv`;
    } else if (reportType === "popular") {
      csvContent = "Title,Author,Category,Checkouts,Status\n";
      mostBorrowed.forEach(row => {
        csvContent += `"${row.title}","${row.author}","${row.classification_name}",${row.borrow_count},${row.current_status}\n`;
      });
      filename = `popular_books_report_${dateRange}.csv`;
    } else if (reportType === "school-years") {
      csvContent = "School Year,Total Transactions,Borrowed,Returned,Overdue,Total Fines,Fines Collected\n";
      schoolYearSummaries.forEach(row => {
        csvContent += `"${row.school_year_name}",${row.total_transactions},${row.currently_borrowed},${row.returned},${row.overdue},${row.total_fines},${row.fines_collected}\n`;
      });
      filename = `school_year_summary.csv`;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="animate-fade-in-up stagger-1 no-print">
        <PageHeader
        title="Reports & Analytics"
        actions={
          <>
            <Select
              value={reportType}
              onChange={setReportType}
              options={[
                { label: "Circulation Summary", value: "circulation" },
                { label: "Overdue Report", value: "overdue" },
                { label: "Popular Books", value: "popular" },
                { label: "School Year Summary", value: "school-years" },
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
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Print
              </button>
            </div>
          </>
        }
      />
      </div>

      <div data-print-area>
      {/* Print-only report header */}
      <div className="hidden print:block mb-4 print-header">
        <h2 className="text-xl font-bold text-slate-900">
          BCAS Library — {reportType === "circulation" ? "Circulation Summary" : reportType === "overdue" ? "Overdue Report" : reportType === "popular" ? "Popular Books" : "School Year Summary"}
        </h2>
        <p className="text-sm text-slate-500">
          Generated {new Date().toLocaleString()} • Range: {dateRange === "7d" ? "Last 7 Days" : dateRange === "90d" ? "Last 90 Days" : dateRange === "year" ? "This Year" : "Last 30 Days"}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6 animate-fade-in-up stagger-2">
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
      {(reportType === "circulation" || reportType === "overdue") && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6 animate-fade-in-up stagger-3">
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
      )}

      {/* School Year Summary */}
      {reportType === "school-years" && (
        <div className="bg-white rounded-xl border border-slate-200 mb-6 animate-fade-in-up stagger-3">
          <div className="flex items-center gap-2 p-5 border-b border-slate-100">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">School Year Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500">School Year</th>
                  <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500">Total Transactions</th>
                  <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500">Borrowed</th>
                  <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500">Returned</th>
                  <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500">Overdue</th>
                  <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500">Total Fines</th>
                  <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500">Fines Collected</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400">Loading...</td>
                  </tr>
                ) : schoolYearSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400">No school year data available.</td>
                  </tr>
                ) : (
                  schoolYearSummaries.map((summary) => (
                    <tr key={summary.school_year_id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-4 sm:px-5 py-4 font-medium text-slate-800">{summary.school_year_name}</td>
                      <td className="px-4 sm:px-5 py-4 text-slate-600">{summary.total_transactions}</td>
                      <td className="px-4 sm:px-5 py-4 text-slate-600">{summary.currently_borrowed}</td>
                      <td className="px-4 sm:px-5 py-4 text-slate-600">{summary.returned}</td>
                      <td className="px-4 sm:px-5 py-4 text-slate-600">{summary.overdue}</td>
                      <td className="px-4 sm:px-5 py-4 text-slate-600">₱{summary.total_fines.toFixed(2)}</td>
                      <td className="px-4 sm:px-5 py-4 text-emerald-600">₱{summary.fines_collected.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Most borrowed table */}
      {(reportType === "circulation" || reportType === "popular") && (
        <div className="bg-white rounded-xl border border-slate-200 animate-fade-in-up stagger-4">
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
      )}

      {/* Overdue Report */}
      {reportType === "overdue" && (
        <div className="bg-white rounded-xl border border-slate-200 animate-fade-in-up stagger-4">
          <div className="flex items-center gap-2 p-5 border-b border-slate-100">
            <DollarSign className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-slate-900">Overdue Books</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500">Student</th>
                  <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500">Book</th>
                  <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500">Days Overdue</th>
                  <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500">Date Borrowed</th>
                  <th className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">Loading...</td>
                  </tr>
                ) : overdueBooks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">No overdue books.</td>
                  </tr>
                ) : (
                  overdueBooks.map((row) => (
                    <tr key={row.transaction_id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-4 sm:px-5 py-4">
                        <div className="font-medium text-slate-800">{row.student_name}</div>
                        <div className="text-xs text-slate-500">{row.student_section}</div>
                      </td>
                      <td className="px-4 sm:px-5 py-4">
                        <div className="font-medium text-slate-800">{row.book_title}</div>
                        <div className="text-xs text-slate-500">{row.book_author}</div>
                      </td>
                      <td className="px-4 sm:px-5 py-4">
                        <span className={`font-semibold ${row.days_overdue > 14 ? "text-red-600" : row.days_overdue > 7 ? "text-amber-600" : "text-emerald-600"}`}>
                          {row.days_overdue} days
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-slate-600">
                        {new Date(row.date_borrowed).toLocaleDateString()}
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-slate-600">
                        {new Date(row.due_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
