import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReactNode } from "react";

/** A change as a pill: arrow + value, green when the change is good, red when bad (the arrow and number carry the meaning too). */
export function Delta({ value, direction = "down", good = true, children }: { value: string; direction?: "up" | "down"; good?: boolean; pill?: boolean; children?: ReactNode }) {
  const I = direction === "up" ? ArrowUp : ArrowDown;
  return (
    <span className="pc-pill" style={{ background: good ? "var(--positive-bg)" : "var(--negative-bg)", color: good ? "var(--positive)" : "var(--negative)" }}>
      <I size={12} strokeWidth={2} aria-hidden />{value}{children ? " " : ""}{children}
    </span>
  );
}
