export type Priority = "normal" | "priority" | "urgent";
export type Category = "General" | "Consultation" | "Test" | "Follow-up";

export interface Service { id: string; name: string; category: Category; durationMin: number }

export interface Customer {
  id: string; // ticket number, e.g. "A027"
  name: string;
  serviceId: string;
  priority: Priority;
  arrivedAt: number; // epoch ms
  appointmentAt?: number; // epoch ms — present only for booked appointments
}

export type ScorePartKey = "wait" | "overdue" | "priority" | "appointment" | "shortJob";
export interface ScorePart { key: ScorePartKey; label: string; points: number }

export interface Scored { customer: Customer; service: Service; score: number; parts: ScorePart[]; waitedMin: number }
export interface Ranked extends Scored { position: number }

export type StaffStatus = "available" | "busy" | "break";
export interface Serving { customer: Customer; serviceId: string; startedAt: number; expectedEnd: number }
export interface Staff {
  id: string;
  name: string;
  serviceIds: string[]; // the services this person is qualified to handle
  avatar?: string;
  breakUntil?: number; // epoch ms — on break until then
  serving?: Serving; // who they're with right now
}

/** A ranked customer plus the planner's forecast: who will serve them and when (null = no qualified staff on duty). */
export interface Assignment extends Ranked { staffId: string | null; startAt: number | null; estWaitMin: number | null }
