"use client";
/* eslint-disable @next/next/no-img-element */
import { BarChart3, CalendarDays, ListChecks, Settings, Tag, User, Users, Workflow } from "lucide-react";
import { SideNavItem } from "@/components/ui/SideNavItem";
const ITEMS = [[ListChecks, "Live Queue"], [User, "Customers"], [Users, "Staff"], [Tag, "Services"], [CalendarDays, "Appointments"], [BarChart3, "Analytics"], [Workflow, "Simulation"], [Settings, "Settings"]] as const;
export function Sidebar({ page, setPage }: { page: string; setPage: (p: string) => void }) {
  return (
    <aside style={{ background: "var(--bg-sidebar)", borderRight: "1px solid var(--border-dark)", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
      {ITEMS.map(([I, l]) => <SideNavItem key={l} icon={I} label={l} active={page === l} onClick={() => setPage(l)} />)}
      <img src="/assets/footer-mark.png" alt="Better flow. Happier people." style={{ marginTop: "auto", width: 170 }} />
    </aside>
  );
}
