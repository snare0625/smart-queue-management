import { canServe, staffStatus } from "./assign";
import { ROSTER, SERVICES, WEIGHTS, type Weights } from "./config";
import { queueReducer } from "./lifecycle";
import { MIN, rankQueue } from "./scoring";
import type { Customer, Priority, QueueState, Staff, Visit } from "./types";

// ─── 1. Generating a day ──────────────────────────────────────────────────────────────────────────────────

/**
 * A seeded pseudo-random number generator (mulberry32). Same seed → same "random" day, every time.
 * That's what makes the comparison fair: every algorithm faces exactly the same customers, and results are reproducible.
 */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickWeighted = <T,>(r: () => number, items: [T, number][]): T => {
  let x = r() * items.reduce((s, [, w]) => s + w, 0);
  for (const [item, w] of items) if ((x -= w) < 0) return item;
  return items[items.length - 1][0];
};

/** What the simulator knows that the queue doesn't: how long the visit will REALLY take, and how long they'll wait before walking out. */
export interface SimArrival { customer: Customer; actualMin: number; patienceMin: number }
export interface DayPlan { seed: number; open: number; close: number; arrivals: SimArrival[]; staff: Staff[]; breaks: { staffId: string; at: number; min: number }[] }

const HOURLY_ARRIVALS: [number, number][] = [[0, 6], [1, 10], [2, 12], [3, 9], [4, 6], [5, 7], [6, 10], [7, 8], [8, 5]]; // 08:00–17:00: morning and afternoon peaks
const SERVICE_MIX: [string, number][] = [["general", 30], ["consult", 25], ["blood", 20], ["followup", 13], ["urgent-consult", 6], ["assessment", 6]];
const TRUE_SPEED: Record<string, number> = { blood: 1.4, consult: 1.12, followup: 0.9 }; // reality ≠ configured durations (others ×1)
const BOOKABLE = new Set(["consult", "followup", "assessment"]);
const NAMES = ["Ava", "Liam", "Mia", "Ethan", "Zoe", "Lucas", "Chloe", "Owen", "Nala", "Sipho", "Thandi", "Kai", "Lerato", "Jonah", "Amara", "Ravi"];

export function generateDay(seed: number, customers = 80, open = new Date(2026, 0, 5, 8, 0).getTime()): DayPlan {
  const r = rng(seed);
  const close = open + 9 * 60 * MIN;
  const draft = Array.from({ length: customers }, () => {
    const hour = pickWeighted(r, HOURLY_ARRIVALS);
    let arrivedAt = open + (hour * 60 + Math.floor(r() * 60)) * MIN;
    const serviceId = pickWeighted(r, SERVICE_MIX);
    const priority: Priority = serviceId === "urgent-consult" ? "urgent" : r() < 0.08 ? "priority" : "normal";
    let appointmentAt: number | undefined;
    if (BOOKABLE.has(serviceId) && r() < 0.35) {
      appointmentAt = Math.min(close - 30 * MIN, Math.round(arrivedAt / (15 * MIN)) * 15 * MIN); // slots on the quarter hour
      const kind = r(); // most people with appointments come early; a few are late
      const offset = kind < 0.7 ? -(r() * 20) : kind < 0.9 ? r() * 10 - 5 : 10 + r() * 20;
      arrivedAt = Math.max(open, appointmentAt + Math.round(offset) * MIN);
    }
    const base = SERVICES.find((s) => s.id === serviceId)!.durationMin * (TRUE_SPEED[serviceId] ?? 1);
    return {
      arrivedAt, serviceId, priority, appointmentAt,
      actualMin: Math.max(2, Math.round(base * (0.6 + 0.8 * r()))),
      patienceMin: priority === "urgent" ? Infinity : 60 + Math.round(r() * 90),
      name: `${NAMES[Math.floor(r() * NAMES.length)]} ${String.fromCharCode(65 + Math.floor(r() * 26))}.`,
    };
  }).sort((a, b) => a.arrivedAt - b.arrivedAt);

  return {
    seed, open, close,
    arrivals: draft.map((d, i) => ({
      customer: { id: "S" + String(i + 1).padStart(3, "0"), name: d.name, serviceId: d.serviceId, priority: d.priority, arrivedAt: d.arrivedAt, ...(d.appointmentAt != null ? { appointmentAt: d.appointmentAt } : {}) },
      actualMin: d.actualMin, patienceMin: d.patienceMin,
    })),
    staff: ROSTER.map((s) => ({ ...s })),
    breaks: [["wright", 4 * 60], ["evans", 4.5 * 60], ["kim", 5 * 60], ["patel", 5.5 * 60]].map(([staffId, after]) => ({ staffId: staffId as string, at: open + (after as number) * MIN, min: 30 })),
  };
}

// ─── 2. The algorithms being compared ─────────────────────────────────────────────────────────────────────

export type Policy = "fifo" | "strict" | "smart";
const LEVEL: Record<Priority, number> = { urgent: 2, priority: 1, normal: 0 };

/** Each policy only decides the ORDER customers are offered to a free staff member. Everything else is identical. */
export const POLICIES: Record<Policy, { label: string; order: (waiting: Customer[], now: number, w: Weights) => Customer[] }> = {
  fifo: { label: "First come, first served", order: (w) => [...w].sort((a, b) => a.arrivedAt - b.arrivedAt) },
  strict: { label: "Strict priority", order: (w) => [...w].sort((a, b) => LEVEL[b.priority] - LEVEL[a.priority] || a.arrivedAt - b.arrivedAt) },
  smart: { label: "Smart queue", order: (w, now, weights) => rankQueue(w, now, weights).map((r) => r.customer) },
};

// ─── 3. Running the day ───────────────────────────────────────────────────────────────────────────────────

export interface SimMetrics {
  customers: number; served: number; walkedOut: number; unserved: number;
  avgWait: number; p90Wait: number; maxWait: number; // over everyone who left the queue (served or walked out)
  urgentAvgWait: number | null; apptOnTimePct: number | null; utilisation: number; peakQueue: number; finishedAt: number;
}
export interface SimResult { policy: Policy; metrics: SimMetrics; timeline: { t: number; waiting: number; serving: number }[]; history: Visit[] }

/**
 * A time-stepped simulation: advance the clock one minute at a time and, each minute,
 *   finish visits whose REAL duration is up → let new arrivals join → impatient customers walk out
 *   → start scheduled breaks → every free staff member takes the next customer the policy offers them.
 * All changes go through the same queueReducer the live app uses, so the simulation follows the real rules.
 */
export function simulateDay(day: DayPlan, policy: Policy, weights: Weights = WEIGHTS): SimResult {
  const truth = new Map(day.arrivals.map((a) => [a.customer.id, a]));
  const pending = [...day.arrivals];
  const breaks = [...day.breaks];
  let state: QueueState = { waiting: [], staff: day.staff.map((s) => ({ ...s })), history: [] };
  const timeline: SimResult["timeline"] = [];
  const act = (a: Parameters<typeof queueReducer>[1]) => { state = queueReducer(state, a); };

  for (let t = day.open; t <= day.close + 4 * 60 * MIN; t += MIN) {
    for (const s of state.staff) if (s.serving && t >= s.serving.startedAt + truth.get(s.serving.customer.id)!.actualMin * MIN) act({ type: "complete", staffId: s.id, at: t });
    while (pending.length && pending[0].customer.arrivedAt <= t) act({ type: "join", customer: pending.shift()!.customer });
    for (const c of [...state.waiting]) if (t - c.arrivedAt >= truth.get(c.id)!.patienceMin * MIN) act({ type: "noShow", customerId: c.id, at: t });
    for (const b of [...breaks]) {
      const s = state.staff.find((x) => x.id === b.staffId)!;
      if (b.at <= t && !s.serving) { // a break starts once they've finished with their current customer
        state = { ...state, staff: state.staff.map((x) => (x.id === s.id ? { ...x, breakUntil: t + b.min * MIN } : x)) };
        breaks.splice(breaks.indexOf(b), 1);
      }
    }
    const offered = POLICIES[policy].order(state.waiting, t, weights);
    const free = state.staff.filter((s) => staffStatus(s, t) === "available").sort((a, b) => a.serviceIds.length - b.serviceIds.length);
    for (const s of free) {
      const c = offered.find((x) => canServe(s, x.serviceId) && state.waiting.some((w) => w.id === x.id));
      if (c) act({ type: "serve", customerId: c.id, staffId: s.id, at: t });
    }
    timeline.push({ t, waiting: state.waiting.length, serving: state.staff.filter((s) => s.serving).length });
    if (t >= day.close && !pending.length && !state.waiting.length && state.staff.every((s) => !s.serving)) break;
  }
  return { policy, metrics: measure(day, state, timeline), timeline, history: state.history };
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pct = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };

function measure(day: DayPlan, state: QueueState, timeline: SimResult["timeline"]): SimMetrics {
  const done = state.history.filter((v) => v.outcome === "completed");
  const left = state.history.filter((v) => v.outcome === "no-show");
  // Average over everyone, including walk-outs (wait = until they gave up). Averaging only the served would hide
  // the worst experiences and flatter whichever algorithm drives the most people away (survivorship bias).
  const waits = [...done, ...left].map((v) => v.waitMin);
  const appts = done.filter((v) => v.customer.appointmentAt != null);
  const finishedAt = Math.max(day.open, ...state.history.map((v) => v.endedAt));
  const breakMin = day.breaks.reduce((s, b) => s + b.min, 0);
  const capacity = day.staff.length * (finishedAt - day.open) / MIN - breakMin;
  return {
    customers: day.arrivals.length, served: done.length, walkedOut: left.length, unserved: state.waiting.length,
    avgWait: avg(waits) ?? 0, p90Wait: pct(waits, 0.9), maxWait: Math.max(0, ...waits),
    urgentAvgWait: avg(done.filter((v) => v.customer.priority === "urgent").map((v) => v.waitMin)),
    apptOnTimePct: appts.length ? (100 * appts.filter((v) => v.startedAt! <= v.customer.appointmentAt! + 15 * MIN).length) / appts.length : null,
    utilisation: capacity > 0 ? (100 * done.reduce((s, v) => s + v.serviceMin!, 0)) / capacity : 0,
    peakQueue: Math.max(0, ...timeline.map((p) => p.waiting)),
    finishedAt,
  };
}

/** Run the same day under every policy. */
export const compareDay = (day: DayPlan, weights: Weights = WEIGHTS): Record<Policy, SimResult> =>
  ({ fifo: simulateDay(day, "fifo", weights), strict: simulateDay(day, "strict", weights), smart: simulateDay(day, "smart", weights) });

/**
 * One day is an anecdote. Run many different days (seeds firstSeed … firstSeed+days−1) and average each metric per policy.
 * Metrics that can be "not applicable" on a day (e.g. no urgent cases) are averaged over the days where they apply.
 */
export function compareMany(days: number, customers: number, firstSeed = 1, weights: Weights = WEIGHTS): Record<Policy, SimMetrics> {
  const runs = Array.from({ length: days }, (_, i) => compareDay(generateDay(firstSeed + i, customers), weights));
  const mean = (p: Policy, k: keyof SimMetrics) => avg(runs.map((r) => r[p].metrics[k]).filter((v): v is number => v != null));
  const out = {} as Record<Policy, SimMetrics>;
  for (const p of Object.keys(POLICIES) as Policy[]) out[p] = Object.fromEntries((Object.keys(runs[0][p].metrics) as (keyof SimMetrics)[]).map((k) => [k, mean(p, k)])) as unknown as SimMetrics;
  return out;
}
