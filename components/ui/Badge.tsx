import type { CSSProperties, ReactNode } from "react";

/** Status pill: colour never stands alone — every pill carries a word. */
export type BadgeTone = "urgent" | "priority" | "appointment" | "normal" | "next" | "waiting" | "busy" | "available" | "break" | "positive" | "warning" | "negative" | "neutral";
const T: Record<BadgeTone, [bg: string, fg: string]> = {
  positive: ["--positive-bg", "--positive"], warning: ["--warning-bg", "--warning"], negative: ["--negative-bg", "--negative"], neutral: ["--neutral-bg", "--neutral"],
  urgent: ["--negative-bg", "--negative"], priority: ["--warning-bg", "--warning"], appointment: ["--cat-purple-tint", "--cat-purple-ink"], normal: ["--neutral-bg", "--neutral"],
  next: ["--positive-bg", "--positive"], waiting: ["--neutral-bg", "--neutral"],
  available: ["--positive-bg", "--positive"], busy: ["--neutral-bg", "--neutral"], break: ["--warning-bg", "--warning"],
};
export function Badge({ tone = "neutral", children, style }: { tone?: BadgeTone; children: ReactNode; style?: CSSProperties }) {
  const [bg, fg] = T[tone];
  return <span className="pc-pill" style={{ background: `var(${bg})`, color: `var(${fg})`, ...style }}>{children}</span>;
}
