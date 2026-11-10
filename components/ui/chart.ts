/**
 * Monotone cubic interpolation (Fritsch–Carlson) as an SVG path. Paper Calm asks for "smooth monotone curves": unlike a
 * plain smooth curve, a monotone one never overshoots between points, so a count of people can't dip below 0 or bulge
 * above the real peak just because of the smoothing.
 */
export function monotonePath(pts: [number, number][]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx = pts.slice(1).map((p, i) => p[0] - pts[i][0]);
  const slope = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / (dx[i] || 1));
  const m = pts.map((_, i) => (i === 0 ? slope[0] : i === n - 1 ? slope[n - 2] : slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / slope[i], b = m[i + 1] / slope[i], h = Math.hypot(a, b);
    if (h > 3) { m[i] = (3 * a * slope[i]) / h; m[i + 1] = (3 * b * slope[i]) / h; }
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${(pts[i][0] + h).toFixed(1)},${(pts[i][1] + m[i] * h).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)},${(pts[i + 1][1] - m[i + 1] * h).toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}

/** Nice round y-axis maximum and step for small counts. */
export function niceScale(max: number): { top: number; step: number } {
  const step = max <= 8 ? 2 : max <= 20 ? 5 : max <= 50 ? 10 : 20;
  return { top: Math.max(step * 2, Math.ceil(max / step) * step), step };
}

export const tooltipStyle = { pointerEvents: "none", padding: "8px 10px", background: "var(--dark)", color: "#fff", borderRadius: 12, font: "var(--type-label)", boxShadow: "var(--shadow-pop)", minWidth: 150 } as const;
