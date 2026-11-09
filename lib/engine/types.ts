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
export interface Ranked extends Scored { position: number; estWaitMin: number }
