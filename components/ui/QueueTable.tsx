"use client";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Badge } from "./Badge";
import { IconButton } from "./IconButton";
import type { QueueEntry, Stripe } from "@/lib/data";
export interface RowAction { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }
const STRIPE: Record<Stripe, string> = { urgent: "var(--red-500)", priority: "var(--orange-500)", appointment: "var(--purple-500)", general: "var(--cyan-500)", teal: "var(--teal-400)", none: "transparent" };
export const th: CSSProperties = { textAlign: "left", font: "var(--fw-medium) var(--fs-table) var(--font-sans)", color: "var(--text-secondary)", padding: "8px 10px", borderBottom: "1px solid var(--border-card)", whiteSpace: "nowrap" };
export const td: CSSProperties = { font: "var(--type-table)", color: "var(--text-primary)", padding: "0 10px", height: "var(--table-row-h)", borderBottom: "1px solid var(--border-card)", whiteSpace: "nowrap" };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
// The menu is position:fixed (placed from the button's screen position) so the table's scroll container can't clip it.
function RowMenu({ x, y, actions, onClose }: { x: number; y: number; actions: RowAction[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const away = (e: Event) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", away);
    window.addEventListener("scroll", onClose, true);
    return () => { document.removeEventListener("mousedown", away); window.removeEventListener("scroll", onClose, true); };
  }, [onClose]);
  return (
    <div ref={ref} role="menu" style={{ position: "fixed", top: y, right: window.innerWidth - x, zIndex: 50, minWidth: 220, padding: 4, background: "var(--surface-card)", border: "1px solid var(--border-card)", borderRadius: "var(--radius-sm)", boxShadow: "0 8px 24px rgba(10,20,30,.25)" }}>
      {actions.map((a) => (
        <button key={a.label} role="menuitem" disabled={a.disabled} onClick={() => { a.onClick(); onClose(); }}
          style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: "none", borderRadius: "var(--radius-xs)", background: "transparent", font: "var(--type-table)", color: a.disabled ? "var(--text-muted)" : a.danger ? "var(--red-600)" : "var(--text-primary)", cursor: a.disabled ? "not-allowed" : "pointer" }}
          onMouseEnter={(e) => { if (!a.disabled) e.currentTarget.style.background = "var(--surface-muted)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

export function QueueTable({ rows, actions }: { rows: QueueEntry[]; actions?: (r: QueueEntry) => RowAction[] }) {
  const [menu, setMenu] = useState<{ row: QueueEntry; x: number; y: number } | null>(null);
  const open = (row: QueueEntry, el: HTMLElement) => { const b = el.getBoundingClientRect(); setMenu({ row, x: b.right, y: b.bottom + 4 }); };
  const close = () => setMenu(null);
  return (
    <div style={{ overflowX: "auto" }}>
      {menu && actions && <RowMenu x={menu.x} y={menu.y} actions={actions(menu.row)} onClose={close} />}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["#", "Name", "Service", "Priority", "Arrived", "Waiting", "Est. Wait", "Staff", "Score", "Status", "Actions"].map((h) => <th key={h} style={{ ...th, textAlign: h === "Actions" ? "right" : "left" }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td style={{ ...td, borderLeft: "var(--stripe-w) solid " + STRIPE[r.stripe] }}>{r.position ?? i + 1}</td>
              <td style={{ ...td, fontWeight: 500 }}>{r.name}</td>
              <td style={td}>{r.service}</td>
              <td style={td}><Badge tone={r.priority}>{cap(r.priority)}</Badge></td>
              <td style={td}>{r.arrived}</td>
              <td style={td}>{r.waiting}</td>
              <td style={td}>{r.est}</td>
              <td style={{ ...td, color: "var(--text-secondary)" }}>{r.staff ?? "–"}</td>
              <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{r.score ?? "–"}</td>
              <td style={td}><Badge tone={r.status}>{r.status === "next" ? "Next" : "Waiting"}</Badge></td>
              <td style={{ ...td, textAlign: "right" }}><span onClick={(e) => open(r, e.currentTarget)} style={{ display: "inline-block" }}><IconButton icon={MoreHorizontal} label={`Actions for ${r.name}`} size={26} /></span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
