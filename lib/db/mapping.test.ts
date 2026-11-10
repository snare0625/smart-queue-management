import { describe, expect, it } from "vitest";
import { seedState } from "@/lib/data";
import { queueReducer, type QueueAction } from "@/lib/engine";
import { nextTicketNumber, rowsToState, stateToRows } from "./mapping";

const NOW = Date.UTC(2026, 10, 1, 10, 0);
const roundTrip = (s: ReturnType<typeof seedState>) => { const r = stateToRows(s); return rowsToState(r.staff, r.visits); };

describe("row mapping", () => {
  it("state → rows → state gives back the same state", () => {
    const s = seedState(NOW);
    expect(roundTrip(s)).toEqual(s);
  });

  it("survives a day of actions", () => {
    const actions: QueueAction[] = [
      { type: "serve", customerId: "A016", staffId: "evans", at: NOW },
      { type: "complete", staffId: "evans", at: NOW + 7 * 60_000 },
      { type: "cancel", customerId: "A024", at: NOW + 8 * 60_000 },
      { type: "noShow", customerId: "A021", at: NOW + 9 * 60_000 },
    ];
    const s = actions.reduce(queueReducer, seedState(NOW));
    expect(roundTrip(s)).toEqual(s);
  });

  it("stores one visits row per ticket with the right status", () => {
    const { visits } = stateToRows(seedState(NOW));
    const count = (status: string) => visits.filter((v) => v.status === status).length;
    expect([count("waiting"), count("serving"), count("completed")]).toEqual([12, 2, 12]);
    expect(new Set(visits.map((v) => v.id)).size).toBe(visits.length);
  });

  it("continues ticket numbers after the highest in use", () => {
    expect(nextTicketNumber(seedState(NOW))).toBe(27);
  });
});
