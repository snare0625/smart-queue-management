"use client";
import { useState, type CSSProperties, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
const V: Record<string, CSSProperties> = {
  primary: { background: "var(--accent)", color: "var(--white)", border: "1px solid var(--accent)" },
  secondary: { background: "var(--surface-card)", color: "var(--text-primary)", border: "1px solid var(--border-strong)" },
  ghost: { background: "transparent", color: "var(--accent-text)", border: "1px solid transparent" },
  dark: { background: "var(--surface-dark)", color: "var(--text-on-dark)", border: "1px solid var(--border-dark)" },
};
export function Button({ variant = "primary", size = "md", icon: I, children, disabled, onClick, style }: { variant?: "primary" | "secondary" | "ghost" | "dark"; size?: "sm" | "md"; icon?: LucideIcon; children?: ReactNode; disabled?: boolean; onClick?: () => void; style?: CSSProperties }) {
  const [h, setH] = useState(false);
  const hov: CSSProperties = h && !disabled ? (variant === "primary" ? { background: "var(--accent-hover)" } : variant === "ghost" ? { textDecoration: "underline" } : { filter: "brightness(0.97)" }) : {};
  return (
    <button disabled={disabled} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, height: size === "sm" ? 28 : 34, padding: size === "sm" ? "0 10px" : "0 14px", borderRadius: "var(--radius-sm)", font: `var(--fw-medium) ${size === "sm" ? 12 : 13}px var(--font-sans)`, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap", transition: "background var(--dur-fast) var(--ease-standard)", ...V[variant], ...hov, ...style }}>
      {I && <I size={size === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
}
