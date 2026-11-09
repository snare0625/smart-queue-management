"use client";
import { MoreHorizontal } from "lucide-react";
import type { CSSProperties } from "react";
import { Badge } from "./Badge";
import { IconButton } from "./IconButton";
import type { QueueEntry, Stripe } from "@/lib/data";
const STRIPE: Record<Stripe, string> = { urgent: "var(--red-500)", priority: "var(--orange-500)", appointment: "var(--purple-500)", general: "var(--cyan-500)", teal: "var(--teal-400)", none: "transparent" };
const th: CSSProperties = { textAlign: "left", font: "var(--fw-medium) var(--fs-table) var(--font-sans)", color: "var(--text-secondary)", padding: "8px 10px", borderBottom: "1px solid var(--border-card)", whiteSpace: "nowrap" };
const td: CSSProperties = { font: "var(--type-table)", color: "var(--text-primary)", padding: "0 10px", height: "var(--table-row-h)", borderBottom: "1px solid var(--border-card)", whiteSpace: "nowrap" };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
export function QueueTable({ rows, onRowAction }: { rows: QueueEntry[]; onRowAction?: (r: QueueEntry) => void }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["#", "Name", "Service", "Priority", "Arrived", "Waiting", "Est. Wait", "Score", "Status", "Actions"].map((h) => <th key={h} style={{ ...th, textAlign: h === "Actions" ? "right" : "left" }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td style={{ ...td, borderLeft: "var(--stripe-w) solid " + STRIPE[r.stripe] }}>{i + 1}</td>
              <td style={{ ...td, fontWeight: 500 }}>{r.name}</td>
              <td style={td}>{r.service}</td>
              <td style={td}><Badge tone={r.priority}>{cap(r.priority)}</Badge></td>
              <td style={td}>{r.arrived}</td>
              <td style={td}>{r.waiting}</td>
              <td style={td}>{r.est}</td>
              <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{r.score ?? "–"}</td>
              <td style={td}><Badge tone={r.status}>{r.status === "next" ? "Next" : "Waiting"}</Badge></td>
              <td style={{ ...td, textAlign: "right" }}><IconButton icon={MoreHorizontal} label={`Actions for ${r.name}`} size={26} onClick={() => onRowAction?.(r)} style={{ marginLeft: "auto" }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
