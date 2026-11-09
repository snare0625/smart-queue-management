import { describe, expect, it } from "vitest";
import { explainNext, nextUp, planQueue } from "./assign";
import { rankQueue } from "./scoring";
import type { Customer, Staff } from "./types";

const NOW = Date.UTC(2026, 10, 1, 10, 0);
const at = (min: number) => NOW + min * 60_000;
const c = (id: string, minutesAgo: number, serviceId: string, extra: Partial<Customer> = {}): Customer => ({ id, name: id, serviceId, priority: "normal", arrivedAt: at(-minutesAgo), ...extra });
const st = (id: string, serviceIds: string[], extra: Partial<Staff> = {}): Staff => ({ id, name: id, serviceIds, ...extra });
const busyFor = (min: number): Partial<Staff> => ({ serving: { customer: c("X", 0, "general"), serviceId: "general", startedAt: NOW, expectedEnd: at(min) } });
const plan = (cs: Customer[], staff: Staff[]) => planQueue(rankQueue(cs, NOW), staff, NOW);
const byId = (p: ReturnType<typeof plan>) => Object.fromEntries(p.map((a) => [a.customer.id, { staff: a.staffId, wait: a.estWaitMin }]));

describe("planQueue", () => {
  it("only assigns staff qualified for the service", () => {
    const p = byId(plan([c("consult", 10, "consult")], [st("nurse", ["blood"]), st("doctor", ["consult"], busyFor(5))]));
    expect(p.consult).toEqual({ staff: "doctor", wait: 5 }); // waits for the doctor even though the nurse is free
  });

  it("picks whichever qualified staff member is free soonest", () => {
    const p = byId(plan([c("A", 10, "general")], [st("slow", ["general"], busyFor(12)), st("fast", ["general"], busyFor(3))]));
    expect(p.A).toEqual({ staff: "fast", wait: 3 });
  });

  it("prefers a specialist when two people are free at the same time", () => {
    const p = byId(plan([c("A", 10, "blood")], [st("generalist", ["blood", "general", "consult"]), st("specialist", ["blood"])]));
    expect(p.A.staff).toBe("specialist");
  });

  it("stacks waits: customers behind each other on one staff member wait for the jobs ahead", () => {
    const p = byId(plan([c("first", 20, "consult"), c("second", 10, "consult")], [st("doctor", ["consult"])]));
    expect(p.first.wait).toBe(0);
    expect(p.second.wait).toBe(20); // consultation takes 20 min
  });

  it("waits for a staff member to come back from break", () => {
    const p = byId(plan([c("A", 5, "blood")], [st("nurse", ["blood"], { breakUntil: at(6) })]));
    expect(p.A.wait).toBe(6);
  });

  it("reports no estimate when nobody on duty can do the service", () => {
    const p = byId(plan([c("A", 5, "assessment")], [st("nurse", ["blood"])]));
    expect(p.A).toEqual({ staff: null, wait: null });
  });
});

describe("nextUp + explainNext", () => {
  const customers = [c("urgent", 2, "consult", { priority: "urgent" }), c("blood", 1, "blood")];
  const staff = [st("Dr Lee", ["consult"], busyFor(4)), st("Nurse Ola", ["blood"])];

  it("calls a lower-ranked customer when they're the one a free staff member can serve", () => {
    const p = plan(customers, staff);
    expect(p[0].customer.id).toBe("urgent"); // still #1 by score...
    expect(nextUp(p)!.customer.id).toBe("blood"); // ...but the nurse is free now and can only do blood tests
  });

  it("explains that choice", () => {
    expect(explainNext(plan(customers, staff), staff, NOW).slice(0, 3)).toEqual([
      "Nurse Ola is free now and handles Blood Test",
      "Best-ranked customer Nurse Ola can serve (#2 in queue)",
      "#1 urgent needs Consultation — Dr Lee free in 4 min",
    ]);
  });
});
