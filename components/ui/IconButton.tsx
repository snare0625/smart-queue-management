"use client";
import { useState, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
export function IconButton({ icon: I, label, tone = "light", size = 28, onClick, style }: { icon: LucideIcon; label: string; tone?: "light" | "dark"; size?: number; onClick?: () => void; style?: CSSProperties }) {
  const [h, setH] = useState(false);
  const dark = tone === "dark";
  return (
    <button aria-label={label} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: size, height: size, display: "inline-grid", placeItems: "center", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", color: dark ? "var(--text-on-dark)" : "var(--text-primary)", background: h ? (dark ? "rgba(255,255,255,.08)" : "var(--surface-muted)") : "transparent", transition: "background var(--dur-fast)", ...style }}>
      <I size={Math.round(size * 0.6)} />
    </button>
  );
}
