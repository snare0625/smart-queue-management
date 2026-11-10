"use client";
import { useEffect, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { IconChip } from "@/components/ui/StatCard";
import { fmtTime, hourlyLoad, recommendShift, simulateDay, type DayPlan, type LoadLevel, type ShiftPlan, type SimMetrics, type Weights } from "@/lib/engine";

// Status is always a pill with a word.
const LOOK: Record<LoadLevel, [BadgeTone, string]> = { ok: ["positive", "OK"], busy: ["warning", "Busy"], overloaded: ["negative", "Overloaded"] };
const m = (v: number) => `${Math.round(v)} min`;

function Change({ before, after, unit = " min" }: { before: number; after: number; unit?: string }) {
  const d = Math.round(after) - Math.round(before);
  return <>{Math.round(before)}{unit} → <strong style={{ color: "var(--ink)" }}>{Math.round(after)}{unit}</strong>{d !== 0 && <span style={{ color: d < 0 ? "var(--positive)" : "var(--negative)" }}> ({d > 0 ? "+" : "−"}{Math.abs(d)})</span>}</>;
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
    <tr key={k}><td>{label}</td><td><Change before={base[k] as number} after={after[k] as number} unit={unit} /></td></tr>;

  return (
    <Panel title="Staffing" meta="When is the day overloaded, and what would fix it?" action={
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--type-label)", color: "var(--label)" }}>Extra shift
          <select value={shiftHours} onChange={(e) => setShiftHours(Number(e.target.value))} className="pc-field">{[2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>{h} hours</option>)}</select>
        </label>
        <Button size="sm" icon={UserPlus} disabled={running} onClick={run}>{running ? "Testing every option…" : "Find the best extra shift"}</Button>
      </div>
    }>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${hourly.length}, minmax(0,1fr))`, gap: 8 }}>
        {hourly.map((h) => {
          const [tone, word] = LOOK[h.level];
          return (
            <div key={h.hour} className="pc-inset" title={`${h.arrivals} arrived; they waited ${h.avgWaitMin == null ? "–" : m(h.avgWaitMin)} on average; up to ${h.peakWaiting} waiting at once`}
              style={{ padding: "10px 8px", display: "flex", flexDirection: "column", gap: 6, alignItems: "center", textAlign: "center" }}>
              <span style={{ font: "var(--type-body)", color: "var(--ink)" }}>{fmtTime(h.start)}</span>
              <Badge tone={tone}>{word}</Badge>
              <span style={{ font: "var(--type-label)", color: "var(--ink-2)" }}>{h.avgWaitMin == null ? "–" : m(h.avgWaitMin)} avg</span>
              <span style={{ font: "var(--type-label)", color: "var(--label)" }}>{h.arrivals} arrived</span>
            </div>
          );
        })}
      </div>
      <p style={{ margin: 0, font: "var(--type-label)", color: "var(--label)" }}>Average wait of the people who arrived in each hour, using the smart queue. Busy over 30 min, overloaded over 60 min.</p>

      {plan && (plan.best ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr)", gap: "var(--gap)", alignItems: "start" }}>
          <div className="pc-inset" style={{ display: "flex", gap: 12, font: "var(--type-body)", color: "var(--ink-2)" }}>
            <IconChip icon={UserPlus} tint="brand" />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: "var(--ink)", fontWeight: 500 }}>Recommendation</span>
              <span>Bring in someone like <strong style={{ color: "var(--ink)" }}>{plan.best.like.name}</strong> ({plan.best.skills}) from <strong style={{ color: "var(--ink)" }}>{fmtTime(plan.best.start)} to {fmtTime(plan.best.end)}</strong>.</span>
              <span style={{ font: "var(--type-label)", color: "var(--label)" }}>Chosen from {plan.options.length} options by re-simulating the whole day for each one.</span>
            </div>
          </div>
          <table className="pc-table">
            <thead><tr><th>With that extra shift</th><th>Before → after</th></tr></thead>
            <tbody>
              {row("90% of people waited less than", "p90Wait", plan.base, plan.best.metrics)}
              {row("Longest wait", "maxWait", plan.base, plan.best.metrics)}
              {row("Average wait", "avgWait", plan.base, plan.best.metrics)}
              {row("Walked out", "walkedOut", plan.base, plan.best.metrics, "")}
              {row("Urgent cases' average wait", "urgentAvgWait", plan.base, plan.best.metrics)}
            </tbody>
          </table>
          <details style={{ gridColumn: "1 / -1", font: "var(--type-body)" }}>
            <summary style={{ cursor: "pointer", color: "var(--ink)", textDecoration: "underline", textDecorationColor: "var(--brand)", textUnderlineOffset: 3 }}>Show the next best options</summary>
            <table className="pc-table" style={{ marginTop: 12 }}>
              <thead><tr>{["Extra person like", "Shift", "90% waited under", "Longest", "Walked out"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{plan.options.slice(0, 8).map((o) => (
                <tr key={o.like.id + o.start}><td>{o.like.name}</td><td>{fmtTime(o.start)}–{fmtTime(o.end)}</td><td>{m(o.metrics.p90Wait)}</td><td>{m(o.metrics.maxWait)}</td><td>{o.metrics.walkedOut}</td></tr>
              ))}</tbody>
            </table>
          </details>
        </div>
      ) : (
        <div className="pc-inset" style={{ display: "flex", gap: 10, alignItems: "center", font: "var(--type-body)", color: "var(--ink-2)" }}>
          <Badge tone="positive">Enough staff</Badge> No extra shift would cut the 90th-percentile wait by 10 minutes or more on this day.
        </div>
      ))}
    </Panel>
  );
}
