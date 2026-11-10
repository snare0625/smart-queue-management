"use client";
import { Panel } from "@/components/ui/Panel";
import { th, td } from "@/components/ui/QueueTable";
import { LEARNING, SERVICES, fmtTime, serviceById } from "@/lib/engine";
import { useQueue } from "./QueueProvider";

const muted = { color: "var(--text-secondary)" };

export function ServicesPage() {
  const { ready, state, learned } = useQueue();
  if (!ready) return <main />;
  const recent = state.history.filter((v) => v.outcome === "completed").slice(-8).reverse();
  const staffName = (id?: string) => state.staff.find((s) => s.id === id)?.name ?? "–";

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "var(--gap)", minWidth: 0 }}>
      <Panel title="Service Times" size="lg">
        <p style={{ margin: 0, font: "var(--type-table)", ...muted }}>
          Estimates start at the configured duration and learn from every completed visit: each one moves the estimate {LEARNING.alpha * 100}% of the way towards
          what actually happened (an exponentially weighted moving average). Outliers are clamped to {LEARNING.clampLow}×–{LEARNING.clampHigh}× first.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Service", "Category", "Configured", "Learned estimate", "Change", "Visits learned from", "Last actual"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {SERVICES.map((s) => {
              const l = learned[s.id];
              const delta = l.estimateMin - l.defaultMin;
              const pct = Math.round((delta / l.defaultMin) * 100);
              return (
                <tr key={s.id}>
                  <td style={{ ...td, fontWeight: 500 }}>{s.name}</td>
                  <td style={{ ...td, ...muted }}>{s.category}</td>
                  <td style={td}>{l.defaultMin} min</td>
                  <td style={{ ...td, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{l.estimateMin.toFixed(1)} min</td>
                  <td style={{ ...td, color: Math.abs(pct) < 1 ? "var(--text-muted)" : delta > 0 ? "var(--red-600)" : "var(--green-700)" }}>{Math.abs(pct) < 1 ? "—" : `${delta > 0 ? "▲" : "▼"} ${Math.abs(pct)}%`}</td>
                  <td style={td}>{l.samples}</td>
                  <td style={{ ...td, ...muted }}>{l.lastMin == null ? "–" : `${Math.round(l.lastMin)} min`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
      <Panel title="Recently Completed">
        {recent.length === 0 ? <p style={{ margin: 0, font: "var(--type-table)", ...muted }}>No completed visits yet.</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Ticket", "Service", "Staff", "Finished", "Waited", "Took", "vs configured"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {recent.map((v) => {
                const diff = Math.round(v.serviceMin! - serviceById(v.serviceId).durationMin);
                return (
                  <tr key={v.customer.id + v.endedAt}>
                    <td style={{ ...td, fontWeight: 500 }}>{v.customer.id}</td>
                    <td style={td}>{serviceById(v.serviceId).name}</td>
                    <td style={{ ...td, ...muted }}>{staffName(v.staffId)}</td>
                    <td style={td}>{fmtTime(v.endedAt)}</td>
                    <td style={td}>{Math.round(v.waitMin)} min</td>
                    <td style={td}>{Math.round(v.serviceMin!)} min</td>
                    <td style={{ ...td, color: diff > 0 ? "var(--red-600)" : diff < 0 ? "var(--green-700)" : "var(--text-muted)" }}>{diff === 0 ? "on time" : `${diff > 0 ? "+" : ""}${diff} min`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </main>
  );
}
