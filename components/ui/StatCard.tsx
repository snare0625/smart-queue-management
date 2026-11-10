import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type Tint = "brand" | "green" | "blue" | "purple" | "amber";
const TINT: Record<Tint, [bg: string, fg: string]> = {
  brand: ["--brand-tint", "--brand"], green: ["--cat-green-tint", "--positive"], blue: ["--cat-blue-tint", "--cat-blue"],
  purple: ["--cat-purple-tint", "--cat-purple-ink"], amber: ["--cat-amber-tint", "--warning"],
};

/** Circular tinted icon chip (30px). Decorative: the label next to it carries the meaning. */
export function IconChip({ icon: I, tint = "brand", size = 30 }: { icon: LucideIcon; tint?: Tint; size?: number }) {
  const [bg, fg] = TINT[tint];
  return <span aria-hidden style={{ width: size, height: size, borderRadius: 999, background: `var(${bg})`, color: `var(${fg})`, display: "grid", placeItems: "center", flexShrink: 0 }}><I size={Math.round(size * 0.5)} strokeWidth={1.8} /></span>;
}

/** KPI tile: label + icon chip on top, big value, small sub-line (and optional extra like a progress bar). */
export function StatCard({ label, value, icon, tint, sub, children }: { label: string; value: ReactNode; icon: LucideIcon; tint?: Tint; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="pc-card" style={{ padding: "18px 20px", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ font: "var(--type-control)", color: "var(--label)" }}>{label}</span>
        <IconChip icon={icon} tint={tint} />
      </div>
      <div style={{ font: "var(--type-kpi)", letterSpacing: "var(--tracking-tight)", color: "var(--ink)" }}>{value}</div>
      {children}
      {sub && <div style={{ font: "var(--type-label)", color: "var(--label)" }}>{sub}</div>}
    </div>
  );
}
