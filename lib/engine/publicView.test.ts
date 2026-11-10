import { describe, expect, it } from "vitest";
import { seedCustomers, seedStaff } from "@/lib/data";
import { planQueue } from "./assign";
import { toPublicView } from "./publicView";
import { rankQueue } from "./scoring";

const NOW = Date.UTC(2026, 10, 1, 10, 0);
const customers = seedCustomers(NOW);
const staff = seedStaff(NOW);
const view = toPublicView(planQueue(rankQueue(customers, NOW), staff, NOW), staff, NOW);
const json = JSON.stringify(view);

describe("toPublicView", () => {
  it("never contains a customer's name", () => {
    const names = [...customers.map((c) => c.name), ...staff.flatMap((s) => (s.serving ? [s.serving.customer.name] : []))];
    for (const name of names) expect(json).not.toContain(name);
  });

  it("never contains priority, service or score", () => {
    for (const secret of ["urgent", "priority", "appointment", "Blood Test", "Consultation", "score", "serviceId"]) expect(json).not.toContain(secret);
  });

  it("still gives everyone a ticket, position and estimated wait", () => {
    expect(view.waitingCount).toBe(customers.length);
    expect(view.waiting[0]).toEqual({ ticket: "A015", position: 1, estWaitMin: 3 });
  });

  it("lists who is being served at which counter, most recent first", () => {
    // seed: Dr. Kim started 10 min ago, Dr. Patel 12 min ago
    expect(view.nowServing.map((s) => `${s.ticket}@${s.counter}`)).toEqual(["A013@Dr. Kim", "A014@Dr. Patel"]);
  });
});
