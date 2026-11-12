"use client";
import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { dur, ease } from "@/components/ui/motion";
import { MIN, fmtTime, type Policy, type SimResult } from "@/lib/engine";
import { monotonePath, niceScale, tooltipStyle } from "@/components/ui/chart";

// Validated series colours (docs/design-system/CHART-PALETTE.md). Lines are also direct-labelled, so colour is never the only cue.
export const POLICY_COLOR: Record<Policy, string> = { smart: "var(--series-1)", strict: "var(--series-2)", fifo: "var(--series-3)" };
export const POLICY_SHORT: Record<Policy, string> = { fifo: "FIFO", strict: "Strict priority", smart: "Smart queue" };
const ORDER: Policy[] = ["fifo", "strict", "smart"]; // smart drawn last = on top
const PAD = { l: 34, r: 24, t: 18, b: 28 };
const H = 260;
const SAMPLE = 5; // minutes between curve points

/** People waiting through the day for each policy. `cursor` = playback position (minutes after opening). */
export function WaitingChart({ results, open, cursor }: { results: Record<Policy, SimResult>; open: number; cursor: number | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [hover, setHover] = useState<number | null>(null);
  const clip = "clip-" + useId().replace(/[^a-zA-Z0-9]/g, ""); // useId can contain «» or ":" which break url(#…)
  const reduce = useReducedMotion();
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.max(320, e.contentRect.width)));
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const minutes = Math.max(...ORDER.map((p) => results[p].timeline.length)) - 1;
  const { top, step } = niceScale(Math.max(...ORDER.map((p) => results[p].metrics.peakQueue)));
  const x = (m: number) => PAD.l + (m / minutes) * (w - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / top) * (H - PAD.t - PAD.b);
  const at = (p: Policy, m: number) => results[p].timeline[Math.min(m, results[p].timeline.length - 1)]?.waiting ?? 0;
  const samples = (p: Policy) => {
    const last = results[p].timeline.length - 1;
    const ms = Array.from({ length: Math.floor(last / SAMPLE) + 1 }, (_, i) => i * SAMPLE);
    if (ms[ms.length - 1] !== last) ms.push(last);
    return ms.map((m) => [x(m), y(at(p, m))] as [number, number]);
  };
  const curves = Object.fromEntries(ORDER.map((p) => [p, samples(p)])) as Record<Policy, [number, number][]>;
  // dot sits on the drawn curve (linear between samples); the tooltip shows the exact count for that minute
  const onCurve = (p: Policy, m: number) => {
    const pts = curves[p], px = x(m);
    const i = Math.max(0, pts.findIndex((pt) => pt[0] >= px) - 1);
    const [a, b] = [pts[i], pts[Math.min(i + 1, pts.length - 1)]];
    return b[0] === a[0] ? a[1] : a[1] + ((px - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
  };

  // Direct labels go where each line stands most apart from the others (not at the peak, where all three tend to meet).
  // Greedy: the hero series (smart) picks first; each next label takes its best spot that is ≥140 px from labels already placed.
  // If the line is the highest there, the label sits above it; otherwise below.
  const candidates = (p: Policy) => {
    const out: { m: number; score: number; above: boolean }[] = [];
    for (let m = 30; m < results[p].timeline.length - 30; m += 5) {
      const v = at(p, m), others = ORDER.filter((o) => o !== p).map((o) => at(o, m));
      const gap = Math.min(...others.map((o) => Math.abs(v - o)));
      out.push({ m, score: gap * 3 + v * 0.4, above: others.every((o) => o <= v) });
    }
    return out.sort((a, b) => b.score - a.score);
  };
  const labels: { p: Policy; x: number; y: number }[] = [];
  for (const p of ["smart", "strict", "fifo"] as Policy[]) {
    const c = candidates(p).find((k) => labels.every((l) => Math.abs(l.x - x(k.m)) >= 140)) ?? candidates(p)[0];
    if (!c) continue;
    const v = at(p, c.m);
    labels.push({ p, x: Math.min(Math.max(x(c.m), PAD.l + 48), w - PAD.r - 56), y: c.above || v === 0 ? y(v) - 10 : y(v) + 18 });
  }

  const focus = hover ?? cursor;
  const hours = Array.from({ length: Math.floor(minutes / 60) + 1 }, (_, i) => i * 60);

  return (
    <div ref={box} style={{ position: "relative" }}>
      <svg width={w} height={H} role="img" aria-label="Number of people waiting through the day for each queue algorithm"
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const m = Math.round(((e.clientX - r.left - PAD.l) / (w - PAD.l - PAD.r)) * minutes); setHover(m >= 0 && m <= minutes ? m : null); }}
        onMouseLeave={() => setHover(null)} style={{ display: "block", cursor: "crosshair" }}>
        <defs>
          <linearGradient id="smart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--series-1)" stopOpacity=".32" /><stop offset="1" stopColor="var(--series-1)" stopOpacity="0" />
          </linearGradient>
          {/* the data wipes in from the left (1.3 s); a clip-path reveals it, so the lines themselves never distort */}
          <clipPath id={clip}><motion.rect x={0} y={0} height={H} initial={{ width: reduce ? w : 0 }} animate={{ width: w }} transition={{ duration: dur.wipe, ease }} /></clipPath>
        </defs>
        {Array.from({ length: top / step + 1 }, (_, i) => i * step).map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={w - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--grid-line)" strokeDasharray={v === 0 ? undefined : "3 4"} />
            <text x={PAD.l - 10} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--label)">{v}</text>
          </g>
        ))}
        {hours.map((m) => <text key={m} x={x(m)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--label)">{fmtTime(open + m * MIN)}</text>)}
        <g clipPath={`url(#${clip})`}>
        <path d={`${monotonePath(curves.smart)}L${curves.smart.at(-1)![0]},${y(0)}L${curves.smart[0][0]},${y(0)}Z`} fill="url(#smart-fill)" />
        {ORDER.map((p) => <path key={p} d={monotonePath(curves[p])} fill="none" stroke={POLICY_COLOR[p]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />)}
        {labels.map((l) => <text key={l.p} x={l.x} y={l.y} textAnchor="middle" fontSize="12" fontWeight={500} fill="var(--ink-2)" stroke="var(--surface)" strokeWidth={4} strokeLinejoin="round" paintOrder="stroke">{POLICY_SHORT[l.p]}</text>)}
        </g>
        {focus != null && (
          <g>
            <line x1={x(focus)} x2={x(focus)} y1={PAD.t} y2={H - PAD.b} stroke="var(--label)" strokeDasharray="3 3" />
            {ORDER.map((p) => <circle key={p} cx={x(focus)} cy={onCurve(p, focus)} r={4.5} fill="#fff" stroke={POLICY_COLOR[p]} strokeWidth={2} />)}
          </g>
        )}
      </svg>
      {hover != null && (
        <div role="tooltip" style={{ ...tooltipStyle, position: "absolute", top: 8, left: Math.min(x(hover) + 14, w - 180) }}>
          <div style={{ color: "#B5B5BA", marginBottom: 4 }}>{fmtTime(open + hover * MIN)} · people waiting</div>
          {[...ORDER].reverse().map((p) => (
            <div key={p} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 2, borderRadius: 2, background: POLICY_COLOR[p] }} />
              <span style={{ flex: 1 }}>{POLICY_SHORT[p]}</span>
              <span>{at(p, hover)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
