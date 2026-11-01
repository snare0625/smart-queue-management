import type { CSSProperties, ReactNode } from "react";
export type BadgeTone = "urgent" | "priority" | "appointment" | "normal" | "next" | "waiting" | "busy" | "available" | "break";
const T: Record<BadgeTone, [string, string]> = {
  urgent: ["--priority-urgent-bg", "--priority-urgent"], priority: ["--priority-high-bg", "--priority-high"], appointment: ["--priority-appointment-bg", "--priority-appointment"], normal: ["--priority-normal-bg", "--priority-normal"],
  next: ["--status-next-bg", "--status-next"], waiting: ["--status-waiting-bg", "--status-waiting"], busy: ["--status-busy-bg", "--white"], available: ["--status-available-bg", "--status-available"], break: ["--status-break-bg", "--status-break"],
};
export function Badge({ tone = "normal", children, style }: { tone?: BadgeTone; children: ReactNode; style?: CSSProperties }) {
  const [bg, fg] = T[tone];
  return <span style={{ display: "inline-flex", alignItems: "center", height: "var(--badge-h)", padding: "0 9px", borderRadius: "var(--radius-xs)", background: `var(${bg})`, color: `var(${fg})`, font: "var(--fw-medium) var(--fs-label) var(--font-sans)", whiteSpace: "nowrap", ...style }}>{children}</span>;
}
