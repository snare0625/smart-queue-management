import { fmtTime, serviceById, staffStatus, type Assignment, type Customer, type Category, type Staff, type StaffStatus as EngineStaffStatus } from "@/lib/engine";

export type Priority = "urgent" | "priority" | "appointment" | "normal";
export type Stripe = "urgent" | "priority" | "appointment" | "general" | "teal" | "none";
export type { Category };
export interface QueueEntry { id: string; name: string; service: string; priority: Priority; arrived: string; waiting: string; est: string; status: "next" | "waiting"; stripe: Stripe; cat: Category; score?: number; staff?: string; position?: number }

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
export function toEntry(a: Assignment, nextId: string | undefined, staff: Staff[]): QueueEntry {
  const { customer: c, service: s } = a;
  const priority: Priority = c.priority !== "normal" ? c.priority : c.appointmentAt != null ? "appointment" : "normal";
  return {
    id: c.id, name: c.name, service: s.name, priority, arrived: fmtTime(c.arrivedAt), waiting: fmtMin(a.waitedMin), est: a.estWaitMin == null ? "No staff" : fmtMin(a.estWaitMin),
    status: c.id === nextId ? "next" : "waiting", stripe: priority === "normal" ? "none" : priority, cat: s.category, score: Math.round(a.score),
    staff: staff.find((x) => x.id === a.staffId)?.name ?? "–", position: a.position,
  };
}
export const FILTERS = ["All", "General", "Consultation", "Test", "Follow-up"] as const;

const servingAs = (customer: Customer, now: number, startedAgo: number, endsIn: number) =>
  ({ customer, serviceId: customer.serviceId, startedAt: now - startedAgo * 60_000, expectedEnd: now + endsIn * 60_000 });
export const seedStaff = (now: number): Staff[] => [
  { id: "patel", name: "Dr. Patel", serviceIds: ["consult", "urgent-consult", "assessment", "followup"], avatar: "/assets/avatars/dr-patel.png",
    serving: servingAs({ id: "A014", name: "Grace H.", serviceId: "urgent-consult", priority: "urgent", arrivedAt: now - 30 * 60_000 }, now, 12, 3) },
  { id: "evans", name: "Nurse Evans", serviceIds: ["blood", "general"], avatar: "/assets/avatars/nurse-evans.png" },
  { id: "kim", name: "Dr. Kim", serviceIds: ["consult", "urgent-consult", "general"], avatar: "/assets/avatars/dr-kim.png",
    serving: servingAs({ id: "A013", name: "Tom V.", serviceId: "consult", priority: "normal", arrivedAt: now - 35 * 60_000 }, now, 10, 10) },
  { id: "wright", name: "Nurse Wright", serviceIds: ["blood"], avatar: "/assets/avatars/nurse-wright.png", breakUntil: now + 6 * 60_000 },
];

export type StaffStatus = EngineStaffStatus;
export function toStaffRow(s: Staff, plan: Assignment[], now: number) {
  const status = staffStatus(s, now);
  const left = (t: number) => Math.max(1, Math.ceil((t - now) / 60_000));
  const queued = plan.filter((a) => a.staffId === s.id).length;
  const note = status === "busy" ? `${s.serving!.customer.id} (${left(s.serving!.expectedEnd)} min left)`
    : status === "break" ? `Back at ${fmtTime(s.breakUntil!)}`
    : queued ? `${queued} queued for them` : "Nothing queued";
  return { name: s.name, skills: s.serviceIds.map((id) => serviceById(id).name).join(", "), status, note, src: s.avatar };
}
