"use client";

import { useState, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T extends Record<string, any>> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  keyExtractor: (row: T) => string;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  pageSize = 5,
  keyExtractor,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(data.length / pageSize);
  const start = (page - 1) * pageSize;
  const pageData = data.slice(start, start + pageSize);

  return (
    <div>
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle px-4 sm:px-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="text-left px-4 sm:px-5 py-3 font-semibold text-slate-500"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 sm:px-5 py-4">
                      {col.render
                        ? col.render(row)
                        : (row[col.key] as ReactNode)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-5 py-4 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            Showing {start + 1} to {Math.min(start + pageSize, data.length)} of{" "}
            {data.length} results
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                  p === page
                    ? "bg-emerald-700 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
