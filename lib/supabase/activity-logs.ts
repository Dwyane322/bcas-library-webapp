import { createClient } from "@/utils/client";
import { getSession } from "@/app/auth/actions";
import type {
  ActivityAction,
  ActivityEntity,
  ActivityLog,
  ActorInfo,
} from "@/lib/types";

const supabase = createClient();
const LOCAL_KEY = "bcas_activity_logs";

// ── Actor ─────────────────────────────────────────────────────

/** Resolve the currently signed-in staff member (for attribution). */
export async function getCurrentActor(): Promise<ActorInfo | null> {
  try {
    const session = await getSession();
    if (!session) return null;
    return { staffId: session.staffId, name: session.name, role: session.role };
  } catch {
    return null;
  }
}

// ── Local mirror (keeps the feature working even before the
//    005 migration is applied, and as an offline backup) ──────

function readLocal(): ActivityLog[] {
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

function writeLocal(log: ActivityLog) {
  if (typeof window === "undefined") return;
  try {
    const existing = readLocal();
    window.localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify([log, ...existing].slice(0, 2000))
    );
  } catch {
    // storage full / unavailable — ignore
  }
}

function removeLocal(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify(readLocal().filter((l) => l.id !== id))
    );
  } catch {
    // ignore
  }
}

// ── Write (best-effort: audit logging must never break the
//    underlying add/edit/delete/borrow operation) ─────────────

export interface LogActivityInput {
  action: ActivityAction;
  entity_type: ActivityEntity;
  entity_id?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  actor?: ActorInfo | null;
}

export async function logActivity(input: LogActivityInput): Promise<ActivityLog> {
  const actor = input.actor ?? (await getCurrentActor());

  const fallback: ActivityLog = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    staff_id: actor?.staffId ?? null,
    staff_name: actor?.name ?? null,
    staff_role: actor?.role ?? null,
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id ?? null,
    description: input.description,
    metadata: input.metadata ?? null,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("activity_logs")
      .insert({
        staff_id: fallback.staff_id,
        staff_name: fallback.staff_name,
        staff_role: fallback.staff_role,
        action: fallback.action,
        entity_type: fallback.entity_type,
        entity_id: fallback.entity_id,
        description: fallback.description,
        metadata: fallback.metadata,
      })
      .select()
      .single();

    if (error) throw error;
    const row = (data as ActivityLog) ?? fallback;
    writeLocal(row);
    return row;
  } catch {
    writeLocal(fallback);
    return fallback;
  }
}

// ── Read (Supabase first, merged with the local mirror so no
//    entries are lost when the table does not exist yet) ──────

export async function getActivityLogs(limit = 500): Promise<ActivityLog[]> {
  const local = readLocal();

  try {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    const remote = (data as ActivityLog[]) ?? [];
    if (remote.length === 0) return local.slice(0, limit);

    const seen = new Set(remote.map((r) => r.id));
    const onlyLocal = local.filter((l) => !seen.has(l.id));
    return [...onlyLocal, ...remote]
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, limit);
  } catch {
    return local
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, limit);
  }
}

export async function deleteActivityLog(id: string): Promise<void> {
  try {
    const { error } = await supabase.from("activity_logs").delete().eq("id", id);
    if (error) throw error;
  } catch {
    // fall through to local removal either way
  }
  removeLocal(id);
}
