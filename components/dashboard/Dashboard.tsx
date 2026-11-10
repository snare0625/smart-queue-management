"use client";
import { useState } from "react";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { LiveQueue } from "./LiveQueue";
import { ServicesPage } from "./ServicesPage";
import { SettingsPage } from "./SettingsPage";
import { SimulationPage } from "./SimulationPage";
import { QueueProvider, useQueue } from "./QueueProvider";
import { Login } from "@/components/auth/Login";
// Each page gets `go` so it can link to another page (e.g. Live Queue → Simulation).
const PAGES: Record<string, (p: { go: (page: string) => void }) => React.JSX.Element> = { "Live Queue": LiveQueue, Services: ServicesPage, Simulation: SimulationPage, Settings: SettingsPage };

export function Dashboard() {
  return <QueueProvider><Shell /></QueueProvider>;
}

function Shell() {
  const { mode, session, authChecked, syncError, setOfflineDemo } = useQueue();
  const [page, setPage] = useState("Live Queue");
  if (mode === null || (mode === "supabase" && !authChecked)) return null;
  if (mode === "supabase" && !session) return <Login onOfflineDemo={() => setOfflineDemo(true)} />;
  const Page = PAGES[page];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "var(--sidebar-w) 1fr", gridTemplateRows: "var(--topbar-h) 1fr", minHeight: "100vh", minWidth: 1280 }}>
      <TopBar page={page} setPage={setPage} />
      <Sidebar page={page} setPage={setPage} />
      <div style={{ minWidth: 0 }}>
        {syncError && <div role="alert" style={{ margin: "16px 16px 0", padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--red-100)", color: "var(--red-600)", font: "var(--type-table)" }}>Sync problem: {syncError} — showing the latest data from the database.</div>}
        {Page ? <Page go={setPage} /> : <main style={{ padding: 40, color: "var(--text-on-dark-muted)", font: "var(--type-body)" }}>{page} — coming soon.</main>}
      </div>
    </div>
  );
}
