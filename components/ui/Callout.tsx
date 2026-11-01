import { Check, Info } from "lucide-react";
import type { ReactNode } from "react";
export function Callout({ title, items = [] }: { title?: string; items?: ReactNode[] }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--callout-bg)", color: "var(--text-primary)" }}>
      <div style={{ width: 20, height: 20, borderRadius: 999, background: "var(--blue-600)", color: "var(--white)", display: "grid", placeItems: "center", flexShrink: 0 }}><Info size={14} /></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {title && <div style={{ font: "var(--fw-semibold) var(--fs-table) var(--font-sans)" }}>{title}</div>}
        {items.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--type-table)" }}>
            <span style={{ width: 14, height: 14, borderRadius: 999, background: "var(--green-600)", color: "var(--white)", display: "grid", placeItems: "center", flexShrink: 0 }}><Check size={10} strokeWidth={3} /></span>{t}
          </div>
        ))}
      </div>
    </div>
  );
}
