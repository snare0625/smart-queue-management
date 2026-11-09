import { fmtTime, type Customer, type Category, type Ranked } from "@/lib/engine";

export type Priority = "urgent" | "priority" | "appointment" | "normal";
export type Stripe = "urgent" | "priority" | "appointment" | "general" | "teal" | "none";
export type { Category };
export interface QueueEntry { id: string; name: string; service: string; priority: Priority; arrived: string; waiting: string; est: string; status: "next" | "waiting"; stripe: Stripe; cat: Category; score?: number }

// [name, serviceId, priority, minutes ago, appointment slot relative to now (min)]
const seed: [string, string, Customer["priority"], number, number?][] = [
  ["Emma R.", "urgent-consult", "urgent", 42],
  ["James T.", "blood", "normal", 24, -20],
  ["Sarah L.", "general", "normal", 19],
  ["Michael B.", "followup", "normal", 16],
  ["Priya K.", "consult", "priority", 12],
  ["Daniel M.", "blood", "normal", 9],
  ["Olivia S.", "general", "normal", 8],
  ["Luca P.", "consult", "normal", 4, 15], // arrived early for a slot 15 min from now
  ["Sophia M.", "followup", "normal", 3],
  ["Alex W.", "assessment", "normal", 2],
  ["Isabella C.", "general", "normal", 1],
  ["Noah D.", "consult", "normal", 0],
];
export const seedCustomers = (now: number): Customer[] => seed.map(([name, serviceId, priority, ago, appt], i) => ({
  id: "A0" + (15 + i), name, serviceId, priority, arrivedAt: now - ago * 60_000, ...(appt != null && { appointmentAt: now + appt * 60_000 }),
}));

const fmtMin = (m: number) => (m < 1 ? "<1 min" : `${Math.round(m)} min`);
export function toEntry(r: Ranked, i: number): QueueEntry {
  const { customer: c, service: s } = r;
  const priority: Priority = c.priority !== "normal" ? c.priority : c.appointmentAt != null ? "appointment" : "normal";
  return {
    id: c.id, name: c.name, service: s.name, priority, arrived: fmtTime(c.arrivedAt), waiting: fmtMin(r.waitedMin), est: fmtMin(r.estWaitMin),
    status: i === 0 ? "next" : "waiting", stripe: priority === "normal" ? "none" : priority, cat: s.category, score: Math.round(r.score),
  };
}
export const FILTERS = ["All", "General", "Consultation", "Test", "Follow-up"] as const;

export type StaffStatus = "busy" | "available" | "break";
export const STAFF: { name: string; skills: string; status: StaffStatus; note?: string; src: string }[] = [
  { name: "Dr. Patel", skills: "Consultation, Follow-up", status: "busy", note: "A014 (15 min)", src: "/assets/avatars/dr-patel.png" },
  { name: "Nurse Evans", skills: "Blood Test, General", status: "available", src: "/assets/avatars/nurse-evans.png" },
  { name: "Dr. Kim", skills: "Consultation, General", status: "busy", note: "A020 (10 min)", src: "/assets/avatars/dr-kim.png" },
  { name: "Nurse Wright", skills: "Blood Test", status: "break", note: "Back at 10:30", src: "/assets/avatars/nurse-wright.png" },
];
