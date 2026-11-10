import type { Customer, Priority, QueueState, Staff, Visit } from "@/lib/engine";

/**
 * Translating between database rows (snake_case, ISO timestamp strings, one `visits` row per ticket)
 * and the engine's shapes (camelCase, epoch ms, waiting / staff.serving / history). Pure functions, so they're unit-tested.
 */
export interface StaffRow { id: string; name: string; service_ids: string[]; avatar: string | null; break_until: string | null; sort_order: number }
export type VisitStatus = "waiting" | "serving" | Visit["outcome"];
export interface VisitRow {
  id: string; name: string; service_id: string; priority: Priority; arrived_at: string; appointment_at: string | null;
  status: VisitStatus; staff_id: string | null; started_at: string | null; expected_end: string | null; ended_at: string | null;
}

const MIN = 60_000;
export const iso = (ms: number | undefined) => (ms == null ? null : new Date(ms).toISOString());
const ms = (t: string | null) => (t == null ? undefined : Date.parse(t));

const toCustomer = (r: VisitRow): Customer => ({
  id: r.id, name: r.name, serviceId: r.service_id, priority: r.priority, arrivedAt: Date.parse(r.arrived_at),
  ...(r.appointment_at ? { appointmentAt: Date.parse(r.appointment_at) } : {}),
});

export function rowsToState(staffRows: StaffRow[], visitRows: VisitRow[]): QueueState {
  const servingBy = new Map(visitRows.filter((v) => v.status === "serving" && v.staff_id).map((v) => [v.staff_id!, v]));
  const staff: Staff[] = [...staffRows].sort((a, b) => a.sort_order - b.sort_order).map((r) => {
    const v = servingBy.get(r.id);
    return {
      id: r.id, name: r.name, serviceIds: r.service_ids,
      ...(r.avatar ? { avatar: r.avatar } : {}),
      ...(r.break_until ? { breakUntil: Date.parse(r.break_until) } : {}),
      ...(v ? { serving: { customer: toCustomer(v), serviceId: v.service_id, startedAt: Date.parse(v.started_at!), expectedEnd: Date.parse(v.expected_end!) } } : {}),
    };
  });
  const history: Visit[] = visitRows
    .filter((v) => v.status !== "waiting" && v.status !== "serving")
    .map((v) => {
      const endedAt = Date.parse(v.ended_at!);
      const startedAt = ms(v.started_at);
      const timed = v.status === "completed" && startedAt != null;
      return {
        customer: toCustomer(v), serviceId: v.service_id, outcome: v.status as Visit["outcome"], endedAt,
        ...(v.staff_id ? { staffId: v.staff_id } : {}),
        ...(timed ? { startedAt, serviceMin: (endedAt - startedAt) / MIN } : {}),
        // waited = until called (or, if never called, until they left)
        waitMin: Math.max(0, ((startedAt ?? endedAt) - Date.parse(v.arrived_at)) / MIN),
      };
    })
    .sort((a, b) => a.endedAt - b.endedAt);
  return { waiting: visitRows.filter((v) => v.status === "waiting").map(toCustomer), staff, history };
}

export const visitRow = (c: Customer, status: VisitStatus, extra: Partial<VisitRow> = {}): VisitRow => ({
  id: c.id, name: c.name, service_id: c.serviceId, priority: c.priority, arrived_at: iso(c.arrivedAt)!, appointment_at: iso(c.appointmentAt),
  status, staff_id: null, started_at: null, expected_end: null, ended_at: null, ...extra,
});

/** The whole state as rows — used to write the demo seed. */
export function stateToRows(state: QueueState): { staff: StaffRow[]; visits: VisitRow[] } {
  return {
    staff: state.staff.map((s, i) => ({ id: s.id, name: s.name, service_ids: s.serviceIds, avatar: s.avatar ?? null, break_until: iso(s.breakUntil), sort_order: i })),
    visits: [
      ...state.waiting.map((c) => visitRow(c, "waiting")),
      ...state.staff.flatMap((s) => (s.serving
        ? [visitRow(s.serving.customer, "serving", { staff_id: s.id, started_at: iso(s.serving.startedAt), expected_end: iso(s.serving.expectedEnd) })]
        : [])),
      ...state.history.map((v) => visitRow(v.customer, v.outcome, { staff_id: v.staffId ?? null, started_at: iso(v.startedAt), ended_at: iso(v.endedAt) })),
    ],
  };
}

/** Highest ticket number in use + 1, so new tickets continue the sequence after a reload. */
export function nextTicketNumber(state: QueueState): number {
  const ids = [...state.waiting.map((c) => c.id), ...state.staff.flatMap((s) => (s.serving ? [s.serving.customer.id] : [])), ...state.history.map((v) => v.customer.id)];
  return Math.max(0, ...ids.map((id) => Number(id.replace(/\D/g, "")) || 0)) + 1;
}
