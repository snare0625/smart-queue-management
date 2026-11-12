"use client";
import { motion } from "motion/react";
import { pageIn } from "@/components/ui/motion";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Check, Dice5, Pause, Play, RotateCcw } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { POLICY_COLOR, POLICY_SHORT, WaitingChart } from "@/components/simulation/WaitingChart";
import { StaffingPanel } from "@/components/simulation/StaffingPanel";
import { MIN, WEIGHTS, compareDay, compareMany, fmtTime, generateDay, type Policy, type SimMetrics, type SimResult } from "@/lib/engine";

const POLICY_ORDER: Policy[] = ["fifo", "strict", "smart"];
const label: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, font: "var(--type-label)", color: "var(--label)" };
const range: CSSProperties = { accentColor: "var(--dark)", width: 180 };
const fmt = (v: number | null, unit = " min") => (v == null ? "–" : `${Math.round(v)}${unit}`);

// Each row: how to show it, and whether lower or higher is better (null = informational, no "best").
const ROWS: { key: keyof SimMetrics; label: string; show: (m: SimMetrics) => string; better: "low" | "high" | null }[] = [
  { key: "served", label: "Customers served", show: (m) => fmt(m.served, ""), better: "high" },
  { key: "walkedOut", label: "Walked out (waited too long)", show: (m) => (Number.isInteger(m.walkedOut) ? String(m.walkedOut) : m.walkedOut.toFixed(1)), better: "low" },
  { key: "avgWait", label: "Average wait (everyone)", show: (m) => fmt(m.avgWait), better: "low" },
  { key: "p90Wait", label: "90% of people waited less than", show: (m) => fmt(m.p90Wait), better: "low" },
  { key: "maxWait", label: "Longest wait", show: (m) => fmt(m.maxWait), better: "low" },
  { key: "urgentAvgWait", label: "Urgent cases' average wait", show: (m) => fmt(m.urgentAvgWait), better: "low" },
  { key: "apptOnTimePct", label: "Appointments seen within 15 min", show: (m) => fmt(m.apptOnTimePct, "%"), better: "high" },
  { key: "utilisation", label: "Staff utilisation", show: (m) => fmt(m.utilisation, "%"), better: null },
  { key: "peakQueue", label: "Most people waiting at once", show: (m) => fmt(m.peakQueue, ""), better: "low" },
];

function ComparisonTable({ metrics }: { metrics: Record<Policy, SimMetrics> }) {
  return (
    <table className="pc-table">
      <thead><tr><th>Metric</th>{POLICY_ORDER.map((p) => <th key={p}><span style={{ display: "inline-block", width: 12, height: 2, borderRadius: 2, background: POLICY_COLOR[p], verticalAlign: "middle", marginRight: 8 }} />{POLICY_SHORT[p]}</th>)}</tr></thead>
      <tbody>
        {ROWS.map((r) => {
          const vals = POLICY_ORDER.map((p) => metrics[p][r.key] as number | null);
          const nums = vals.filter((v): v is number => v != null).map((v) => Math.round(v * 10) / 10);
          const best = r.better && nums.length && new Set(nums).size > 1 ? (r.better === "low" ? Math.min(...nums) : Math.max(...nums)) : null;
          return (
            <tr key={r.key}>
              <td>{r.label}</td>
              {POLICY_ORDER.map((p, i) => {
                const isBest = best != null && vals[i] != null && Math.round(vals[i]! * 10) / 10 === best;
                return <td key={p} style={{ color: isBest ? "var(--ink)" : undefined, fontWeight: isBest ? 500 : 400 }}>{r.show(metrics[p])}{isBest && <Check size={14} aria-label="best" style={{ marginLeft: 6, verticalAlign: "-2px", color: "var(--positive)" }} />}</td>;
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Plain-language takeaways, computed from the numbers (nothing hard-coded). */
function findings(m: Record<Policy, SimMetrics>): string[] {
  const out: string[] = [];
  const { fifo, strict, smart } = m;
  if (smart.urgentAvgWait != null && fifo.urgentAvgWait != null && fifo.urgentAvgWait > 0.5)
    out.push(`Urgent cases waited ${fmt(smart.urgentAvgWait)} with the smart queue vs ${fmt(fifo.urgentAvgWait)} first-come-first-served.`);
  if (strict.urgentAvgWait != null) out.push(`Strict priority sees urgent cases fastest (${fmt(strict.urgentAvgWait)}), but its longest wait is ${fmt(strict.maxWait)} vs ${fmt(smart.maxWait)} for the smart queue — others pay for it.`);
  const avgs = POLICY_ORDER.map((p) => m[p].avgWait);
  out.push(`Average wait only differs by ${fmt(Math.max(...avgs) - Math.min(...avgs))} between algorithms: reordering moves waiting around; only more capacity reduces it.`);
  if (smart.utilisation < 75 && smart.p90Wait > 45) out.push(`Staff were only ${fmt(smart.utilisation, "%")} busy yet 1 in 10 people waited over ${fmt(smart.p90Wait)} — a skills bottleneck (few staff can do consultations), not a lack of hands.`);
  return out;
}

export function SimulationPage() {
  const [customers, setCustomers] = useState(100);
  const [seed, setSeed] = useState(1);
  const [urgentBoost, setUrgentBoost] = useState(WEIGHTS.urgentBoost);
  const [overdueAfter, setOverdueAfter] = useState(WEIGHTS.overdueAfterMin);
  const weights = useMemo(() => ({ ...WEIGHTS, urgentBoost, overdueAfterMin: overdueAfter }), [urgentBoost, overdueAfter]);

  const day = useMemo(() => generateDay(seed, customers), [seed, customers]);
  const results = useMemo(() => compareDay(day, weights), [day, weights]);
  const dayMetrics = useMemo(() => Object.fromEntries(POLICY_ORDER.map((p) => [p, results[p].metrics])) as Record<Policy, SimMetrics>, [results]);
  const length = Math.max(...POLICY_ORDER.map((p) => results[p].timeline.length)) - 1;

  // Playback: speed through the day by advancing a cursor (minutes after opening) every animation frame.
  const [cursor, setCursor] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(60); // simulated minutes per real second
  const raf = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (now: number) => {
      // rAF's timestamp is when the frame STARTED, which can be a hair before `last` → never let time run backwards
      const dt = Math.max(0, (now - last) / 1000);
      last = now;
      setCursor((c) => {
        const next = Math.min(length, Math.max(0, (c ?? 0) + dt * speed));
        if (next >= length) setPlaying(false);
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, speed, length]);
  useEffect(() => { setPlaying(false); setCursor(null); }, [day, weights]);
  // Clamp to the day: the cursor can briefly outlive a day/settings change before the reset effect runs.
  const minute = cursor == null ? null : Math.min(length, Math.max(0, Math.floor(cursor)));

  // Averaging many days is heavier (~1 s), so it runs on demand, after the button has repainted.
  const [many, setMany] = useState<Record<Policy, SimMetrics> | null>(null);
  const [running, setRunning] = useState(false);
  useEffect(() => setMany(null), [customers, weights]);
  const runMany = () => { setRunning(true); setTimeout(() => { setMany(compareMany(20, customers, 1, weights)); setRunning(false); }, 30); };

  const live = (r: SimResult) => {
    if (minute == null) return null;
    const t = day.open + minute * MIN;
    const tl = r.timeline[Math.min(minute, r.timeline.length - 1)]; // this policy's day may have ended earlier
    return { waiting: tl?.waiting ?? 0, served: r.history.filter((v) => v.outcome === "completed" && v.endedAt <= t).length, left: r.history.filter((v) => v.outcome === "no-show" && v.endedAt <= t).length };
  };

  return (
    <motion.main variants={pageIn} initial="hidden" animate="show" style={{ display: "flex", flexDirection: "column", gap: "var(--gap)", minWidth: 0 }}>
      <Panel title="Day setup">
        <p style={{ margin: 0, font: "var(--type-body)", color: "var(--ink-2)", maxWidth: 900 }}>
          A generated clinic day (08:00–17:00) with walk-ins, appointments, urgent cases, real service times that differ from the estimates, and people who leave if they wait too long.
          The same day is replayed under three algorithms — only the order customers are offered to free staff changes.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 16 }}>
          <label style={label}>Customers
            <select value={customers} onChange={(e) => setCustomers(Number(e.target.value))} className="pc-field">{[50, 60, 80, 100, 120].map((n) => <option key={n} value={n}>{n}</option>)}</select>
          </label>
          <label style={label}>Day (seed)
            <input type="number" min={1} value={seed} onChange={(e) => setSeed(Math.max(1, Number(e.target.value) || 1))} className="pc-field" style={{ width: 96 }} />
          </label>
          <Button variant="secondary" icon={Dice5} onClick={() => setSeed(1 + Math.floor(Math.random() * 9999))}>New day</Button>
          <label style={label}>Smart: urgent boost ({urgentBoost})
            <input type="range" min={0} max={150} step={10} value={urgentBoost} onChange={(e) => setUrgentBoost(Number(e.target.value))} style={range} />
          </label>
          <label style={label}>Smart: overdue after ({overdueAfter} min)
            <input type="range" min={15} max={60} step={5} value={overdueAfter} onChange={(e) => setOverdueAfter(Number(e.target.value))} style={range} />
          </label>
          {(urgentBoost !== WEIGHTS.urgentBoost || overdueAfter !== WEIGHTS.overdueAfterMin) && <Button variant="ghost" onClick={() => { setUrgentBoost(WEIGHTS.urgentBoost); setOverdueAfter(WEIGHTS.overdueAfterMin); }}>Reset weights</Button>}
        </div>
      </Panel>

      <Panel title={`People waiting through the day · ${customers} customers, day ${seed}`} action={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ font: "var(--type-metric)", minWidth: 60 }}>{minute == null ? "" : fmtTime(day.open + minute * MIN)}</span>
          <select aria-label="Playback speed" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="pc-field"><option value={30}>30 min/s</option><option value={60}>1 h/s</option><option value={180}>3 h/s</option></select>
          <Button icon={playing ? Pause : Play} onClick={() => { if (!playing && (cursor ?? 0) >= length) setCursor(0); setPlaying(!playing); }}>{playing ? "Pause" : "Play the day"}</Button>
          {cursor != null && <Button variant="secondary" icon={RotateCcw} onClick={() => { setPlaying(false); setCursor(null); }}>Reset</Button>}
        </div>
      }>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", font: "var(--type-label)", color: "var(--label)" }}>
          {POLICY_ORDER.map((p) => {
            const l = live(results[p]);
            return (
              <span key={p} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 2, borderRadius: 2, background: POLICY_COLOR[p] }} />
                <span style={{ color: "var(--ink)", fontWeight: 500 }}>{POLICY_SHORT[p]}</span>
                {l && <span>· {l.waiting} waiting · {l.served} served · {l.left} walked out</span>}
              </span>
            );
          })}
        </div>
        <WaitingChart key={`${seed}-${customers}`} results={results} open={day.open} cursor={minute} />
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: "var(--gap)", alignItems: "start" }}>
        <Panel title="This day">
          <ComparisonTable metrics={dayMetrics} />
        </Panel>
        <Panel title="What this day shows">
          <Callout items={findings(dayMetrics)} />
        </Panel>
      </div>

      <StaffingPanel day={day} weights={weights} />

      <Panel title="Averaged over 20 different days" action={<Button variant="secondary" disabled={running} onClick={runMany}>{running ? "Running 60 simulations…" : many ? "Run again" : "Run 20 days"}</Button>}>
        {many ? <ComparisonTable metrics={many} /> : (
          <p style={{ margin: 0, font: "var(--type-body)", color: "var(--ink-2)" }}>
            One day can be lucky or unlucky. Run 20 different days with {customers} customers each and compare the averages — that&apos;s the fair comparison.
          </p>
        )}
      </Panel>
    </motion.main>
  );
}
