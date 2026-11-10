"use client";
import { useEffect, useRef, useState } from "react";
import { MIN, fmtTime, type Policy, type SimResult } from "@/lib/engine";

// Validated with the dataviz palette checker on the white card surface (all pairs pass; identity is also carried by labels).
export const POLICY_COLOR: Record<Policy, string> = { smart: "#1D74FD", strict: "#D9620B", fifo: "#239481" };
export const POLICY_SHORT: Record<Policy, string> = { fifo: "FIFO", strict: "Strict priority", smart: "Smart queue" };
const ORDER: Policy[] = ["smart", "strict", "fifo"];
const PAD = { l: 34, r: 92, t: 14, b: 26 };
const H = 240;

/** People waiting, minute by minute, for each policy. `cursor` = playback position (minutes after opening). */
export function WaitingChart({ results, open, cursor }: { results: Record<Policy, SimResult>; open: number; cursor: number | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.max(320, e.contentRect.width)));
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const minutes = Math.max(...ORDER.map((p) => results[p].timeline.length)) - 1;
  const peak = Math.max(4, ...ORDER.map((p) => results[p].metrics.peakQueue));
  const step = peak <= 8 ? 2 : peak <= 20 ? 5 : 10;
  const yMax = Math.ceil(peak / step) * step;
  const x = (m: number) => PAD.l + (m / minutes) * (w - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / yMax) * (H - PAD.t - PAD.b);
  const at = (p: Policy, m: number) => results[p].timeline[Math.min(m, results[p].timeline.length - 1)]?.waiting ?? 0;
  const path = (p: Policy) => results[p].timeline.map((pt, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(pt.waiting).toFixed(1)}`).join("");

  // Direct labels sit at each line's peak, nudged apart so they never overlap.
  const labels = ORDER.map((p) => {
    const tl = results[p].timeline;
    const i = tl.reduce((best, pt, j) => (pt.waiting > tl[best].waiting ? j : best), 0);
    return { p, x: x(i), y: y(tl[i].waiting) - 8 };
  }).sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) if (Math.abs(labels[i].x - labels[i - 1].x) < 110 && labels[i].y - labels[i - 1].y < 14) labels[i].y = labels[i - 1].y + 14;

  const focus = hover ?? cursor;
  const hours = Array.from({ length: Math.floor(minutes / 60) + 1 }, (_, i) => i * 60);

  return (
    <div ref={box} style={{ position: "relative" }}>
      <svg width={w} height={H} role="img" aria-label="Number of people waiting through the day for each queue algorithm"
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const m = Math.round(((e.clientX - r.left - PAD.l) / (w - PAD.l - PAD.r)) * minutes); setHover(m >= 0 && m <= minutes ? m : null); }}
        onMouseLeave={() => setHover(null)} style={{ display: "block", cursor: "crosshair" }}>
        {Array.from({ length: yMax / step + 1 }, (_, i) => i * step).map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={w - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--gray-150)" />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">{v}</text>
          </g>
        ))}
        {hours.map((m) => <text key={m} x={x(m)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{fmtTime(open + m * MIN)}</text>)}
        {ORDER.map((p) => <path key={p} d={path(p)} fill="none" stroke={POLICY_COLOR[p]} strokeWidth={2} strokeLinejoin="round" />)}
        {labels.map((l) => <text key={l.p} x={Math.min(l.x, w - PAD.r - 4)} y={l.y} textAnchor="middle" fontSize="11" fontWeight={600} fill="var(--text-secondary)">{POLICY_SHORT[l.p]}</text>)}
        {focus != null && (
          <g>
            <line x1={x(focus)} x2={x(focus)} y1={PAD.t} y2={H - PAD.b} stroke="var(--gray-600)" strokeDasharray="3 3" />
            {ORDER.map((p) => <circle key={p} cx={x(focus)} cy={y(at(p, focus))} r={4.5} fill={POLICY_COLOR[p]} stroke="var(--surface-card)" strokeWidth={2} />)}
          </g>
        )}
      </svg>
      {hover != null && (
        <div role="tooltip" style={{ position: "absolute", top: 8, left: Math.min(x(hover) + 12, w - 170), pointerEvents: "none", padding: "8px 10px", background: "var(--surface-card)", border: "1px solid var(--border-card)", borderRadius: "var(--radius-sm)", boxShadow: "0 6px 18px rgba(10,20,30,.18)", font: "var(--type-label)", color: "var(--text-primary)", minWidth: 150 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{fmtTime(open + hover * MIN)} · waiting</div>
          {ORDER.map((p) => (
            <div key={p} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 2, background: POLICY_COLOR[p] }} />
              <span style={{ flex: 1, color: "var(--text-secondary)" }}>{POLICY_SHORT[p]}</span>
              <b style={{ fontWeight: 600 }}>{at(p, hover)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
