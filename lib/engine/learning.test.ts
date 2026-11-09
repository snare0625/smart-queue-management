import { describe, expect, it } from "vitest";
import { planQueue } from "./assign";
import { learnDurations, toDurations } from "./learning";
import { queueReducer } from "./lifecycle";
import { rankQueue } from "./scoring";
import type { Customer, Visit } from "./types";

const NOW = Date.UTC(2026, 10, 1, 10, 0);
const at = (min: number) => NOW + min * 60_000;
const cust = (id: string, serviceId: string): Customer => ({ id, name: id, serviceId, priority: "normal", arrivedAt: at(-30) });
let t = 0;
const visit = (serviceId: string, serviceMin: number, outcome: Visit["outcome"] = "completed"): Visit =>
  ({ customer: cust("V", serviceId), serviceId, outcome, endedAt: at(-100 + t++), waitMin: 5, ...(outcome === "completed" && { serviceMin }) });
const blood = (history: Visit[]) => learnDurations(history).blood;

describe("learnDurations", () => {
  it("starts at the configured duration with no history", () => {
    expect(blood([])).toMatchObject({ defaultMin: 5, estimateMin: 5, samples: 0 });
  });

  it("moves 30% of the way towards each actual duration", () => {
    expect(blood([visit("blood", 10)]).estimateMin).toBeCloseTo(6.5); // 5 + 0.3 × (10 − 5)
  });

  it("converges on the real duration when it is consistent", () => {
    const est = blood(Array.from({ length: 12 }, () => visit("blood", 8))).estimateMin;
    expect(est).toBeGreaterThan(7.9);
    expect(est).toBeLessThan(8);
  });

  it("weights recent visits more than old ones", () => {
    const slowThenFast = blood([visit("blood", 10), visit("blood", 5)]).estimateMin;
    const fastThenSlow = blood([visit("blood", 5), visit("blood", 10)]).estimateMin;
    expect(fastThenSlow).toBeGreaterThan(slowThenFast);
  });

  it("limits the damage from an outlier (e.g. a forgotten Done click)", () => {
    // 120 min is clamped to 2.5 × 5 = 12.5 → 5 + 0.3 × 7.5 = 7.25
    expect(blood([visit("blood", 120)]).estimateMin).toBeCloseTo(7.25);
  });

  it("ignores no-shows and cancellations", () => {
    expect(blood([visit("blood", 0, "no-show"), visit("blood", 0, "cancelled")])).toMatchObject({ estimateMin: 5, samples: 0 });
  });

  it("keeps each service separate", () => {
    const l = learnDurations([visit("blood", 10)]);
    expect(l.consult.estimateMin).toBe(20);
  });
});

describe("learned durations feed the forecasts", () => {
  it("planQueue stacks waits using learned minutes", () => {
    const ranked = rankQueue([cust("first", "consult"), { ...cust("second", "consult"), arrivedAt: at(-10) }], NOW);
    const plan = planQueue(ranked, [{ id: "doc", name: "doc", serviceIds: ["consult"] }], NOW, { consult: 30 });
    expect(plan[1].estWaitMin).toBe(30); // configured would say 20
  });

  it("serve sets the expected end from history", () => {
    const history = Array.from({ length: 12 }, () => visit("blood", 8));
    const s = queueReducer({ waiting: [cust("A1", "blood")], staff: [{ id: "n", name: "n", serviceIds: ["blood"] }], history }, { type: "serve", customerId: "A1", staffId: "n", at: NOW });
    const expectedMin = (s.staff[0].serving!.expectedEnd - NOW) / 60_000;
    expect(expectedMin).toBeCloseTo(toDurations(learnDurations(history)).blood);
    expect(expectedMin).toBeGreaterThan(7.9);
  });
});
