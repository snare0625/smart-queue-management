import { canServe, staffStatus } from "./assign";
import { serviceById } from "./config";
import { learnDurations } from "./learning";
import { MIN } from "./scoring";
import type { Customer, QueueState, Staff, Visit } from "./types";

/**
 * Every change to the queue is an action. The reducer takes (state, action) and returns a NEW state — it never mutates —
 * so the same function drives the live UI (useReducer), the tests, and later the simulation and Supabase writes.
 *
 *   waiting ──serve──▶ serving ──complete──▶ history (completed, with actual duration)
 *      │                  └──────noShow────▶ history (no-show)
 *      ├──noShow─────────────────────────────▶ history (no-show)
 *      └──cancel─────────────────────────────▶ history (cancelled)
 */
export type QueueAction =
  | { type: "join"; customer: Customer }
  | { type: "serve"; customerId: string; staffId: string; at: number }
  | { type: "complete"; staffId: string; at: number }
  | { type: "noShow"; customerId: string; at: number }
  | { type: "cancel"; customerId: string; at: number };

/** Why `staffId` can't start serving `customerId` right now — or null if they can. Used to validate and to disable buttons. */
export function cannotServe(state: QueueState, customerId: string, staffId: string, at: number): string | null {
  const c = state.waiting.find((x) => x.id === customerId);
  const s = state.staff.find((x) => x.id === staffId);
  if (!c) return "Customer is not waiting";
  if (!s) return "Unknown staff member";
  if (!canServe(s, c.serviceId)) return `${s.name} doesn't handle ${serviceById(c.serviceId).name}`;
  const status = staffStatus(s, at);
  if (status !== "available") return `${s.name} is ${status === "break" ? "on a break" : "busy"}`;
  return null;
}

/** Best person to serve this customer immediately: free, qualified, and the most specialised (keeps generalists open). */
export function bestFreeStaff(state: QueueState, customerId: string, at: number): Staff | undefined {
  return state.staff.filter((s) => !cannotServe(state, customerId, s.id, at)).sort((a, b) => a.serviceIds.length - b.serviceIds.length)[0];
}

const mins = (from: number, to: number) => Math.max(0, (to - from) / MIN);
const leave = (state: QueueState, id: string) => state.waiting.filter((c) => c.id !== id);
const setStaff = (state: QueueState, id: string, patch: Partial<Staff>) => state.staff.map((s) => (s.id === id ? { ...s, ...patch } : s));
const servingStaff = (state: QueueState, customerId: string) => state.staff.find((s) => s.serving?.customer.id === customerId);

export function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case "join":
      if (state.waiting.some((c) => c.id === action.customer.id)) return state;
      return { ...state, waiting: [...state.waiting, action.customer] };

    case "serve": {
      if (cannotServe(state, action.customerId, action.staffId, action.at)) return state;
      const customer = state.waiting.find((c) => c.id === action.customerId)!;
      // Expected end uses what this service has ACTUALLY been taking lately, not just the configured duration.
      const expectedEnd = action.at + learnDurations(state.history)[customer.serviceId].estimateMin * MIN;
      return {
        ...state,
        waiting: leave(state, customer.id),
        staff: setStaff(state, action.staffId, { serving: { customer, serviceId: customer.serviceId, startedAt: action.at, expectedEnd } }),
      };
    }

    case "complete": {
      const s = state.staff.find((x) => x.id === action.staffId);
      if (!s?.serving) return state;
      const { customer, serviceId, startedAt } = s.serving;
      const visit: Visit = { customer, serviceId, staffId: s.id, outcome: "completed", startedAt, endedAt: action.at, waitMin: mins(customer.arrivedAt, startedAt), serviceMin: mins(startedAt, action.at) };
      return { ...state, staff: setStaff(state, s.id, { serving: undefined }), history: [...state.history, visit] };
    }

    case "noShow": {
      // Either called but never came to the desk (frees the staff member), or gone from the waiting room before being called.
      const s = servingStaff(state, action.customerId);
      if (s?.serving) {
        const { customer, serviceId, startedAt } = s.serving;
        const visit: Visit = { customer, serviceId, staffId: s.id, outcome: "no-show", endedAt: action.at, waitMin: mins(customer.arrivedAt, startedAt) };
        return { ...state, staff: setStaff(state, s.id, { serving: undefined }), history: [...state.history, visit] };
      }
      return dropWaiting(state, action.customerId, "no-show", action.at);
    }

    case "cancel":
      return dropWaiting(state, action.customerId, "cancelled", action.at);
  }
}

function dropWaiting(state: QueueState, customerId: string, outcome: Visit["outcome"], at: number): QueueState {
  const customer = state.waiting.find((c) => c.id === customerId);
  if (!customer) return state;
  const visit: Visit = { customer, serviceId: customer.serviceId, outcome, endedAt: at, waitMin: mins(customer.arrivedAt, at) };
  return { ...state, waiting: leave(state, customerId), history: [...state.history, visit] };
}
