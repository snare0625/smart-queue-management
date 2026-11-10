"use client";
import { ListChecks, MonitorPlay, Settings, Tag, Workflow } from "lucide-react";
import { SideNavItem } from "@/components/ui/SideNavItem";
import { Avatar } from "@/components/ui/Avatar";
import { useQueue } from "./QueueProvider";

// Only pages that exist. (The first mockup listed Customers/Staff/Appointments/Analytics, which led nowhere.)
export const PAGES = [[ListChecks, "Live Queue"], [Tag, "Services"], [Workflow, "Simulation"], [Settings, "Settings"]] as const;

export function Sidebar({ page, setPage }: { page: string; setPage: (p: string) => void }) {
  const { mode, session } = useQueue();
  const who = session?.user.email ?? "Offline demo";
  const initials = session?.user.email ? session.user.email.slice(0, 2).toUpperCase() : "QP";
  return (
    <aside style={{ background: "var(--surface)", borderRight: "1px solid var(--track)", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 24, position: "sticky", top: 0, height: "100vh" }}>
      <div style={{ padding: "0 10px" }}>
        <div style={{ font: "500 22px/28px var(--font-sans)", letterSpacing: "-0.02em", color: "var(--ink)" }}>QueuePro<span style={{ color: "var(--brand)" }}>.</span></div>
        <div style={{ font: "var(--type-label)", color: "var(--label)" }}>Fairer queues. Happier customers.</div>
      </div>
      <nav aria-label="Main" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {PAGES.map(([I, l]) => <SideNavItem key={l} icon={I} label={l} active={page === l} onClick={() => setPage(l)} />)}
      </nav>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ padding: "0 14px", font: "var(--type-label)", color: "var(--label)" }}>Public</span>
        <SideNavItem icon={MonitorPlay} label="Waiting-room screen" href="/display" />
      </div>
      <div className="pc-inset" style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar initials={initials} size={32} />
        <div style={{ minWidth: 0 }}>
          <div style={{ font: "var(--type-control)", color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={who}>{who}</div>
          <div style={{ font: "var(--type-label)", color: "var(--label)" }}>{mode === "supabase" ? "Staff · Supabase" : "Data stays in this tab"}</div>
        </div>
      </div>
    </aside>
  );
}
