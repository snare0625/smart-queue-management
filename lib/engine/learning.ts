import { SERVICES } from "./config";
import type { Service, Visit } from "./types";

/**
 * How it learns — an exponentially weighted moving average (EWMA), seeded with the configured duration:
 *
 *   estimate ← estimate + α × (actual − estimate)
 *
 * Each completed visit pulls the estimate α (30%) of the way towards what actually happened, so recent visits count most
 * and old ones fade out geometrically. Starting from the configured value acts as a "prior": one odd visit can't
 * swing the estimate on its own. Each actual is first clamped to 0.5×–2.5× of the current estimate, so a forgotten
 * "Done" click (a blood test that "took" 2 hours) only nudges the estimate instead of wrecking it.
 */
export const LEARNING = { alpha: 0.3, clampLow: 0.5, clampHigh: 2.5 };
export type LearningOpts = typeof LEARNING;

export interface DurationEstimate { serviceId: string; defaultMin: number; estimateMin: number; samples: number; lastMin?: number }
export type Learned = Record<string, DurationEstimate>;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function learnDurations(history: Visit[], services: Service[] = SERVICES, o: LearningOpts = LEARNING): Learned {
  const learned: Learned = Object.fromEntries(services.map((s) => [s.id, { serviceId: s.id, defaultMin: s.durationMin, estimateMin: s.durationMin, samples: 0 }]));
  const done = history.filter((v) => v.outcome === "completed" && v.serviceMin != null).sort((a, b) => a.endedAt - b.endedAt);
  for (const v of done) {
    const d = learned[v.serviceId];
    if (!d) continue;
    const actual = clamp(v.serviceMin!, d.estimateMin * o.clampLow, d.estimateMin * o.clampHigh);
    d.estimateMin += o.alpha * (actual - d.estimateMin);
    d.samples += 1;
    d.lastMin = v.serviceMin;
  }
  return learned;
}

/** The learned minutes per service, in the shape the planner and reducer take. */
export type Durations = Record<string, number>;
export const toDurations = (l: Learned): Durations => Object.fromEntries(Object.values(l).map((d) => [d.serviceId, d.estimateMin]));
