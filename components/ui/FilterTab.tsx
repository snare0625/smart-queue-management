"use client";
import { useState } from "react";
export function FilterTab({ label, count, active, onClick }: { label: string; count?: number; active?: boolean; onClick?: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ height: "var(--pill-h)", padding: "0 14px", borderRadius: "var(--radius-sm)", border: "1px solid " + (active ? "var(--blue-500)" : "var(--border-card)"), background: active ? "var(--blue-500)" : h ? "var(--gray-150)" : "var(--surface-muted)", color: active ? "var(--white)" : "var(--text-primary)", font: "var(--fw-regular) var(--fs-table) var(--font-sans)", cursor: "pointer", whiteSpace: "nowrap" }}>
      {label}{count != null ? ` (${count})` : ""}
    </button>
  );
}
