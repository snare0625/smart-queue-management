import type { Assignment, Staff } from "./types";

/**
 * Everything the public waiting-room screen is allowed to know — and nothing else.
 *
 * Data minimisation: the screen only needs a ticket number to let people find themselves, so names, services and priority
 * never leave the staff dashboard. Priority matters most: "urgent" in a clinic is health information. Building this snapshot
 * on the staff side means private fields are never sent to the screen at all, not just hidden by its UI.
 */
export interface PublicView {
  generatedAt: number;
  nowServing: { ticket: string; counter: string; since: number }[]; // counter = the staff member's name (public, like a desk number)
  waiting: { ticket: string; position: number; estWaitMin: number | null }[];
  waitingCount: number;
}

export function toPublicView(plan: Assignment[], staff: Staff[], now: number): PublicView {
  return {
    generatedAt: now,
    nowServing: staff
      .filter((s) => s.serving)
      .map((s) => ({ ticket: s.serving!.customer.id, counter: s.name, since: s.serving!.startedAt }))
      .sort((a, b) => b.since - a.since),
    waiting: plan.map((a) => ({ ticket: a.customer.id, position: a.position, estWaitMin: a.estWaitMin == null ? null : Math.round(a.estWaitMin) })),
    waitingCount: plan.length,
  };
}
