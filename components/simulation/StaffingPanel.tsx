"use client";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, UserPlus } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { th, td } from "@/components/ui/QueueTable";
import { fmtTime, hourlyLoad, recommendShift, simulateDay, type DayPlan, type LoadLevel, type ShiftPlan, type SimMetrics, type Weights } from "@/lib/engine";

const LOOK: Record<LoadLevel, { bg: string; fg: string; Icon: typeof AlertCircle; word: string }> = {
  ok: { bg: "var(--green-100)", fg: "var(--green-700)", Icon: CheckCircle2, word: "OK" },
  busy: { bg: "var(--orange-100)", fg: "var(--orange-700)", Icon: AlertCircle, word: "Busy" },
  overloaded: { bg: "var(--red-100)", fg: "var(--red-600)", Icon: AlertTriangle, word: "Overloaded" },
};
const m = (v: number) => `${Math.round(v)} min`;
const field: CSSProperties = { height: 32, padding: "0 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", font: "var(--type-table)", background: "var(--surface-card)" };

function Change({ before, after, unit = " min" }: { before: number; after: number; unit?: string }) {
  const d = Math.round(after) - Math.round(before);
  return <>{Math.round(before)}{unit} → <b>{Math.round(after)}{unit}</b>{d !== 0 && <span style={{ color: d < 0 ? "var(--green-700)" : "var(--red-600)" }}> ({d > 0 ? "+" : ""}{d})</span>}</>;
}

/** WHEN is the day overloaded (smart queue, hour by hour), and which extra shift would help most? */
export function StaffingPanel({ day, weights }: { day: DayPlan; weights: Weights }) {
  const hourly = useMemo(() => hourlyLoad(day, simulateDay(day, "smart", weights)), [day, weights]);
  const [shiftHours, setShiftHours] = useState(4);
  const [plan, setPlan] = useState<ShiftPlan | null>(null);
  const [running, setRunning] = useState(false);
  useEffect(() => setPlan(null), [day, weights, shiftHours]);
  const run = () => { setRunning(true); setTimeout(() => { setPlan(recommendShift(day, weights, shiftHours)); setRunning(false); }, 30); };
  const row = (label: string, k: keyof SimMetrics, base: SimMetrics, after: SimMetrics, unit = " min") => (base[k] == null || after[k] == null) ? null :
    <tr key={k}><td style={{ ...td, color: "var(--text-secondary)" }}>{label}</td><td style={td}><Change before={base[k] as number} after={after[k] as number} unit={unit} /></td></tr>;

  return (
    <Panel title="Staffing: when is the day overloaded?" action={
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label style={{ font: "var(--type-label)", color: "var(--text-secondary)" }}>Extra shift&nbsp;
          <select value={shiftHours} onChange={(e) => setShiftHours(Number(e.target.value))} style={field}>{[2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>{h} hours</option>)}</select>
        </label>
        <Button icon={UserPlus} disabled={running} onClick={run}>{running ? "Testing every option…" : "Find the best extra shift"}</Button>
      </div>
    }>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${hourly.length}, minmax(0,1fr))`, gap: 6 }}>
        {hourly.map((h) => {
          const { bg, fg, Icon, word } = LOOK[h.level];
          return (
            <div key={h.hour} title={`${h.arrivals} arrived; they waited ${h.avgWaitMin == null ? "–" : m(h.avgWaitMin)} on average; up to ${h.peakWaiting} waiting at once`}
              style={{ padding: "8px 6px", borderRadius: "var(--radius-sm)", background: bg, display: "flex", flexDirection: "column", gap: 2, alignItems: "center", font: "var(--type-label)" }}>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{fmtTime(h.start)}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, color: fg, fontWeight: 600 }}><Icon size={12} />{word}</span>
              <span style={{ color: "var(--text-secondary)" }}>{h.avgWaitMin == null ? "–" : m(h.avgWaitMin)} avg</span>
              <span style={{ color: "var(--text-muted)" }}>{h.arrivals} arrived</span>
            </div>
          );
        })}
      </div>
      <p style={{ margin: 0, font: "var(--type-label)", color: "var(--text-muted)" }}>Average wait of the people who ARRIVED in each hour, using the smart queue. Busy &gt; 30 min, overloaded &gt; 60 min.</p>

      {plan && (plan.best ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr)", gap: 16, alignItems: "start" }}>
          <div style={{ display: "flex", gap: 10, padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--callout-bg)", font: "var(--type-table)" }}>
            <UserPlus size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
            <div>
              <b>Recommendation:</b> bring in someone like <b>{plan.best.like.name}</b> ({plan.best.skills}) from <b>{fmtTime(plan.best.start)} to {fmtTime(plan.best.end)}</b>.
              <div style={{ color: "var(--text-secondary)", marginTop: 4 }}>Chosen from {plan.options.length} options by re-simulating the whole day for each one.</div>
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>With that extra shift</th><th style={th}>Before → after</th></tr></thead>
            <tbody>
              {row("90% of people waited less than", "p90Wait", plan.base, plan.best.metrics)}
              {row("Longest wait", "maxWait", plan.base, plan.best.metrics)}
              {row("Average wait", "avgWait", plan.base, plan.best.metrics)}
              {row("Walked out", "walkedOut", plan.base, plan.best.metrics, "")}
              {row("Urgent cases' average wait", "urgentAvgWait", plan.base, plan.best.metrics)}
            </tbody>
          </table>
          <details style={{ gridColumn: "1 / -1", font: "var(--type-table)" }}>
            <summary style={{ cursor: "pointer", color: "var(--accent-text)" }}>Show the next best options</summary>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
              <thead><tr>{["Extra person like", "Shift", "90% waited <", "Longest", "Walked out"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{plan.options.slice(0, 8).map((o) => (
                <tr key={o.like.id + o.start}><td style={td}>{o.like.name}</td><td style={td}>{fmtTime(o.start)}–{fmtTime(o.end)}</td><td style={td}>{m(o.metrics.p90Wait)}</td><td style={td}>{m(o.metrics.maxWait)}</td><td style={td}>{o.metrics.walkedOut}</td></tr>
              ))}</tbody>
            </table>
          </details>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center", font: "var(--type-table)", color: "var(--text-secondary)" }}>
          <CheckCircle2 size={16} color="var(--green-700)" /> No extra shift would cut the 90th-percentile wait by 10+ minutes — current staffing copes with this day.
        </div>
      ))}
    </Panel>
  );
}
