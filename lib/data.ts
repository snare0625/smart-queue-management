export type Priority = "urgent" | "priority" | "appointment" | "normal";
export type Stripe = "urgent" | "priority" | "appointment" | "general" | "teal" | "none";
export type Category = "General" | "Consultation" | "Test" | "Follow-up";
export interface QueueEntry { id: string; name: string; service: string; priority: Priority; arrived: string; waiting: string; est: string; status: "next" | "waiting"; stripe: Stripe; cat: Category; }

const raw: [string, string, Priority, string, string, string, Stripe, Category][] = [
  ["Emma R.", "Urgent Consultation", "urgent", "09:42", "42 min", "5 min", "urgent", "Consultation"],
  ["James T.", "Blood Test", "appointment", "10:00", "24 min", "10 min", "none", "Test"],
  ["Sarah L.", "General Enquiry", "normal", "10:05", "19 min", "15 min", "general", "General"],
  ["Michael B.", "Follow-up", "normal", "10:08", "16 min", "20 min", "none", "Follow-up"],
  ["Priya K.", "Consultation", "priority", "10:12", "12 min", "10 min", "priority", "Consultation"],
  ["Daniel M.", "Blood Test", "normal", "10:15", "9 min", "15 min", "none", "Test"],
  ["Olivia S.", "General Enquiry", "normal", "10:16", "8 min", "20 min", "general", "General"],
  ["Luca P.", "Consultation", "appointment", "10:20", "4 min", "10 min", "none", "Consultation"],
  ["Sophia M.", "Follow-up", "normal", "10:21", "3 min", "15 min", "none", "Follow-up"],
  ["Alex W.", "Blood Test", "normal", "10:22", "2 min", "10 min", "none", "General"],
  ["Isabella C.", "General Enquiry", "normal", "10:23", "1 min", "25 min", "teal", "General"],
  ["Noah D.", "Consultation", "normal", "10:24", "<1 min", "20 min", "none", "General"],
];
export const SEED_QUEUE: QueueEntry[] = raw.map(([name, service, priority, arrived, waiting, est, stripe, cat], i) => ({
  id: "A0" + (15 + i), name, service, priority, arrived, waiting, est, stripe, cat, status: i === 0 ? "next" : "waiting",
}));
export const FILTERS = ["All", "General", "Consultation", "Test", "Follow-up"] as const;

export type StaffStatus = "busy" | "available" | "break";
export const STAFF: { name: string; skills: string; status: StaffStatus; note?: string; src: string }[] = [
  { name: "Dr. Patel", skills: "Consultation, Follow-up", status: "busy", note: "A014 (15 min)", src: "/assets/avatars/dr-patel.png" },
  { name: "Nurse Evans", skills: "Blood Test, General", status: "available", src: "/assets/avatars/nurse-evans.png" },
  { name: "Dr. Kim", skills: "Consultation, General", status: "busy", note: "A020 (10 min)", src: "/assets/avatars/dr-kim.png" },
  { name: "Nurse Wright", skills: "Blood Test", status: "break", note: "Back at 10:30", src: "/assets/avatars/nurse-wright.png" },
];
