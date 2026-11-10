import { describe, expect, it } from "vitest";
import { assessLoad, hourlyLoad, recommendShift, staffProfiles } from "./capacity";
import { ROSTER } from "./config";
import { generateDay, simulateDay, withExtraStaff } from "./simulate";
import type { Customer, Staff } from "./types";

const NOW = Date.UTC(2026, 10, 1, 10, 0);
const cust = (id: string, serviceId: string, minutesAgo = 0): Customer => ({ id, name: id, serviceId, priority: "normal", arrivedAt: NOW - minutesAgo * 60_000 });
const doctor: Staff = { id: "doc", name: "Dr. Solo", serviceIds: ["consult"] };
const nurse: Staff = { id: "nurse", name: "Nurse", serviceIds: ["blood", "general"] };

describe("assessLoad (live)", () => {
  it("is calm when everyone will be seen soon, and suggests nothing", () => {
    const r = assessLoad([cust("A", "blood"), cust("B", "consult")], [doctor, nurse], NOW);
    expect(r.level).toBe("ok");
    expect(r.suggestion).toBeNull();
  });

  it("flags the service that is overloaded and who can do it", () => {
    const consults = Array.from({ length: 5 }, (_, i) => cust("C" + i, "consult", 10)); // 5 × 20 min, one doctor
    const r = assessLoad([...consults, cust("B", "blood")], [doctor, nurse], NOW);
    expect(r.level).toBe("overloaded");
    expect(r.services[0]).toMatchObject({ serviceId: "consult", waiting: 5, qualified: ["Dr. Solo"], level: "overloaded" });
    expect(r.services.find((s) => s.serviceId === "blood")!.level).toBe("ok");
  });

  it("recommends the kind of person who actually fixes it, with the forecast gain", () => {
    const consults = Array.from({ length: 5 }, (_, i) => cust("C" + i, "consult", 10));
    const s = assessLoad(consults, [doctor, nurse], NOW).suggestion!;
    expect(s.like.serviceIds).toContain("consult"); // a nurse wouldn't help
    expect(s.afterMin).toBeLessThan(s.beforeMin - 10);
  });

  it("treats 'nobody on duty can do this' as overloaded", () => {
    const r = assessLoad([cust("A", "assessment")], [nurse], NOW);
    expect(r.services[0]).toMatchObject({ serviceId: "assessment", noStaff: true, level: "overloaded" });
    expect(r.suggestion?.like.serviceIds).toContain("assessment");
  });
});

describe("planning a day", () => {
  it("lists each distinct kind of staff member once", () => {
    expect(staffProfiles(ROSTER).map((s) => s.id)).toEqual(["patel", "evans", "kim", "wright"]);
    expect(staffProfiles([...ROSTER, { ...ROSTER[0], id: "clone" }])).toHaveLength(4);
  });

  it("an extra staff member only works during their shift", () => {
    const day = generateDay(1, 100);
    const start = day.open + 5 * 60 * 60_000, end = start + 4 * 60 * 60_000;
    const extra = simulateDay(withExtraStaff(day, ROSTER[0], start, end), "smart").history.filter((v) => v.staffId === "extra" && v.startedAt != null);
    expect(extra.length).toBeGreaterThan(0);
    for (const v of extra) { expect(v.startedAt!).toBeGreaterThanOrEqual(start); expect(v.startedAt!).toBeLessThan(end); }
  });

  it("hourly load accounts for every customer and finds the busy afternoon", () => {
    const day = generateDay(1, 100);
    const hours = hourlyLoad(day, simulateDay(day, "smart"));
    expect(hours.reduce((s, h) => s + h.arrivals, 0)).toBe(100);
    expect(hours.filter((h) => h.level !== "ok").every((h) => new Date(h.start).getHours() >= 13)).toBe(true);
  });

  // Heavy: 24 full-day simulations. A generous timeout keeps it reliable on slower CI machines.
  it("recommends an extra doctor during the overloaded hours on a busy day", { timeout: 30_000 }, () => {
    const plan = recommendShift(generateDay(1, 100));
    expect(plan.best).not.toBeNull();
    expect(plan.best!.like.serviceIds).toContain("consult");
    expect(plan.best!.metrics.p90Wait).toBeLessThan(plan.base.p90Wait - 10);
    const overloaded = plan.hourly.filter((h) => h.level !== "ok").map((h) => h.start);
    expect(overloaded.some((t) => t >= plan.best!.start && t < plan.best!.end)).toBe(true); // the shift covers the problem
  });

  it("recommends nothing on a quiet day", { timeout: 30_000 }, () => {
    expect(recommendShift(generateDay(3, 60)).best).toBeNull();
  });
});
