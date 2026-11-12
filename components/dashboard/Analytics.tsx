"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { dur, ease } from "@/components/ui/motion";
import { Panel } from "@/components/ui/Panel";
import { Delta } from "@/components/ui/Delta";
import { monotonePath, niceScale, tooltipStyle } from "@/components/ui/chart";
import { MIN, compareMany, fmtTime, serviceById, type Category, type Policy, type SimMetrics } from "@/lib/engine";
import { useQueue } from "./QueueProvider";

const H = 170, PAD = { l: 28, r: 12, t: 12, b: 24 }, STEP = 5, HORIZON = 120;

/** How many people will still be waiting over the next two hours, straight from the planner's forecast (no new arrivals assumed). */
export function QueuePrediction() {
  const { plan, now } = useQueue();
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);
  const [hover, setHover] = useState<number | null>(null);
  const clip = "clip-" + useId().replace(/[^a-zA-Z0-9]/g, ""); // useId can contain «» or ":" which break url(#…)
  const reduce = useReducedMotion();
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, e.contentRect.width)));
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const pts = Array.from({ length: HORIZON / STEP + 1 }, (_, i) => {
    const t = now + i * STEP * MIN;
    return { t, waiting: plan.filter((a) => a.startAt == null || a.startAt > t).length };
  });
  const starts = plan.map((a) => a.startAt);
  const clearsAt = starts.length && starts.every((s) => s != null) ? Math.max(...(starts as number[])) : null;
  const { top, step } = niceScale(Math.max(...pts.map((p) => p.waiting)));
  const x = (i: number) => PAD.l + (i / (pts.length - 1)) * (w - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / top) * (H - PAD.t - PAD.b);
  const curve = pts.map((p, i) => [x(i), y(p.waiting)] as [number, number]);

  return (
    <Panel title="Queue forecast" meta="Next 2 hours, if nobody else arrives">
      <div style={{ font: "var(--type-control)", color: "var(--ink-2)" }}>
        {plan.length === 0 ? "Nobody is waiting." : clearsAt ? <>Current queue clears by <strong style={{ color: "var(--ink)" }}>{fmtTime(clearsAt)}</strong></> : "Some customers need a service nobody on duty can do."}
      </div>
      <div ref={box} style={{ position: "relative" }}>
        <svg width={w} height={H} role="img" aria-label="Forecast of people waiting over the next two hours" style={{ display: "block" }}
          onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const i = Math.round(((e.clientX - r.left - PAD.l) / (w - PAD.l - PAD.r)) * (pts.length - 1)); setHover(i >= 0 && i < pts.length ? i : null); }}
          onMouseLeave={() => setHover(null)}>
          <defs><linearGradient id="fc-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--series-3)" stopOpacity=".32" /><stop offset="1" stopColor="var(--series-3)" stopOpacity="0" /></linearGradient>
            <clipPath id={clip}><motion.rect x={0} y={0} height={H} initial={{ width: reduce ? w : 0 }} animate={{ width: w }} transition={{ duration: dur.wipe, ease }} /></clipPath></defs>
          {Array.from({ length: top / step + 1 }, (_, i) => i * step).map((v) => (
            <g key={v}><line x1={PAD.l} x2={w - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--grid-line)" strokeDasharray={v ? "3 4" : undefined} /><text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--label)">{v}</text></g>
          ))}
          {pts.map((p, i) => (i % 6 === 0 ? <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--label)">{i === 0 ? "Now" : fmtTime(p.t)}</text> : null))}
          <g clipPath={`url(#${clip})`}>
            <path d={`${monotonePath(curve)}L${x(pts.length - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill="url(#fc-fill)" />
            <path d={monotonePath(curve)} fill="none" stroke="var(--series-3)" strokeWidth={2} strokeLinecap="round" />
          </g>
          {hover != null && <><line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--label)" strokeDasharray="3 3" /><circle cx={x(hover)} cy={y(pts[hover].waiting)} r={4.5} fill="#fff" stroke="var(--series-3)" strokeWidth={2} /></>}
        </svg>
        {hover != null && <div role="tooltip" style={{ ...tooltipStyle, position: "absolute", top: 0, left: Math.min(x(hover) + 12, w - 160), minWidth: 0 }}><span style={{ color: "#B5B5BA" }}>{fmtTime(pts[hover].t)}</span> · {pts[hover].waiting} still waiting</div>}
      </div>
    </Panel>
  );
}

/** Today's visits by category (finished, in progress and waiting). Labelled bars, so one colour is enough. */
export function ServiceDistribution() {
  const { state } = useQueue();
  const cats: Category[] = ["General", "Consultation", "Test", "Follow-up"];
  const ids = [...state.history.map((v) => v.serviceId), ...state.staff.flatMap((s) => (s.serving ? [s.serving.serviceId] : [])), ...state.waiting.map((c) => c.serviceId)];
  const counts = cats.map((c) => ({ c, n: ids.filter((id) => serviceById(id).category === c).length }));
  const max = Math.max(1, ...counts.map((x) => x.n));
  return (
    <Panel title="Today by service" meta={`${ids.length} visits`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {counts.map(({ c, n }) => (
          <div key={c} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", font: "var(--type-control)", color: "var(--ink)" }}>
              <span>{c}</span><span style={{ color: "var(--ink-2)" }}>{n} · {ids.length ? Math.round((n / ids.length) * 100) : 0}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "var(--track)" }}>
              <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: dur.bar, ease }} style={{ originX: 0, width: `${(n / max) * 100}%`, height: "100%", borderRadius: 999, background: "var(--series-3)", transition: "width var(--dur-card) var(--ease-out)" }} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// Real numbers: 20 simulated busy days (100 customers each), averaged — the same comparison the Simulation page runs.
const change = (fifo: number, smart: number, higherIsBetter = false): ReactNode => {
  if (Math.round(fifo) === Math.round(smart) || fifo === 0) return <span style={{ color: "var(--label)" }}>Same</span>;
  const pct = Math.round((Math.abs(smart - fifo) / fifo) * 100);
  return <Delta value={`${pct}%`} direction={smart < fifo ? "down" : "up"} good={higherIsBetter ? smart > fifo : smart < fifo} />;
};
let cached: Record<Policy, SimMetrics> | null = null; // ~1 s of work: do it once per session, after first paint
export function SimulationResults({ onOpen }: { onOpen?: () => void }) {
  const [m, setM] = useState(cached);
  useEffect(() => { if (!cached) { const t = setTimeout(() => setM((cached = compareMany(20, 100))), 300); return () => clearTimeout(t); } }, []);
  const title = "Smart queue vs FIFO";
  if (!m) return <Panel title={title}><div className="pc-inset" style={{ font: "var(--type-control)", color: "var(--label)" }}>Simulating 20 busy days…</div></Panel>;
  const r = (v: number | null, unit = " min") => (v == null ? "–" : `${Math.round(v)}${unit}`);
  const rows: [string, string, string, ReactNode][] = [
    ["Urgent cases' wait", r(m.fifo.urgentAvgWait), r(m.smart.urgentAvgWait), change(m.fifo.urgentAvgWait ?? 0, m.smart.urgentAvgWait ?? 0)],
    ["Longest wait", r(m.fifo.maxWait), r(m.smart.maxWait), change(m.fifo.maxWait, m.smart.maxWait)],
    ["Appointments on time", r(m.fifo.apptOnTimePct, "%"), r(m.smart.apptOnTimePct, "%"), change(m.fifo.apptOnTimePct ?? 0, m.smart.apptOnTimePct ?? 0, true)],
    ["Average wait", r(m.fifo.avgWait), r(m.smart.avgWait), change(m.fifo.avgWait, m.smart.avgWait)],
  ];
  return (
    <Panel title={title} meta="20 busy days" actionLabel={onOpen ? "Explore" : undefined} onAction={onOpen}>
      <div style={{ overflowX: "auto" }}>
      <table className="pc-table pc-table--dense">
        <thead><tr><th>Metric</th><th>FIFO</th><th>Smart</th><th>Change</th></tr></thead>
        <tbody>{rows.map((x) => <tr key={x[0]}><td>{x[0]}</td><td>{x[1]}</td><td style={{ color: "var(--ink)", fontWeight: 500 }}>{x[2]}</td><td>{x[3]}</td></tr>)}</tbody>
      </table>
      </div>
    </Panel>
  );
}
