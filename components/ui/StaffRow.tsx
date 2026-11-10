import type { ReactNode } from "react";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import type { StaffStatus } from "@/lib/data";
const LBL: Record<StaffStatus, string> = { busy: "Busy", available: "Available", break: "On break" };

/** One staff member as an inset row: avatar, name + skills, status pill, and a short note (what they're doing). */
export function StaffRow({ name, skills, status, note, src, warn, actions }: { name: string; skills: string; status: StaffStatus; note?: string; src?: string; warn?: boolean; actions?: ReactNode }) {
  return (
    <div className="pc-inset" style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr) auto", alignItems: "center", gap: 12 }}>
      <Avatar src={src} size={34} />
      <div style={{ minWidth: 0 }}>
        <div style={{ font: "var(--type-body)", fontWeight: 500, color: "var(--ink)" }}>{name}</div>
        <div style={{ font: "var(--type-label)", color: "var(--label)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={skills}>{skills}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <Badge tone={status}>{LBL[status]}</Badge>
        {note && <span style={{ font: "var(--type-label)", color: warn ? "var(--negative)" : "var(--label)", whiteSpace: "nowrap" }}>{note}</span>}
        {actions}
      </div>
    </div>
  );
}
