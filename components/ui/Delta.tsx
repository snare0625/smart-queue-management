import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReactNode } from "react";
export function Delta({ value, direction = "down", good = true, pill, children }: { value: string; direction?: "up" | "down"; good?: boolean; pill?: boolean; children?: ReactNode }) {
  const I = direction === "up" ? ArrowUp : ArrowDown;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: pill ? "var(--green-700)" : good ? "var(--green-500)" : "var(--red-500)", background: pill ? "var(--green-100)" : "transparent", padding: pill ? "2px 8px" : 0, borderRadius: "var(--radius-xs)", font: "var(--fw-medium) var(--fs-label) var(--font-sans)", whiteSpace: "nowrap" }}>
      <I size={12} />{value}{children ? " " : ""}{children}
    </span>
  );
}
