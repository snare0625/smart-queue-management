"use client";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { LEARNING, SERVICES, fmtTime, serviceById } from "@/lib/engine";
import { useQueue } from "./QueueProvider";

// Slower than configured is a warning, faster is good — always said in words, not just colour.
function Drift({ pct }: { pct: number }) {
  if (Math.abs(pct) < 1) return <Badge tone="neutral">On estimate</Badge>;
  return pct > 0 ? <Badge tone="warning">{pct}% slower</Badge> : <Badge tone="positive">{-pct}% faster</Badge>;
}
function VsConfigured({ diff }: { diff: number }) {
  if (diff === 0) return <Badge tone="neutral">On time</Badge>;
  return diff > 0 ? <Badge tone="warning">{diff} min over</Badge> : <Badge tone="positive">{-diff} min under</Badge>;
}

export function ServicesPage() {
  const { ready, state, learned } = useQueue();
  if (!ready) return <main />;
  const recent = state.history.filter((v) => v.outcome === "completed").slice(-8).reverse();
  const staffName = (id?: string) => state.staff.find((s) => s.id === id)?.name ?? "–";

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "var(--gap)", minWidth: 0 }}>
      <Panel title="Service times" meta="Learned from completed visits">
        <p style={{ margin: 0, font: "var(--type-body)", color: "var(--ink-2)", maxWidth: 860 }}>
          Each estimate starts at the configured duration and learns from every completed visit: it moves {LEARNING.alpha * 100}% of the way towards what
          actually happened (an exponentially weighted moving average). A single extreme visit is first limited to {LEARNING.clampLow}×–{LEARNING.clampHigh}× the current estimate.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table className="pc-table">
            <thead><tr>{["Service", "Category", "Configured", "Learned estimate", "Drift", "Visits learned from", "Last actual"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {SERVICES.map((s) => {
                const l = learned[s.id];
                return (
                  <tr key={s.id}>
                    <td style={{ color: "var(--ink)", fontWeight: 500 }}>{s.name}</td>
                    <td>{s.category}</td>
                    <td>{l.defaultMin} min</td>
                    <td style={{ color: "var(--ink)" }}>{l.estimateMin.toFixed(1)} min</td>
                    <td><Drift pct={Math.round(((l.estimateMin - l.defaultMin) / l.defaultMin) * 100)} /></td>
                    <td>{l.samples}</td>
                    <td>{l.lastMin == null ? "–" : `${Math.round(l.lastMin)} min`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Recently completed" meta={`Last ${recent.length}`}>
        {recent.length === 0 ? <div className="pc-inset" style={{ font: "var(--type-control)", color: "var(--label)" }}>No completed visits yet. They appear here as staff mark visits Done.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table className="pc-table">
              <thead><tr>{["Ticket", "Service", "Staff", "Finished", "Waited", "Took", "vs configured"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {recent.map((v) => (
                  <tr key={v.customer.id + v.endedAt}>
                    <td style={{ color: "var(--ink)", fontWeight: 500 }}>{v.customer.id}</td>
                    <td>{serviceById(v.serviceId).name}</td>
                    <td>{staffName(v.staffId)}</td>
                    <td>{fmtTime(v.endedAt)}</td>
                    <td>{Math.round(v.waitMin)} min</td>
                    <td style={{ color: "var(--ink)" }}>{Math.round(v.serviceMin!)} min</td>
                    <td><VsConfigured diff={Math.round(v.serviceMin! - serviceById(v.serviceId).durationMin)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </main>
  );
}
