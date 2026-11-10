import { planQueue } from "./assign";
import { ROSTER, SERVICES, WEIGHTS, serviceById, type Weights } from "./config";
import type { Durations } from "./learning";
import { MIN, rankQueue } from "./scoring";
import { simulateDay, withExtraStaff, type DayPlan, type SimMetrics, type SimResult } from "./simulate";
import type { Assignment, Customer, Staff } from "./types";

/**
 * Re-ordering the queue only moves waiting around (see the simulation); when demand outgrows the staff who can meet it,
 * the only fix is capacity. This module spots that — live and across a simulated day — and tests staffing ideas by
 * re-running the SAME forecast/simulation with one extra person, rather than guessing.
 */
export const LOAD = {
  busyWaitMin: 30, // someone's total wait (so far + forecast) above this = busy
  overloadWaitMin: 60, // … above this = overloaded
  minGainMin: 10, // only recommend extra staff if it cuts the longest projected wait by at least this much
};
export type LoadLevel = "ok" | "busy" | "overloaded";

export interface ServiceLoad { serviceId: string; name: string; waiting: number; worstWaitMin: number; qualified: string[]; noStaff: boolean; level: LoadLevel }
export interface StaffSuggestion { like: Staff; skills: string; beforeMin: number; afterMin: number }
export interface LoadReport { level: LoadLevel; worstWaitMin: number; services: ServiceLoad[]; suggestion: StaffSuggestion | null }

const levelOf = (waitMin: number, noStaff = false): LoadLevel => (noStaff || waitMin > LOAD.overloadWaitMin ? "overloaded" : waitMin > LOAD.busyWaitMin ? "busy" : "ok");
const RANK: Record<LoadLevel, number> = { ok: 0, busy: 1, overloaded: 2 };

/** A customer's experience = what they've already waited + what we forecast is still to come. */
const projectedWait = (a: Assignment) => (a.estWaitMin == null ? Infinity : a.waitedMin + a.estWaitMin);
const worst = (plan: Assignment[]) => plan.reduce((m, a) => Math.max(m, projectedWait(a)), 0);

/** Distinct skill sets on the roster = the kinds of person we could bring in. */
export const staffProfiles = (roster: Staff[] = ROSTER) =>
  roster.filter((s, i) => roster.findIndex((o) => o.serviceIds.join() === s.serviceIds.join()) === i);
const skillsOf = (s: Staff) => s.serviceIds.map((id) => serviceById(id).name).join(", ");

// ─── Live ─────────────────────────────────────────────────────────────────────────────────────────────────

export function assessLoad(waiting: Customer[], staff: Staff[], now: number, durations: Durations = {}): LoadReport {
  const ranked = rankQueue(waiting, now);
  const plan = planQueue(ranked, staff, now, durations);
  const services: ServiceLoad[] = SERVICES.map((svc) => {
    const mine = plan.filter((a) => a.service.id === svc.id);
    const noStaff = mine.some((a) => a.estWaitMin == null);
    const worstWaitMin = mine.length ? Math.max(...mine.map((a) => (a.estWaitMin == null ? 0 : projectedWait(a)))) : 0;
    return { serviceId: svc.id, name: svc.name, waiting: mine.length, worstWaitMin, noStaff, level: levelOf(worstWaitMin, noStaff),
      qualified: staff.filter((s) => s.serviceIds.includes(svc.id)).map((s) => s.name) };
  }).filter((s) => s.waiting > 0).sort((a, b) => RANK[b.level] - RANK[a.level] || b.worstWaitMin - a.worstWaitMin);

  const level = services.reduce<LoadLevel>((l, s) => (RANK[s.level] > RANK[l] ? s.level : l), "ok");
  const before = worst(plan);
  let suggestion: StaffSuggestion | null = null;
  if (level !== "ok") {
    // What-if: re-plan with one extra person of each kind, available now; keep the one that helps most.
    for (const like of staffProfiles()) {
      const after = worst(planQueue(ranked, [...staff, { id: "what-if", name: "Extra", serviceIds: like.serviceIds }], now, durations));
      const gain = before - after;
      if (gain >= LOAD.minGainMin && (!suggestion || after < suggestion.afterMin)) suggestion = { like, skills: skillsOf(like), beforeMin: before, afterMin: after };
    }
  }
  return { level, worstWaitMin: before, services, suggestion };
}

// ─── Planning a day ───────────────────────────────────────────────────────────────────────────────────────

export interface HourLoad { hour: number; start: number; arrivals: number; avgWaitMin: number | null; peakWaiting: number; level: LoadLevel }

/** Hour by hour: how many arrived, how long THEY ended up waiting, and the busiest moment. Shows WHEN the day breaks down. */
export function hourlyLoad(day: DayPlan, result: SimResult): HourLoad[] {
  const hours = Math.ceil((day.close - day.open) / (60 * MIN));
  return Array.from({ length: hours }, (_, h) => {
    const start = day.open + h * 60 * MIN;
    const end = start + 60 * MIN;
    const visits = result.history.filter((v) => v.customer.arrivedAt >= start && v.customer.arrivedAt < end);
    const avgWaitMin = visits.length ? visits.reduce((s, v) => s + v.waitMin, 0) / visits.length : null;
    const peakWaiting = Math.max(0, ...result.timeline.filter((p) => p.t >= start && p.t < end).map((p) => p.waiting));
    return { hour: h, start, arrivals: visits.length, avgWaitMin, peakWaiting, level: levelOf(avgWaitMin ?? 0) };
  });
}

export interface ShiftOption { like: Staff; skills: string; start: number; end: number; metrics: SimMetrics }
export interface ShiftPlan { base: SimMetrics; hourly: HourLoad[]; options: ShiftOption[]; best: ShiftOption | null }

/**
 * Search: for every kind of extra person × every start time (on the hour, `shiftHours` long), re-simulate the whole day
 * with the smart queue and score it. The best option is the one where the slowest 10% of customers wait least (p90),
 * with walk-outs as the tie-breaker. Brute force is fine here: ~4 kinds × 6 starts = 24 runs of a ~40 ms simulation.
 */
export function recommendShift(day: DayPlan, weights: Weights = WEIGHTS, shiftHours = 4): ShiftPlan {
  const baseRun = simulateDay(day, "smart", weights);
  const lastStart = day.close - shiftHours * 60 * MIN;
  const options: ShiftOption[] = [];
  for (const like of staffProfiles(day.staff)) {
    for (let start = day.open; start <= lastStart; start += 60 * MIN) {
      const end = start + shiftHours * 60 * MIN;
      options.push({ like, skills: skillsOf(like), start, end, metrics: simulateDay(withExtraStaff(day, like, start, end), "smart", weights).metrics });
    }
  }
  options.sort((a, b) => a.metrics.p90Wait - b.metrics.p90Wait || a.metrics.walkedOut - b.metrics.walkedOut || a.start - b.start);
  const best = options[0] && options[0].metrics.p90Wait <= baseRun.metrics.p90Wait - LOAD.minGainMin ? options[0] : null;
  return { base: baseRun.metrics, hourly: hourlyLoad(day, baseRun), options, best };
}
