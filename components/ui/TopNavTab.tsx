"use client";
import { useState } from "react";
export function TopNavTab({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ height: 38, padding: "0 16px", border: "none", borderBottom: "2px solid " + (active ? "var(--blue-500)" : "transparent"), borderRadius: "var(--radius-sm) var(--radius-sm) 0 0", background: active ? "var(--nav-active-bg)" : "transparent", color: active ? "var(--blue-150)" : h ? "var(--white)" : "var(--text-on-dark)", font: "var(--fw-regular) var(--fs-body) var(--font-sans)", cursor: "pointer", whiteSpace: "nowrap" }}>
      {label}
    </button>
  );
}
