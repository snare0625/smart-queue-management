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
    <div style={{ display: "grid", gridTemplateColumns: "var(--sidebar-w) minmax(0,1fr)", minHeight: "100vh", minWidth: 1280 }}>
      <Sidebar page={page} setPage={setPage} />
      <div style={{ minWidth: 0, padding: "var(--page-pad) 32px 48px", display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
        <TopBar page={page} />
        {syncError && (
          <div role="alert" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: "var(--r-inset)", background: "var(--negative-bg)", color: "var(--negative)", font: "var(--type-body)" }}>
            <span className="pc-pill" style={{ background: "var(--raised)", color: "var(--negative)" }}>Sync problem</span>{syncError} — showing the latest data from the database.
          </div>
        )}
        <Page go={setPage} />
      </div>
    </div>
  );
}
