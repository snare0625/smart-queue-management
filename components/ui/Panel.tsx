import type { CSSProperties, ReactNode } from "react";
import { Button } from "./Button";

/** A Paper Calm card: surface background, 1px white rim, soft shadow, radius 20, padding 20, 15/500 title. */
export function Panel({ title, meta, action, actionLabel, onAction, children, style }: {
  title?: ReactNode; meta?: ReactNode; tone?: "light" | "dark"; size?: "md" | "lg";
  action?: ReactNode; actionLabel?: string; onAction?: () => void; children?: ReactNode; style?: CSSProperties;
}) {
  return (
    <section className="pc-card" style={style}>
      {(title || action || actionLabel) && (
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", minHeight: 32 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 className="pc-card-title">{title}</h2>
            {meta && <span style={{ font: "var(--type-label)", color: "var(--label)" }}>{meta}</span>}
          </div>
          {action ?? (actionLabel && <Button variant="ghost" size="sm" onClick={onAction}>{actionLabel}</Button>)}
        </header>
      )}
      {children}
    </section>
  );
}
