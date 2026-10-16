import { createClient } from "@/utils/client";
import { logActivity } from "@/lib/supabase/activity-logs";
import type { ActorInfo, ArchivedRecord } from "@/lib/types";

const supabase = createClient();
const LOCAL_KEY = "bcas_deleted_archive";

// ── Local mirror ──────────────────────────────────────────────

function readLocal(): ArchivedRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(row: ArchivedRecord) {
  if (typeof window === "undefined") return;
  try {
    const existing = readLocal().filter((r) => r.id !== row.id);
    window.localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify([row, ...existing].slice(0, 1000))
    );
  } catch {
    // ignore
  }
}

function patchLocal(id: string, patch: Partial<ArchivedRecord>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify(readLocal().map((r) => (r.id === id ? { ...r, ...patch } : r)))
    );
  } catch {
    // ignore
  }
}

function makeLocalId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ── Archive a deleted record (best-effort) ────────────────────

export interface ArchiveInput {
  entity_type?: string;
  entity_id?: string | null;
  data: Record<string, unknown> | null;
  actor?: ActorInfo | null;
}

export async function archiveRecord(input: ArchiveInput): Promise<ArchivedRecord | null> {
  const fallback: ArchivedRecord = {
    id: makeLocalId(),
    entity_type: input.entity_type ?? "book",
    entity_id: input.entity_id ?? null,
    data: input.data,
    deleted_by_staff_id: input.actor?.staffId ?? null,
    deleted_by_name: input.actor?.name ?? null,
    deleted_by_role: input.actor?.role ?? null,
    deleted_at: new Date().toISOString(),
    restored: false,
  };

  try {
    const { data, error } = await supabase
      .from("deleted_archive")
      .insert({
        entity_type: fallback.entity_type,
        entity_id: fallback.entity_id,
        data: fallback.data,
        deleted_by_staff_id: fallback.deleted_by_staff_id,
        deleted_by_name: fallback.deleted_by_name,
        deleted_by_role: fallback.deleted_by_role,
      })
      .select()
      .single();

    if (error) throw error;
    const row = (data as ArchivedRecord) ?? fallback;
    writeLocal(row);
    return row;
  } catch {
    writeLocal(fallback);
    return fallback;
  }
}

// ── Read ──────────────────────────────────────────────────────

export async function getArchivedRecords(): Promise<ArchivedRecord[]> {
  const local = readLocal();

  try {
    const { data, error } = await supabase
      .from("deleted_archive")
      .select("*")
      .order("deleted_at", { ascending: false });

    if (error) throw error;
    const remote = (data as ArchivedRecord[]) ?? [];
    if (remote.length === 0) return local;

    const seen = new Set(remote.map((r) => r.id));
    const onlyLocal = local.filter((l) => !seen.has(l.id));
    return [...onlyLocal, ...remote].sort(
      (a, b) => +new Date(b.deleted_at) - +new Date(a.deleted_at)
    );
  } catch {
    return local.sort((a, b) => +new Date(b.deleted_at) - +new Date(a.deleted_at));
  }
}

// ── Restore an archived *book* back into the books table ──────

export async function restoreArchivedBook(
  archivedId: string,
  actor?: ActorInfo | null
): Promise<void> {
  const records = await getArchivedRecords();
  const record = records.find((r) => r.id === archivedId);
  if (!record) throw new Error("Archived record not found.");
  if (record.entity_type !== "book") throw new Error("Only books can be restored.");

  const snapshot = (record.data ?? {}) as Record<string, unknown>;

  const payload: Record<string, unknown> = {
    title: snapshot.title,
    author: snapshot.author,
    accession_number: snapshot.accession_number,
    classification_id: snapshot.classification_id,
    shelf_location: snapshot.shelf_location ?? null,
    material_type: snapshot.material_type ?? "Book",
    status: "Available",
    is_library_use_only: snapshot.is_library_use_only ?? false,
    notes: snapshot.notes ?? null,
  };

  // Re-insert; if the accession number was re-used meanwhile, suffix it.
  let { error } = await supabase.from("books").insert(payload);
  if (error && /duplicate|unique|accession/i.test(error.message)) {
    payload.accession_number = `${String(payload.accession_number)}-R${Date.now().toString().slice(-4)}`;
    const retry = await supabase.from("books").insert(payload);
    error = retry.error;
  }
  if (error) throw error;

  try {
    await supabase.from("deleted_archive").update({ restored: true }).eq("id", archivedId);
  } catch {
    // table may not exist yet — local mirror still updated below
  }
  patchLocal(archivedId, { restored: true });

  await logActivity({
    action: "RESTORE",
    entity_type: "archive",
    entity_id: String(record.entity_id ?? archivedId),
    description: `Restored "${String(snapshot.title ?? "book")}" from the delete archive.`,
    metadata: { archived_id: archivedId, title: snapshot.title },
    actor,
  });
}

// ── Permanently delete an archived record ─────────────────────

export async function permanentlyDeleteArchived(
  archivedId: string,
  actor?: ActorInfo | null
): Promise<void> {
  const records = await getArchivedRecords();
  const record = records.find((r) => r.id === archivedId);

  try {
    const { error } = await supabase.from("deleted_archive").delete().eq("id", archivedId);
    if (error) throw error;
  } catch {
    // fall through — local mirror is removed either way
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        LOCAL_KEY,
        JSON.stringify(readLocal().filter((r) => r.id !== archivedId))
      );
    } catch {
      // ignore
    }
  }

  await logActivity({
    action: "PERMANENT_DELETE",
    entity_type: "archive",
    entity_id: String(record?.entity_id ?? archivedId),
    description: `Permanently deleted archived record "${String(
      (record?.data as Record<string, unknown> | null)?.title ?? archivedId
    )}".`,
    metadata: { archived_id: archivedId },
    actor,
  });
}
