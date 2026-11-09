import { WEIGHTS, type Weights, serviceById } from "./config";
import type { Customer, Ranked, ScorePart, Scored, Service } from "./types";
export const MIN = 60_000;

export const fmtTime = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** When does this customer's wait start "counting"? Early appointments don't get credit for showing up early. */
function clockStart(c: Customer, w: Weights): number {
  if (c.appointmentAt == null || isLate(c, w)) return c.arrivedAt;
  return Math.max(c.arrivedAt, c.appointmentAt - w.appointmentEarlyMin * MIN);
}
const isLate = (c: Customer, w: Weights) => c.appointmentAt != null && c.arrivedAt > c.appointmentAt + w.appointmentLateMin * MIN;

export function scoreCustomer(c: Customer, service: Service, now: number, w: Weights = WEIGHTS): Scored {
  const parts: ScorePart[] = [];
  const waitedMin = Math.max(0, (now - c.arrivedAt) / MIN);
  const countedMin = Math.max(0, (now - clockStart(c, w)) / MIN);

  parts.push({ key: "wait", label: `Waiting ${Math.round(waitedMin)} min`, points: countedMin * w.waitPerMin });

  const over = countedMin - w.overdueAfterMin;
  if (over > 0) parts.push({ key: "overdue", label: `${Math.round(over)} min past the ${w.overdueAfterMin}-min target`, points: over * w.overduePerMin });

  if (c.priority === "urgent") parts.push({ key: "priority", label: "Urgent case", points: w.urgentBoost });
  else if (c.priority === "priority") parts.push({ key: "priority", label: "Priority customer", points: w.priorityBoost });

  if (c.appointmentAt != null && !isLate(c, w) && now >= c.appointmentAt - w.appointmentEarlyMin * MIN)
    parts.push({ key: "appointment", label: `Appointment at ${fmtTime(c.appointmentAt)}`, points: w.appointmentBoost });

  const shortJob = w.shortJobMax * (1 - Math.min(service.durationMin, w.shortJobRefMin) / w.shortJobRefMin);
  if (shortJob > 0) parts.push({ key: "shortJob", label: `Quick service (~${service.durationMin} min)`, points: shortJob });

  const score = parts.reduce((s, p) => s + p.points, 0);
  return { customer: c, service, score, parts, waitedMin };
}

/** Score everyone, sort best-first. Ties fall back to arrival order (FIFO), then ticket id, so the result is deterministic. */
export function rankQueue(customers: Customer[], now: number, w: Weights = WEIGHTS): Ranked[] {
  const scored = customers.map((c) => scoreCustomer(c, serviceById(c.serviceId), now, w));
  scored.sort((a, b) => b.score - a.score || a.customer.arrivedAt - b.customer.arrivedAt || a.customer.id.localeCompare(b.customer.id));
  return scored.map((s, i) => ({ ...s, position: i + 1 }));
}

/** The parts of a score as readable reasons, biggest first, e.g. "Urgent case (+60)". */
export const scoreReasons = (s: Scored): string[] =>
  [...s.parts].filter((p) => p.points >= 1).sort((a, b) => b.points - a.points).map((p) => `${p.label} (+${Math.round(p.points)})`);
