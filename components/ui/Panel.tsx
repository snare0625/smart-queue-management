import type { CSSProperties, ReactNode } from "react";
import { Button } from "./Button";
export function Panel({ title, tone = "light", size = "md", action, actionLabel, onAction, children, style }: { title?: ReactNode; tone?: "light" | "dark"; size?: "md" | "lg"; action?: ReactNode; actionLabel?: string; onAction?: () => void; children?: ReactNode; style?: CSSProperties }) {
  const dark = tone === "dark";
  return (
    <section style={{ background: dark ? "var(--navy-850)" : "var(--surface-card)", border: dark ? "1px solid var(--border-dark)" : "none", borderRadius: "var(--radius-md)", padding: size === "lg" ? "18px 20px" : "14px 16px", color: dark ? "var(--text-on-dark)" : "var(--text-primary)", display: "flex", flexDirection: "column", gap: 12, minWidth: 0, ...style }}>
      {(title || action || actionLabel) && (
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0, font: size === "lg" ? "var(--type-title)" : "var(--type-panel-title)" }}>{title}</h2>
          {action ?? (actionLabel && <Button variant="ghost" size="sm" onClick={onAction} style={{ padding: 0 }}>{actionLabel}</Button>)}
        </header>
      )}
      {children}
    </section>
  );
}
