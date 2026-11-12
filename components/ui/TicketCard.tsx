import type { ReactNode } from "react";

/**
 * A ticket as an inset row: big ticket number, who and what, a meta line, an optional trailing element (a pill or one button),
 * and optional `actions` on their own row underneath — so text never gets squeezed into a narrow column next to buttons.
 */
export function TicketCard({ ticket, name, service, meta, trailing, actions }: { ticket: string; name: string; service: string; meta?: ReactNode; trailing?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="pc-inset" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ font: "var(--type-metric)", letterSpacing: "var(--tracking-tight)", color: "var(--ink)", minWidth: 64 }}>{ticket}</div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ font: "var(--type-body)", fontWeight: 500, color: "var(--ink)" }}>{name}</div>
          <div style={{ font: "var(--type-control)", color: "var(--ink-2)" }}>{service}</div>
          {meta && <div style={{ font: "var(--type-label)", color: "var(--label)" }}>{meta}</div>}
        </div>
        {trailing && <div style={{ flexShrink: 0 }}>{trailing}</div>}
      </div>
      {actions && <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>{actions}</div>}
    </div>
  );
}
