"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { fmtTime, type PublicView } from "@/lib/engine";
import { subscribeDisplay } from "@/lib/sync/displayChannel";

const STALE_MS = 45_000; // the dashboard re-sends every 15 s; three missed updates = show "reconnecting"

const waitLabel = (m: number | null) => (m == null ? "—" : m < 1 ? "Next" : `~${m} min`);

export function DisplayScreen() {
  const [view, setView] = useState<PublicView | null>(null);
  const [receivedAt, setReceivedAt] = useState(0);
  const [clock, setClock] = useState<number | null>(null);
  const [fresh, setFresh] = useState<string[]>([]); // tickets called since the last update → flash them
  const prevServing = useRef<string[]>([]);

  useEffect(() => subscribeDisplay((v) => {
    const serving = v.nowServing.map((s) => s.ticket);
    setFresh(prevServing.current.length ? serving.filter((t) => !prevServing.current.includes(t)) : []);
    prevServing.current = serving;
    setView(v);
    setReceivedAt(Date.now());
  }), []);
  useEffect(() => { setClock(Date.now()); const t = setInterval(() => setClock(Date.now()), 5000); return () => clearInterval(t); }, []);

  const stale = clock !== null && (!view || clock - receivedAt > STALE_MS);

  return (
    <div style={{ minHeight: "100vh", background: "var(--navy-950)", color: "var(--text-on-dark)", display: "flex", flexDirection: "column", font: "var(--type-body)" }}>
      <style>{`@keyframes called { 0%,100% { background: var(--green-950) } 50% { background: var(--green-700) } }`}</style>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid var(--border-dark)" }}>
        <img src="/assets/logo-lockup.png" alt="QueuePro" style={{ height: 52 }} />
        <div style={{ textAlign: "right" }}>
          <div style={{ font: "600 44px/1 var(--font-sans)" }}>{clock ? fmtTime(view?.generatedAt ?? clock) : "--:--"}</div>
          <div style={{ font: "500 15px var(--font-sans)", color: stale ? "var(--orange-500)" : "var(--green-500)" }}>{stale ? "● Reconnecting to the front desk…" : "● Live"}</div>
        </div>
      </header>

      <main style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr)", gap: 32, padding: 40 }}>
        <section>
          <h2 style={{ margin: "0 0 20px", font: "600 28px var(--font-sans)", color: "var(--text-on-dark-muted)" }}>Now Serving</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {view?.nowServing.length ? view.nowServing.map((s) => (
              <div key={s.ticket} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 30px", borderRadius: 14, background: "var(--green-950)", borderLeft: "8px solid var(--green-600)", animation: fresh.includes(s.ticket) ? "called 1s ease-in-out 4" : undefined }}>
                <span style={{ font: "700 72px/1 var(--font-sans)", letterSpacing: 1 }}>{s.ticket}</span>
                <span style={{ textAlign: "right" }}>
                  <span style={{ display: "block", font: "500 16px var(--font-sans)", color: "var(--text-on-dark-muted)" }}>please go to</span>
                  <span style={{ font: "600 30px var(--font-sans)" }}>{s.counter}</span>
                </span>
              </div>
            )) : <p style={{ font: "400 22px var(--font-sans)", color: "var(--text-on-dark-muted)" }}>{view ? "Nobody is being served right now." : "Waiting for the front desk…"}</p>}
          </div>
        </section>

        <section>
          <h2 style={{ margin: "0 0 20px", font: "600 28px var(--font-sans)", color: "var(--text-on-dark-muted)" }}>Waiting · {view?.waitingCount ?? 0}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
            {view?.waiting.map((w) => (
              <div key={w.ticket} style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", alignItems: "center", gap: 16, padding: "14px 20px", borderRadius: 12, background: "var(--navy-800)", border: "1px solid var(--border-dark)" }}>
                <span style={{ font: "500 18px var(--font-sans)", color: "var(--text-on-dark-subtle)" }}>#{w.position}</span>
                <span style={{ font: "700 34px/1 var(--font-sans)" }}>{w.ticket}</span>
                <span style={{ font: "500 22px var(--font-sans)", color: w.estWaitMin != null && w.estWaitMin < 1 ? "var(--green-500)" : "var(--text-on-dark-muted)" }}>{waitLabel(w.estWaitMin)}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer style={{ padding: "16px 40px", borderTop: "1px solid var(--border-dark)", display: "flex", justifyContent: "space-between", font: "400 16px var(--font-sans)", color: "var(--text-on-dark-subtle)" }}>
        <span>Please listen for your ticket number. Urgent cases may be seen first; everyone is guaranteed to move up.</span>
        <span>Wait times are estimates.</span>
      </footer>
    </div>
  );
}
