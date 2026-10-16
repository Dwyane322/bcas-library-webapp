"use client";

import { useState, useEffect, useMemo } from "react";
import { Download, Printer } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import SearchInput from "@/components/ui/search-input";
import Select from "@/components/ui/select";
import DataTable from "@/components/ui/data-table";
import { getActivityLogs } from "@/lib/supabase";
import type { ActivityLog } from "@/lib/types";

const actionStyles: Record<string, string> = {
  ADD: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  EDIT: "bg-blue-50 text-blue-700 border border-blue-200",
  DELETE: "bg-red-50 text-red-700 border border-red-200",
  BORROW: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  RETURN: "bg-slate-100 text-slate-700 border border-slate-200",
  RESTORE: "bg-amber-50 text-amber-700 border border-amber-200",
  PERMANENT_DELETE: "bg-red-100 text-red-800 border border-red-300",
};

const roleStyles: Record<string, string> = {
  Admin: "bg-purple-100 text-purple-700",
  Librarian: "bg-blue-100 text-blue-700",
  Staff: "bg-slate-100 text-slate-600",
};

export default function ActivityLogsPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        setLogs(await getActivityLogs());
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      const matchesEntity = entityFilter === "all" || log.entity_type === entityFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === "" ||
        (log.staff_name ?? "").toLowerCase().includes(q) ||
        (log.staff_id ?? "").toLowerCase().includes(q) ||
        (log.description ?? "").toLowerCase().includes(q);
      return matchesAction && matchesEntity && matchesSearch;
    });
  }, [logs, search, actionFilter, entityFilter]);

  const handleExportCSV = () => {
    const header = "Date & Time,Staff ID,Staff Name,Role,Action,Type,Details\n";
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = filtered
      .map((log) =>
        [
          esc(new Date(log.created_at).toLocaleString()),
          esc(log.staff_id ?? ""),
          esc(log.staff_name ?? ""),
          esc(log.staff_role ?? ""),
          esc(log.action),
          esc(log.entity_type),
          esc(log.description),
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `activity_logs_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handlePrint = () => {
    window.print();
  };

  const columns = [
    {
      key: "date",
      header: "Date & Time",
      render: (row: ActivityLog) => (
        <div className="text-slate-600 whitespace-nowrap">
          {new Date(row.created_at).toLocaleString()}
        </div>
      ),
    },
    {
      key: "staff",
      header: "Performed By",
      render: (row: ActivityLog) => (
        <div>
          <div className="font-medium text-slate-800">{row.staff_name ?? "—"}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {row.staff_role && (
              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${roleStyles[row.staff_role] ?? "bg-slate-100 text-slate-600"}`}>
                {row.staff_role}
              </span>
            )}
            {row.staff_id && (
              <span className="text-xs text-slate-400 font-mono">{row.staff_id}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (row: ActivityLog) => (
        <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap ${actionStyles[row.action] ?? "bg-slate-100 text-slate-600"}`}>
          {row.action.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "entity",
      header: "Type",
      render: (row: ActivityLog) => (
        <span className="capitalize text-slate-600">{row.entity_type.replace("_", " ")}</span>
      ),
    },
    {
      key: "details",
      header: "Details",
      render: (row: ActivityLog) => (
        <div className="text-slate-600 max-w-md">{row.description}</div>
      ),
    },
  ];

  return (
    <>
      <div className="animate-fade-in-up stagger-1 no-print">
        <PageHeader
          title="Activity Logs"
          subtitle="Audit trail of adds, edits, deletes, borrows and returns — with the staff member responsible for each."
          actions={
            <>
              <Select
                value={actionFilter}
                onChange={setActionFilter}
                options={[
                  { label: "All Actions", value: "all" },
                  { label: "Add", value: "ADD" },
                  { label: "Edit", value: "EDIT" },
                  { label: "Delete", value: "DELETE" },
                  { label: "Borrow", value: "BORROW" },
                  { label: "Return", value: "RETURN" },
                  { label: "Restore", value: "RESTORE" },
                  { label: "Permanent Delete", value: "PERMANENT_DELETE" },
                ]}
              />
              <Select
                value={entityFilter}
                onChange={setEntityFilter}
                options={[
                  { label: "All Types", value: "all" },
                  { label: "Books", value: "book" },
                  { label: "Transactions", value: "transaction" },
                  { label: "Students", value: "student" },
                  { label: "Staff", value: "staff" },
                  { label: "School Years", value: "school_year" },
                  { label: "Archive", value: "archive" },
                ]}
              />
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
                <Printer className="w-4 h-4" />
                Print
              </button>
            </>
          }
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 animate-fade-in-up stagger-2" data-print-area>
        <div className="hidden print:block mb-4 print-header">
          <h2 className="text-xl font-bold text-slate-900">BCAS Library — Activity Logs</h2>
          <p className="text-sm text-slate-500">
            Generated {new Date().toLocaleString()} • {filtered.length} record(s)
          </p>
        </div>
        <div className="mb-5 no-print">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by staff name, staff ID, or details..."
          />
        </div>
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading activity logs...</div>
        ) : (
          <>
            <div className="print:hidden">
              <DataTable
                columns={columns}
                data={filtered}
                pageSize={10}
                keyExtractor={(row) => row.id}
                emptyMessage="No activity recorded yet. Adds, edits, deletes, borrows and returns will appear here."
              />
            </div>
            {/* Print-only full list (screen table is paginated) */}
            <div className="hidden print:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left px-2 py-2 font-semibold text-slate-500">Date &amp; Time</th>
                    <th className="text-left px-2 py-2 font-semibold text-slate-500">Performed By</th>
                    <th className="text-left px-2 py-2 font-semibold text-slate-500">Action</th>
                    <th className="text-left px-2 py-2 font-semibold text-slate-500">Type</th>
                    <th className="text-left px-2 py-2 font-semibold text-slate-500">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-2 py-2">
                        <div className="font-medium text-slate-800">{log.staff_name ?? "—"}</div>
                        <div className="text-xs text-slate-500">{log.staff_role ?? ""}{log.staff_id ? ` • ${log.staff_id}` : ""}</div>
                      </td>
                      <td className="px-2 py-2 text-slate-600">{log.action.replace("_", " ")}</td>
                      <td className="px-2 py-2 text-slate-600 capitalize">{log.entity_type.replace("_", " ")}</td>
                      <td className="px-2 py-2 text-slate-600">{log.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="py-8 text-center text-slate-400 text-sm">No activity recorded yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
