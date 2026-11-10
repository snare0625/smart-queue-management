"use client";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Badge } from "./Badge";
import { IconButton } from "./IconButton";
import type { QueueEntry } from "@/lib/data";
export interface RowAction { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }

// Inline cell styles for simpler tables elsewhere (prefer className="pc-table" for new tables).
export const th: CSSProperties = { height: 40, padding: "0 16px", background: "var(--raised)", font: "var(--type-label)", color: "var(--label)", textAlign: "left", whiteSpace: "nowrap" };
export const td: CSSProperties = { height: "var(--table-row-h)", padding: "0 16px", borderBottom: "1px solid var(--track)", font: "var(--type-body)", color: "var(--ink-2)", whiteSpace: "nowrap" };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// The menu is position:fixed (placed from the button's screen position) so the table's scroll container can't clip it.
function RowMenu({ x, y, actions, onClose }: { x: number; y: number; actions: RowAction[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const away = (e: Event) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", onClose, true);
    ref.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); window.removeEventListener("scroll", onClose, true); };
  }, [onClose]);
  return (
    <div ref={ref} role="menu" className="pc-popover" style={{ position: "fixed", top: y, right: window.innerWidth - x, zIndex: 50, minWidth: 240 }}>
      {actions.map((a) => (
        <button key={a.label} type="button" role="menuitem" disabled={a.disabled} className={"pc-menu-item" + (a.danger ? " pc-menu-item--danger" : "")} onClick={() => { a.onClick(); onClose(); }}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

export function QueueTable({ rows, actions }: { rows: QueueEntry[]; actions?: (r: QueueEntry) => RowAction[] }) {
  const [menu, setMenu] = useState<{ row: QueueEntry; x: number; y: number } | null>(null);
  const open = (row: QueueEntry, el: HTMLElement) => { const b = el.getBoundingClientRect(); setMenu({ row, x: b.right, y: b.bottom + 6 }); };
  const close = () => setMenu(null);
  return (
    <div style={{ overflowX: "auto" }}>
      {menu && actions && <RowMenu x={menu.x} y={menu.y} actions={actions(menu.row)} onClose={close} />}
      <table className="pc-table" style={{ minWidth: 980 }}>
        <thead><tr>{["#", "Name", "Service", "Priority", "Arrived", "Waiting", "Est. wait", "Staff", "Score", "Status", ""].map((h, i) => <th key={i} style={{ textAlign: h === "Score" ? "right" : "left" }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td style={{ color: "var(--label)" }}>{r.position ?? i + 1}</td>
              <td style={{ color: "var(--ink)", fontWeight: 500 }}>{r.name}<span style={{ display: "block", font: "var(--type-label)", color: "var(--label)" }}>{r.id}</span></td>
              <td>{r.service}</td>
              <td><Badge tone={r.priority}>{cap(r.priority)}</Badge></td>
              <td>{r.arrived}</td>
              <td>{r.waiting}</td>
              <td style={{ color: "var(--ink)" }}>{r.est}</td>
              <td>{r.staff ?? "–"}</td>
              <td style={{ textAlign: "right" }}>{r.score ?? "–"}</td>
              <td><Badge tone={r.status}>{r.status === "next" ? "Next" : "Waiting"}</Badge></td>
              <td style={{ textAlign: "right", width: 48 }}>
                <span onClick={(e) => open(r, e.currentTarget)} style={{ display: "inline-block" }}><IconButton icon={MoreHorizontal} label={`Actions for ${r.name}`} /></span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
