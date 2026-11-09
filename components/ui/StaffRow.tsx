import type { ReactNode } from "react";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import type { StaffStatus } from "@/lib/data";
const LBL: Record<StaffStatus, string> = { busy: "Busy", available: "Available", break: "On Break" };
const DOT: Record<StaffStatus, string> = { busy: "var(--green-500)", available: "var(--green-500)", break: "var(--orange-500)" };
export function StaffRow({ name, skills, status, note, src, warn, actions }: { name: string; skills: string; status: StaffStatus; note?: string; src?: string; warn?: boolean; actions?: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "36px minmax(0,1fr) 72px minmax(0,110px)", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border-card)" }}>
      <Avatar src={src} size={34} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, font: "var(--fw-medium) var(--fs-table) var(--font-sans)" }}><span style={{ width: 6, height: 6, borderRadius: 999, background: DOT[status] }} />{name}</div>
        <div style={{ font: "var(--fw-regular) var(--fs-label) var(--font-sans)", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{skills}</div>
      </div>
      <Badge tone={status}>{LBL[status]}</Badge>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <div style={{ font: "var(--fw-regular) var(--fs-label) var(--font-sans)", color: warn ? "var(--red-600)" : "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{note}</div>
        {actions}
      </div>
    </div>
  );
}
