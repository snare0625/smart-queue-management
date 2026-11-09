import { describe, expect, it } from "vitest";
import { WEIGHTS } from "./config";
import { explainNext, rankQueue } from "./scoring";
import type { Customer } from "./types";

const NOW = Date.UTC(2026, 10, 1, 10, 0);
const ago = (min: number) => NOW - min * 60_000;
const c = (id: string, minutesAgo: number, extra: Partial<Customer> = {}): Customer => ({ id, name: id, serviceId: "general", priority: "normal", arrivedAt: ago(minutesAgo), ...extra });
const order = (cs: Customer[]) => rankQueue(cs, NOW).map((r) => r.customer.id);

describe("rankQueue", () => {
  it("is plain FIFO when everyone is equal", () => {
    expect(order([c("B", 5), c("A", 10), c("C", 1)])).toEqual(["A", "B", "C"]);
  });

  it("lets an urgent walk-in jump customers who have not waited long", () => {
    expect(order([c("normal", 20), c("urgent", 0, { priority: "urgent" })])).toEqual(["urgent", "normal"]);
  });

  it("does not let urgent cases push a long-waiting customer back forever", () => {
    // waited 60 min: 60 + 30 overdue = 90  >  fresh urgent: 60 + 7.8 short-job = 67.8
    expect(order([c("waited-an-hour", 60), c("urgent", 0, { priority: "urgent" })])).toEqual(["waited-an-hour", "urgent"]);
  });

  it("guarantees no new arrival can overtake someone past the starvation bound", () => {
    // highest score any brand-new arrival can have
    const bound = WEIGHTS.urgentBoost + WEIGHTS.shortJobMax;
    const worstNewcomer = c("newcomer", 0, { priority: "urgent", serviceId: "blood" });
    const veteran = c("veteran", 50, { serviceId: "assessment" }); // 50 + 20 overdue = 70 points, no short-job bonus
    const [first] = rankQueue([worstNewcomer, veteran], NOW);
    expect(first.customer.id).toBe("veteran");
    expect(first.score).toBeGreaterThanOrEqual(bound);
  });

  it("does not reward an appointment for arriving very early", () => {
    const early = c("early-appt", 30, { appointmentAt: NOW + 30 * 60_000 }); // slot is 30 min from now
    expect(order([early, c("walk-in", 10)])).toEqual(["walk-in", "early-appt"]);
  });

  it("honours an on-time appointment over recent walk-ins", () => {
    const onTime = c("appt", 2, { appointmentAt: ago(2) });
    expect(order([c("walk-in", 25), onTime])).toEqual(["appt", "walk-in"]);
  });

  it("treats a very late appointment as a walk-in", () => {
    const late = c("late-appt", 1, { appointmentAt: ago(40) });
    expect(order([c("walk-in", 5), late])).toEqual(["walk-in", "late-appt"]);
  });

  it("nudges quick services ahead only when waits are similar", () => {
    const long = (m: number) => c("45-min job", m, { serviceId: "assessment" });
    const short = c("5-min job", 5, { serviceId: "blood" });
    expect(order([long(10), short])).toEqual(["5-min job", "45-min job"]); // 10 vs 5 + 8.9
    expect(order([long(20), short])).toEqual(["45-min job", "5-min job"]); // 20 vs 13.9
  });

  it("explains the decision", () => {
    const why = explainNext(rankQueue([c("normal", 20), c("urgent", 0, { priority: "urgent" })], NOW));
    expect(why[0]).toBe("Urgent case (+60)");
    expect(why.at(-1)).toBe("Score 68 vs 28 for normal (normal)"); // 60 + 7.8 quick-service vs 20 + 7.8
  });
});
