import { describe, expect, it } from "vitest";
import { canServe } from "./assign";
import { MIN } from "./scoring";
import { compareDay, compareMany, generateDay, simulateDay, type Policy } from "./simulate";

const POLICIES: Policy[] = ["fifo", "strict", "smart"];

describe("generateDay", () => {
  it("is reproducible: same seed, same day", () => {
    expect(generateDay(42, 60)).toEqual(generateDay(42, 60));
    expect(generateDay(42, 60)).not.toEqual(generateDay(43, 60));
  });

  it("spreads at least 50 customers through opening hours with unique tickets", () => {
    const day = generateDay(1, 60);
    expect(day.arrivals.length).toBeGreaterThanOrEqual(50);
    for (const a of day.arrivals) {
      expect(a.customer.arrivedAt).toBeGreaterThanOrEqual(day.open);
      expect(a.customer.arrivedAt).toBeLessThan(day.close);
    }
    expect(new Set(day.arrivals.map((a) => a.customer.id)).size).toBe(60);
  });
});

// These must hold for EVERY policy on EVERY day — if one breaks, the simulator (or the reducer) has a bug.
describe.each(POLICIES)("simulateDay invariants (%s)", (policy) => {
  const days = [1, 2, 3, 4, 5].map((seed) => generateDay(seed, 100));

  it("accounts for every customer exactly once", () => {
    for (const day of days) {
      const { metrics: m, history } = simulateDay(day, policy);
      expect(m.served + m.walkedOut + m.unserved).toBe(day.arrivals.length);
      expect(new Set(history.map((v) => v.customer.id)).size).toBe(history.length);
    }
  });

  it("only ever uses qualified staff, never before arrival, never two at once", () => {
    for (const day of days) {
      const done = simulateDay(day, policy).history.filter((v) => v.outcome === "completed");
      for (const v of done) {
        expect(canServe(day.staff.find((s) => s.id === v.staffId)!, v.serviceId)).toBe(true);
        expect(v.startedAt!).toBeGreaterThanOrEqual(v.customer.arrivedAt);
      }
      for (const s of day.staff) {
        const mine = done.filter((v) => v.staffId === s.id).sort((a, b) => a.startedAt! - b.startedAt!);
        for (let i = 1; i < mine.length; i++) expect(mine[i].startedAt!).toBeGreaterThanOrEqual(mine[i - 1].endedAt);
      }
    }
  });

  it("uses each visit's real (hidden) duration", () => {
    const day = days[0];
    const truth = new Map(day.arrivals.map((a) => [a.customer.id, a.actualMin]));
    for (const v of simulateDay(day, policy).history.filter((x) => x.outcome === "completed")) expect(v.serviceMin).toBe(truth.get(v.customer.id));
  });
});

describe("comparing algorithms (averaged over 20 busy days)", () => {
  const avg = compareMany(20, 100);

  it("strict priority sees urgent cases fastest, FIFO slowest, smart in between", () => {
    expect(avg.strict.urgentAvgWait!).toBeLessThan(avg.smart.urgentAvgWait!);
    expect(avg.smart.urgentAvgWait!).toBeLessThan(avg.fifo.urgentAvgWait! / 2);
  });

  it("smart avoids strict priority's starvation: shorter longest-wait and fewer walk-outs", () => {
    expect(avg.smart.maxWait).toBeLessThan(avg.strict.maxWait);
    expect(avg.smart.walkedOut).toBeLessThan(avg.strict.walkedOut);
  });

  it("smart honours more appointments than either alternative", () => {
    expect(avg.smart.apptOnTimePct!).toBeGreaterThan(avg.fifo.apptOnTimePct!);
    expect(avg.smart.apptOnTimePct!).toBeGreaterThan(avg.strict.apptOnTimePct!);
  });

  it("reordering barely changes the AVERAGE wait — only capacity does", () => {
    const waits = POLICIES.map((p) => avg[p].avgWait);
    expect(Math.max(...waits) - Math.min(...waits)).toBeLessThan(3);
  });

  it("a quiet day makes the algorithm irrelevant", () => {
    const quiet = compareDay(generateDay(1, 50));
    expect(Math.abs(quiet.smart.metrics.avgWait - quiet.fifo.metrics.avgWait)).toBeLessThan(1); // within a minute
    expect(quiet.fifo.metrics.peakQueue).toBeLessThanOrEqual(3);
  });
});

it("a day runs in well under a second", () => {
  const t0 = performance.now();
  compareDay(generateDay(9, 120));
  expect(performance.now() - t0).toBeLessThan(1000);
  expect(MIN).toBe(60_000);
});
