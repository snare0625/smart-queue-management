"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { TopNavTab } from "@/components/ui/TopNavTab";
import { Select } from "@/components/ui/Select";
import { UserChip } from "@/components/ui/UserChip";
const TABS = ["Live Queue", "Staff", "Services", "Analytics", "Simulation", "Settings"];
export function TopBar({ page, setPage }: { page: string; setPage: (p: string) => void }) {
  const [loc, setLoc] = useState("Riverside Clinic");
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(t); }, []);
  const date = now ? now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).replace(",", "") : "";
  const time = now ? now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "--:--";
  return (
    <header style={{ gridColumn: "1 / -1", height: "var(--topbar-h)", background: "var(--bg-topbar)", borderBottom: "1px solid var(--border-dark)", display: "flex", alignItems: "center", gap: 24, padding: "0 16px" }}>
      <img src="/assets/logo-lockup.png" alt="QueuePro — Fairer queues. Happier customers." style={{ height: 46, width: 250, objectFit: "contain", objectPosition: "left" }} />
      <nav style={{ display: "flex", gap: 2, flex: 1 }}>{TABS.map((t) => <TopNavTab key={t} label={t} active={page === t} onClick={() => setPage(t)} />)}</nav>
      <Select icon={MapPin} value={loc} onChange={setLoc} options={["Riverside Clinic", "Harbour Clinic", "Northgate Clinic"]} />
      <UserChip initials="AN" name="Andrei N" role="Manager" />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 90 }}>
        <span style={{ font: "400 11px var(--font-sans)", color: "var(--text-on-dark-muted)" }}>{date}</span>
        <span style={{ font: "500 24px/1 var(--font-sans)" }}>{time}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, font: "var(--type-label)", color: "var(--green-500)" }}><span style={{ width: 7, height: 7, borderRadius: 9, background: "var(--green-500)" }} />Live</span>
      </div>
    </header>
  );
}
