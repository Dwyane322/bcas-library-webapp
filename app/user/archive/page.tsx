"use client";

import { useState, useEffect, useMemo } from "react";
import { Archive, RotateCcw, Trash2, ShieldAlert } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import SearchInput from "@/components/ui/search-input";
import DataTable from "@/components/ui/data-table";
import { ConfirmModal } from "@/components/ui/modal";
import {
  getArchivedRecords,
  restoreArchivedBook,
  permanentlyDeleteArchived,
  getCurrentActor,
} from "@/lib/supabase";
import { canManageArchive, STAFF_RESTRICTED_MESSAGE } from "@/lib/permissions";
import type { ArchivedRecord, StaffRole } from "@/lib/types";

export default function ArchivePage() {
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState<ArchivedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<StaffRole | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ArchivedRecord | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<ArchivedRecord | null>(null);

  const allowManage = role ? canManageArchive(role) : true;
  const staffRestricted = role === "Staff";

  useEffect(() => {
    async function fetch() {
      try {
        const [data, actor] = await Promise.all([
          getArchivedRecords(),
          getCurrentActor().catch(() => null),
        ]);
        setRecords(data);
        if (actor) setRole(actor.role);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const d = (r.data ?? {}) as Record<string, unknown>;
      return [d.title, d.author, d.accession_number, r.deleted_by_name, r.entity_type]
        .map((v) => String(v ?? "").toLowerCase())
        .some((v) => v.includes(q));
    });
  }, [records, search]);

  async function refresh() {
    setRecords(await getArchivedRecords());
  }

  const handleRestore = async () => {
    if (!restoreTarget || !allowManage) return;
    setBusy(true);
    setError(null);
    try {
      const actor = await getCurrentActor().catch(() => null);
      await restoreArchivedBook(restoreTarget.id, actor);
      setRestoreTarget(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to restore record.");
    } finally {
      setBusy(false);
    }
  };

  const handlePurge = async () => {
    if (!purgeTarget || !allowManage) return;
    setBusy(true);
    setError(null);
    try {
      const actor = await getCurrentActor().catch(() => null);
      await permanentlyDeleteArchived(purgeTarget.id, actor);
      setPurgeTarget(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to permanently delete record.");
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: "book",
      header: "Deleted Record",
      render: (row: ArchivedRecord) => {
        const d = (row.data ?? {}) as Record<string, unknown>;
        return (
          <div>
            <div className="font-medium text-slate-800">{String(d.title ?? row.entity_id ?? "Unknown")}</div>
            <div className="text-xs text-slate-500">
              {String(d.author ?? "")}
              {d.accession_number ? ` • Accession #: ${String(d.accession_number)}` : ""}
            </div>
          </div>
        );
      },
    },
    {
      key: "deletedBy",
      header: "Deleted By",
      render: (row: ArchivedRecord) => (
        <div>
          <div className="font-medium text-slate-800">{row.deleted_by_name ?? "—"}</div>
          <div className="text-xs text-slate-500">
            {[row.deleted_by_role, row.deleted_by_staff_id].filter(Boolean).join(" • ")}
          </div>
        </div>
      ),
    },
    {
      key: "deletedAt",
      header: "Deleted At",
      render: (row: ArchivedRecord) => (
        <div className="text-slate-600 whitespace-nowrap">
          {new Date(row.deleted_at).toLocaleString()}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: ArchivedRecord) =>
        row.restored ? (
          <span className="inline-block px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Restored
          </span>
        ) : (
          <span className="inline-block px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Archived
          </span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: ArchivedRecord) => {
        if (!allowManage || row.restored) return <span className="text-slate-300 text-xs">—</span>;
        return (
          <div className="flex items-center gap-2">
            {row.entity_type === "book" && (
              <button
                onClick={() => setRestoreTarget(row)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-white text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore
              </button>
            )}
            <button
              onClick={() => setPurgeTarget(row)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  const restoreTitle = (() => {
    if (!restoreTarget) return "";
    const d = (restoreTarget.data ?? {}) as Record<string, unknown>;
    return String(d.title ?? restoreTarget.entity_id ?? "this record");
  })();

  const purgeTitle = (() => {
    if (!purgeTarget) return "";
    const d = (purgeTarget.data ?? {}) as Record<string, unknown>;
    return String(d.title ?? purgeTarget.entity_id ?? "this record");
  })();

  return (
    <>
      <div className="animate-fade-in-up stagger-1">
        <PageHeader
          title="Delete Archive"
          subtitle="Deleted books are kept here instead of being lost — restore them or purge them permanently."
        />
      </div>

      {staffRestricted && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-sm text-amber-800 animate-fade-in-up stagger-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{STAFF_RESTRICTED_MESSAGE} Restoring and purging archived records requires a Librarian or Admin.</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 animate-fade-in-up stagger-3">
        <div className="mb-5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search archived records by title, author, or accession #..."
          />
        </div>
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading archive...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Archive className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              {records.length === 0
                ? "Archive is empty. Deleted books will appear here."
                : "No archived records match your search."}
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            pageSize={10}
            keyExtractor={(row) => row.id}
            emptyMessage="Archive is empty."
          />
        )}
      </div>

      <ConfirmModal
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
        title="Restore Book"
        message={`Restore "${restoreTitle}" back to the books inventory?`}
        confirmLabel="Restore"
        confirming={busy}
      />

      <ConfirmModal
        open={!!purgeTarget}
        onClose={() => setPurgeTarget(null)}
        onConfirm={handlePurge}
        title="Permanently Delete"
        message={`Permanently delete "${purgeTitle}" from the archive? This cannot be undone.`}
        confirmLabel="Delete Forever"
        confirming={busy}
      />
    </>
  );
}
