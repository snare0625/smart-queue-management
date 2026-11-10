import type { Service, Staff } from "./types";

// Every weight is expressed in "minutes of waiting" so the numbers are easy to reason about:
// a boost of 60 means "treat this customer as if they had already waited an extra hour".
export const WEIGHTS = {
  waitPerMin: 1, // backbone of the score: 1 point per minute waited (on its own this is plain FIFO)
  overdueAfterMin: 30, // past this target wait, points accrue at double speed
  overduePerMin: 1,
  urgentBoost: 60,
  priorityBoost: 20,
  appointmentBoost: 30, // reward for honouring a booked slot
  appointmentEarlyMin: 10, // an early appointment's wait clock starts this long before the slot
  appointmentLateMin: 15, // arriving later than this after the slot = treated as a walk-in
  shortJobMax: 10, // a tiny nudge towards quick services (shortest-job-first), never a jump
  shortJobRefMin: 45, // services this long or longer get no short-job bonus
};
export type Weights = typeof WEIGHTS;

export const SERVICES: Service[] = [
  { id: "general", name: "General Enquiry", category: "General", durationMin: 10 },
  { id: "consult", name: "Consultation", category: "Consultation", durationMin: 20 },
  { id: "urgent-consult", name: "Urgent Consultation", category: "Consultation", durationMin: 15 },
  { id: "assessment", name: "Full Assessment", category: "Consultation", durationMin: 45 },
  { id: "blood", name: "Blood Test", category: "Test", durationMin: 5 },
  { id: "followup", name: "Follow-up", category: "Follow-up", durationMin: 15 },
];
export const serviceById = (id: string) => SERVICES.find((s) => s.id === id) ?? SERVICES[0];

/** The clinic's staff and what each is qualified for (used by the live demo seed and the simulator). */
export const ROSTER: Staff[] = [
  { id: "patel", name: "Dr. Patel", serviceIds: ["consult", "urgent-consult", "assessment", "followup"], avatar: "/assets/avatars/dr-patel.png" },
  { id: "evans", name: "Nurse Evans", serviceIds: ["blood", "general"], avatar: "/assets/avatars/nurse-evans.png" },
  { id: "kim", name: "Dr. Kim", serviceIds: ["consult", "urgent-consult", "general"], avatar: "/assets/avatars/dr-kim.png" },
  { id: "wright", name: "Nurse Wright", serviceIds: ["blood"], avatar: "/assets/avatars/nurse-wright.png" },
];
