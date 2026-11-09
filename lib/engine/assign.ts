import { MIN, scoreReasons } from "./scoring";
import type { Durations } from "./learning";
import type { Assignment, Ranked, Staff, StaffStatus } from "./types";

export const canServe = (s: Staff, serviceId: string) => s.serviceIds.includes(serviceId);

export function staffStatus(s: Staff, now: number): StaffStatus {
  if (s.breakUntil != null && s.breakUntil > now) return "break";
  if (s.serving) return "busy"; // busy until someone marks the visit Completed / No Show
  return "available";
}

export const isOverrunning = (s: Staff, now: number) => !!s.serving && s.serving.expectedEnd <= now;

/**
 * Earliest moment this person could start with a new customer.
 * Someone overrunning their expected end is assumed to need at least one more minute, so they're never shown as "free now" while still busy.
 */
export const freeAt = (s: Staff, now: number) => Math.max(now, s.breakUntil ?? 0, s.serving ? Math.max(s.serving.expectedEnd, now + MIN) : 0);

/**
 * Forecast the rest of the day by "playing the queue forward":
 *   repeat → take the staff member who frees up soonest; they call the highest-ranked customer they're qualified for;
 *            that customer's start time is the staff member's free time; push the staff member's free time on by the service duration.
 * Ties between staff go to the specialist (fewest skills), keeping generalists free for work only they can do.
 * This mirrors the real dispatch rule, so estimated waits and "who's next" come from the same logic.
 * `durations` are the learned minutes per service (see learning.ts); without them the configured durations are used.
 */
export function planQueue(ranked: Ranked[], staff: Staff[], now: number, durations: Durations = {}): Assignment[] {
  const minutes = (r: Ranked) => durations[r.service.id] ?? r.service.durationMin;
  const free = new Map(staff.map((s) => [s.id, freeAt(s, now)]));
  const waiting = [...ranked];
  const pool = [...staff];
  const planned = new Map<string, Assignment>();
  while (waiting.length && pool.length) {
    pool.sort((a, b) => free.get(a.id)! - free.get(b.id)! || a.serviceIds.length - b.serviceIds.length || a.name.localeCompare(b.name));
    const s = pool[0];
    const i = waiting.findIndex((r) => canServe(s, r.customer.serviceId));
    if (i < 0) { pool.shift(); continue; } // nothing left this person can do
    const [r] = waiting.splice(i, 1);
    const startAt = free.get(s.id)!;
    planned.set(r.customer.id, { ...r, staffId: s.id, startAt, estWaitMin: (startAt - now) / MIN, serviceMin: minutes(r) });
    free.set(s.id, startAt + minutes(r) * MIN);
  }
  return ranked.map((r) => planned.get(r.customer.id) ?? { ...r, staffId: null, startAt: null, estWaitMin: null, serviceMin: minutes(r) });
}

/** The next customer to be called: earliest planned start, ties broken by queue position. */
export const nextUp = (plan: Assignment[]): Assignment | undefined =>
  plan.filter((a) => a.startAt != null).sort((a, b) => a.startAt! - b.startAt! || a.position - b.position)[0];

const inMin = (t: number, now: number) => (t <= now ? "free now" : `free in ${Math.ceil((t - now) / MIN)} min`);

/** Why `next` is the one being called — staff match, anyone higher-ranked who's waiting on someone else, and the score breakdown. */
export function explainNext(plan: Assignment[], staff: Staff[], now: number): string[] {
  const next = nextUp(plan);
  if (!next) return plan.length ? ["No qualified staff on duty for anyone waiting"] : [];
  const byId = (id: string | null) => staff.find((s) => s.id === id);
  const who = byId(next.staffId)!;
  const lines = [`${who.name} is ${inMin(next.startAt!, now)} and handles ${next.service.name}`];
  const top = plan[0];
  if (next.position === 1) {
    if (plan[1]) lines.push(`Highest score: ${Math.round(next.score)} vs ${Math.round(plan[1].score)} for ${plan[1].customer.id}`);
  } else {
    lines.push(`Best-ranked customer ${who.name} can serve (#${next.position} in queue)`);
    const topStaff = byId(top.staffId);
    lines.push(topStaff ? `#1 ${top.customer.id} needs ${top.service.name} — ${topStaff.name} ${inMin(top.startAt!, now)}` : `#1 ${top.customer.id} needs ${top.service.name} — no qualified staff on duty`);
  }
  const est = Math.round(next.serviceMin);
  lines.push(...scoreReasons(next).slice(0, 2), `Estimated service time: ${est} min${est !== next.service.durationMin ? ` (learned; default ${next.service.durationMin})` : ""}`);
  return lines;
}
