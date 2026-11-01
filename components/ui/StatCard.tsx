import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
export function StatCard({ icon: I, iconFilled, value, label, meta, visual, style }: { icon?: LucideIcon; iconFilled?: boolean; value: ReactNode; label: string; meta?: ReactNode; visual?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", minHeight: 84, borderRadius: "var(--radius-md)", background: "var(--surface-dark)", color: "var(--text-on-dark)", minWidth: 0, ...style }}>
      {visual ?? (I && (
        <div style={{ width: 46, height: 46, borderRadius: "var(--radius-md)", background: "var(--surface-dark-icon)", display: "grid", placeItems: "center", color: "var(--blue-600)", flexShrink: 0 }}>
          <I size={26} fill={iconFilled ? "currentColor" : "none"} strokeWidth={iconFilled ? 1.5 : 2.5} />
        </div>
      ))}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <div style={{ font: "var(--type-stat)" }}>{value}</div>
        <div style={{ font: "var(--fw-regular) 13px var(--font-sans)", color: "var(--text-on-dark-muted)", whiteSpace: "nowrap" }}>{label}</div>
        {meta}
      </div>
    </div>
  );
}
