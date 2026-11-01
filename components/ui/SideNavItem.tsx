"use client";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
export function SideNavItem({ icon: I, label, active, onClick }: { icon: LucideIcon; label: string; active?: boolean; onClick?: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", height: "var(--nav-item-h)", padding: "0 10px", borderRadius: "var(--radius-md)", border: "1px solid " + (active ? "var(--nav-active-border)" : "transparent"), background: active ? "var(--nav-active-bg)" : h ? "rgba(255,255,255,.04)" : "transparent", color: "var(--text-on-dark)", font: "var(--fw-regular) var(--fs-body) var(--font-sans)", textAlign: "left", cursor: "pointer" }}>
      <I size={18} strokeWidth={1.75} />
      {label}
    </button>
  );
}
