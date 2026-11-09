import { describe, expect, it } from "vitest";
import { freeAt, staffStatus } from "./assign";
import { bestFreeStaff, cannotServe, queueReducer, type QueueAction } from "./lifecycle";
import type { Customer, QueueState, Staff } from "./types";

const NOW = Date.UTC(2026, 10, 1, 10, 0);
const at = (min: number) => NOW + min * 60_000;
const cust = (id: string, serviceId = "blood", minutesAgo = 10): Customer => ({ id, name: id, serviceId, priority: "normal", arrivedAt: at(-minutesAgo) });
const st = (id: string, serviceIds: string[], extra: Partial<Staff> = {}): Staff => ({ id, name: id, serviceIds, ...extra });
const start = (): QueueState => ({ waiting: [cust("A1"), cust("A2", "consult")], staff: [st("nurse", ["blood"]), st("doc", ["consult", "blood"])], history: [] });
const run = (s: QueueState, ...actions: QueueAction[]) => actions.reduce(queueReducer, s);

describe("queueReducer", () => {
  it("join adds a customer once", () => {
    const s = run(start(), { type: "join", customer: cust("A3") }, { type: "join", customer: cust("A3") });
    expect(s.waiting.map((c) => c.id)).toEqual(["A1", "A2", "A3"]);
  });

  it("serve moves a customer from the queue to a staff member", () => {
    const s = run(start(), { type: "serve", customerId: "A1", staffId: "nurse", at: NOW });
    expect(s.waiting.map((c) => c.id)).toEqual(["A2"]);
    expect(s.staff[0].serving).toMatchObject({ customer: { id: "A1" }, startedAt: NOW, expectedEnd: at(5) }); // blood test = 5 min
    expect(staffStatus(s.staff[0], NOW)).toBe("busy");
  });

  it("refuses to serve with an unqualified or busy staff member", () => {
    const s0 = start();
    expect(cannotServe(s0, "A2", "nurse", NOW)).toBe("nurse doesn't handle Consultation");
    expect(run(s0, { type: "serve", customerId: "A2", staffId: "nurse", at: NOW })).toBe(s0); // unchanged

    const s1 = run(s0, { type: "serve", customerId: "A1", staffId: "nurse", at: NOW });
    expect(cannotServe({ ...s1, waiting: [...s1.waiting, cust("A3")] }, "A3", "nurse", NOW)).toBe("nurse is busy");
  });

  it("complete records the ACTUAL service time and frees the staff member", () => {
    const s = run(start(), { type: "serve", customerId: "A1", staffId: "nurse", at: NOW }, { type: "complete", staffId: "nurse", at: at(8) });
    expect(s.staff[0].serving).toBeUndefined();
    expect(s.history).toEqual([expect.objectContaining({ outcome: "completed", staffId: "nurse", waitMin: 10, serviceMin: 8 })]); // expected 5, took 8
  });

  it("no-show while waiting removes them; no-show after being called frees the staff member", () => {
    const s1 = run(start(), { type: "noShow", customerId: "A1", at: NOW });
    expect(s1.waiting.map((c) => c.id)).toEqual(["A2"]);
    expect(s1.history[0]).toMatchObject({ outcome: "no-show", waitMin: 10 });

    const s2 = run(start(), { type: "serve", customerId: "A2", staffId: "doc", at: NOW }, { type: "noShow", customerId: "A2", at: at(2) });
    expect(s2.staff[1].serving).toBeUndefined();
    expect(s2.history[0]).toMatchObject({ outcome: "no-show", staffId: "doc" });
  });

  it("cancel removes a waiting customer and logs it", () => {
    const s = run(start(), { type: "cancel", customerId: "A2", at: NOW });
    expect(s.waiting.map((c) => c.id)).toEqual(["A1"]);
    expect(s.history[0]).toMatchObject({ outcome: "cancelled", customer: { id: "A2" } });
  });

  it("never mutates the previous state", () => {
    const s0 = start();
    const snapshot = JSON.stringify(s0);
    run(s0, { type: "serve", customerId: "A1", staffId: "nurse", at: NOW }, { type: "complete", staffId: "nurse", at: at(5) }, { type: "cancel", customerId: "A2", at: NOW });
    expect(JSON.stringify(s0)).toBe(snapshot);
  });
});

describe("staff helpers", () => {
  it("bestFreeStaff picks the free specialist", () => {
    expect(bestFreeStaff(start(), "A1", NOW)?.id).toBe("nurse");
    expect(bestFreeStaff(start(), "A2", NOW)?.id).toBe("doc");
  });

  it("an overrunning staff member stays busy and is forecast free in at least a minute", () => {
    const s = run(start(), { type: "serve", customerId: "A1", staffId: "nurse", at: NOW });
    expect(staffStatus(s.staff[0], at(9))).toBe("busy"); // expected end was +5
    expect(freeAt(s.staff[0], at(9))).toBe(at(10));
  });
});
