"use client";
import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { LiveQueue } from "./LiveQueue";
import { ServicesPage } from "./ServicesPage";
import { SettingsPage } from "./SettingsPage";
import { SimulationPage } from "./SimulationPage";
import { QueueProvider, useQueue } from "./QueueProvider";
import { Login } from "@/components/auth/Login";
import { Button } from "@/components/ui/Button";
import { ToastProvider, ease } from "@/components/ui/motion";
// Each page gets `go` so it can link to another page (e.g. Live Queue → Simulation).
const PAGES: Record<string, (p: { go: (page: string) => void }) => React.JSX.Element> = { "Live Queue": LiveQueue, Services: ServicesPage, Simulation: SimulationPage, Settings: SettingsPage };

export function Dashboard() {
  // reducedMotion="user": people who turned on "reduce motion" in their OS get no movement, only instant changes.
  return (
    <MotionConfig reducedMotion="user">
      <QueueProvider><ToastProvider><Shell /></ToastProvider></QueueProvider>
    </MotionConfig>
  );
}

function Shell() {
  const { mode, session, authChecked, syncError, retrySync, setOfflineDemo } = useQueue();
  const [page, setPage] = useState("Live Queue");
  if (mode === null || (mode === "supabase" && !authChecked)) return null;
  if (mode === "supabase" && !session) return <Login onOfflineDemo={() => setOfflineDemo(true)} />;
  const Page = PAGES[page];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "var(--sidebar-w) minmax(0,1fr)", minHeight: "100vh", minWidth: 1280 }}>
      <Sidebar page={page} setPage={setPage} />
      <div style={{ minWidth: 0, padding: "var(--page-pad) 32px 48px", display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
        <TopBar page={page} />
        <AnimatePresence>
          {syncError && (
            <motion.div role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease }}
              style={{ overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px 10px 16px", borderRadius: "var(--r-inset)", background: "var(--negative-bg)", color: "var(--negative)", font: "var(--type-body)" }}>
                <span className="pc-pill" style={{ background: "var(--raised)", color: "var(--negative)" }}>Sync problem</span>
                <span style={{ flex: 1 }}>{syncError}. Showing the latest data from the database.</span>
                {mode === "supabase" && <Button size="sm" onClick={retrySync}>Try again</Button>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Page transition: the old page fades out and lifts (mode="wait" lets it finish first), the view returns to the top,
            then the new page fades in while its cards rise in one after another. */}
        <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo({ top: 0 })}>
          <motion.div key={page} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.3, ease } }} exit={{ opacity: 0, y: -8, transition: { duration: 0.2, ease } }}>
            <Page go={setPage} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
