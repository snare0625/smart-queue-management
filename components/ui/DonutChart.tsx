import type { ReactNode } from "react";
export function DonutChart({ data, size = 140, stroke = 26, center, caption }: { data: { value: number; color: string }[]; size?: number; stroke?: number; center?: ReactNode; caption?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, total = data.reduce((a, d) => a + d.value, 0) || 1;
  let off = 0;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {data.map((d, i) => { const len = (d.value / total) * c; const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={stroke} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off} />; off += len; return el; })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center" }}>
        <div style={{ font: "var(--type-stat)", color: "var(--text-primary)" }}>{center}</div>
        <div style={{ font: "var(--type-table)", color: "var(--text-primary)" }}>{caption}</div>
      </div>
    </div>
  );
}
