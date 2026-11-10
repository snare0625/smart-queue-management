import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueueAction, QueueState } from "@/lib/engine";
import { iso, rowsToState, stateToRows, visitRow, type StaffRow, type VisitRow } from "./mapping";

/**
 * All database reads and writes for the queue live here (the "repository"), so the rest of the app never writes SQL-ish
 * calls itself. Each supabase-js call below becomes one SQL statement, e.g.
 *   .from("visits").update({ status: "serving", … }).eq("id", "A027").eq("status", "waiting")
 *   ≈ UPDATE visits SET status = 'serving', … WHERE id = 'A027' AND status = 'waiting' RETURNING id;
 */
export type Result = { ok: true } | { ok: false; error: string };
const OK: Result = { ok: true };

export async function loadState(sb: SupabaseClient): Promise<QueueState> {
  const [staff, visits] = await Promise.all([sb.from("staff").select("*"), sb.from("visits").select("*")]);
  if (staff.error) throw new Error(staff.error.message);
  if (visits.error) throw new Error(visits.error.message);
  return rowsToState(staff.data as StaffRow[], visits.data as VisitRow[]);
}

/**
 * Conditional updates = optimistic concurrency. Each update only matches if the row is still in the state we expect
 * ("still waiting"). If another front desk got there first, 0 rows change, and we report a conflict instead of
 * silently overwriting their work. The caller then reloads from the database.
 */
type Write = { data: unknown[] | null; error: { message: string } | null };
const guarded = ({ data, error }: Write, conflict: string): Result =>
  error ? { ok: false, error: error.message } : data?.length ? OK : { ok: false, error: conflict };

export async function persistAction(sb: SupabaseClient, action: QueueAction, before: QueueState, after: QueueState): Promise<Result> {
  const visits = () => sb.from("visits");
  switch (action.type) {
    case "join": {
      const { error } = await visits().insert(visitRow(action.customer, "waiting"));
      return error ? { ok: false, error: error.message } : OK;
    }
    case "serve": {
      const s = after.staff.find((x) => x.id === action.staffId)?.serving;
      if (!s) return OK;
      return guarded(
        await visits().update({ status: "serving", staff_id: action.staffId, started_at: iso(s.startedAt), expected_end: iso(s.expectedEnd) })
          .eq("id", action.customerId).eq("status", "waiting").select("id"),
        `${action.customerId} was already called by another desk`,
      );
    }
    case "complete": {
      const s = before.staff.find((x) => x.id === action.staffId)?.serving;
      if (!s) return OK;
      return guarded(await visits().update({ status: "completed", ended_at: iso(action.at) }).eq("id", s.customer.id).eq("status", "serving").select("id"), `${s.customer.id} was already finished`);
    }
    case "noShow":
      return guarded(await visits().update({ status: "no-show", ended_at: iso(action.at) }).eq("id", action.customerId).in("status", ["waiting", "serving"]).select("id"), `${action.customerId} is no longer in the queue`);
    case "cancel":
      return guarded(await visits().update({ status: "cancelled", ended_at: iso(action.at) }).eq("id", action.customerId).eq("status", "waiting").select("id"), `${action.customerId} is no longer waiting`);
  }
}

/** Replace everything with a fresh demo day. Order matters: visits reference staff, so clear visits before rewriting staff. */
export async function writeSeed(sb: SupabaseClient, state: QueueState): Promise<Result> {
  const rows = stateToRows(state);
  const steps = [
    () => sb.from("visits").delete().neq("id", ""), // supabase-js refuses an unfiltered delete; this matches every row
    () => sb.from("staff").upsert(rows.staff),
    () => sb.from("visits").insert(rows.visits),
  ];
  for (const step of steps) {
    const { error } = await step();
    if (error) return { ok: false, error: error.message };
  }
  return OK;
}
