"use client";
import { useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
export function Select({ value, options, icon: I, onChange, width = 216 }: { value: string; options: string[]; icon?: LucideIcon; onChange?: (v: string) => void; width?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", width }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", height: 38, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-dark)", background: "var(--bg-topbar)", color: "var(--text-on-dark)", font: "var(--fw-regular) var(--fs-body) var(--font-sans)", cursor: "pointer", boxShadow: open ? "var(--ring-focus)" : "none" }}>
        {I && <I size={16} />}
        <span style={{ flex: 1, textAlign: "left" }}>{value}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div role="listbox" style={{ position: "absolute", top: 42, left: 0, right: 0, zIndex: 10, background: "var(--surface-dark)", border: "1px solid var(--border-dark)", borderRadius: "var(--radius-md)", padding: 4 }}>
          {options.map((o) => (
            <div key={o} role="option" aria-selected={o === value} onClick={() => { setOpen(false); onChange?.(o); }} style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)", color: "var(--text-on-dark)", font: "var(--type-table)", cursor: "pointer", background: o === value ? "var(--nav-active-bg)" : "transparent" }}>{o}</div>
          ))}
        </div>
      )}
    </div>
  );
}
