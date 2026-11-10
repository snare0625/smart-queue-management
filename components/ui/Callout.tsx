import type { ReactNode } from "react";

/** A titled list inside an inset row. Items are numbered 01, 02 … with the accent (decoration only; the text carries the meaning). */
export function Callout({ title, items = [] }: { title?: string; items?: ReactNode[] }) {
  return (
    <div className="pc-inset" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {title && <div style={{ font: "var(--type-body)", fontWeight: 500, color: "var(--ink)" }}>{title}</div>}
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((t, i) => (
          <li key={i} style={{ display: "flex", gap: 10, font: "var(--type-control)", color: "var(--ink-2)" }}>
            <span aria-hidden style={{ font: "var(--type-micro)", color: "var(--brand)", paddingTop: 2, minWidth: 14 }}>{String(i + 1).padStart(2, "0")}</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
