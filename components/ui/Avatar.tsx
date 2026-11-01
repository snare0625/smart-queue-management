/* eslint-disable @next/next/no-img-element */
export function Avatar({ src, initials, size = 36 }: { src?: string; initials?: string; size?: number }) {
  return src
    ? <img src={src} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: 999, objectFit: "cover", display: "block", flexShrink: 0 }} />
    : <span style={{ width: size, height: size, borderRadius: 999, background: "var(--navy-600)", color: "var(--text-on-dark)", display: "grid", placeItems: "center", font: `var(--fw-semibold) ${Math.round(size * 0.4)}px var(--font-sans)`, flexShrink: 0 }}>{initials}</span>;
}
