"use client";
import { useState } from "react";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { LiveQueue } from "./LiveQueue";
export function Dashboard() {
  const [page, setPage] = useState("Live Queue");
  return (
    <div style={{ display: "grid", gridTemplateColumns: "var(--sidebar-w) 1fr", gridTemplateRows: "var(--topbar-h) 1fr", minHeight: "100vh", minWidth: 1280 }}>
      <TopBar page={page} setPage={setPage} />
      <Sidebar page={page} setPage={setPage} />
      {page === "Live Queue" ? <LiveQueue /> : <main style={{ padding: 40, color: "var(--text-on-dark-muted)", font: "var(--type-body)" }}>{page} — coming soon.</main>}
    </div>
  );
}
