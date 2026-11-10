/* eslint-disable @next/next/no-img-element */
// Paper Calm avatar pairs (tint background / text); picked from the initials so a person keeps the same colours.
const PAIRS = [["#FAE6E2", "#B5401B"], ["#E0EAF6", "#1F5BB8"], ["#ECE5F7", "#5B3BB8"], ["#E0EDE6", "#167A45"]];
export function Avatar({ src, initials = "", size = 36 }: { src?: string; initials?: string; size?: number }) {
  if (src) return <img src={src} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", display: "block", flexShrink: 0 }} />;
  const [bg, fg] = PAIRS[[...initials].reduce((s, c) => s + c.charCodeAt(0), 0) % PAIRS.length];
  return <span aria-hidden style={{ width: size, height: size, borderRadius: 999, background: bg, color: fg, display: "grid", placeItems: "center", font: `500 ${Math.round(size * 0.38)}px var(--font-sans)`, flexShrink: 0 }}>{initials}</span>;
}
