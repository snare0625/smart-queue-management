"use client";
import { useEffect, useRef, useState } from "react";
import { fmtTime, type PublicView } from "@/lib/engine";
import { subscribeDisplay } from "@/lib/sync/displayChannel";
import { getSupabase } from "@/lib/db/client";

const STALE_MS = 45_000; // the dashboard re-sends every 15 s; three missed updates = show "reconnecting"

const waitLabel = (m: number | null) => (m == null ? "—" : m < 1 ? "Next" : `~${m} min`);

export function DisplayScreen() {
  const [view, setView] = useState<PublicView | null>(null);
  const [receivedAt, setReceivedAt] = useState(0);
  const [clock, setClock] = useState<number | null>(null);
  const [fresh, setFresh] = useState<string[]>([]); // tickets called since the last update → flash them
  const prevServing = useRef<string[]>([]);

  useEffect(() => subscribeDisplay(getSupabase(), (v, publishedAt) => {
    const serving = v.nowServing.map((s) => s.ticket);
    setFresh(prevServing.current.length ? serving.filter((t) => !prevServing.current.includes(t)) : []);
    prevServing.current = serving;
    setView(v);
    setReceivedAt(publishedAt);
  }), []);
  useEffect(() => { setClock(Date.now()); const t = setInterval(() => setClock(Date.now()), 5000); return () => clearInterval(t); }, []);

  const stale = clock !== null && (!view || clock - receivedAt > STALE_MS);

  const card = { background: "var(--surface)", border: "var(--rim)", borderRadius: "var(--r-card)", boxShadow: "var(--shadow-card)" } as const;
  return (
    <div style={{ minHeight: "100vh", background: "var(--canvas)", color: "var(--ink)", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes called { 0%,100% { background: var(--surface) } 50% { background: var(--brand-tint) } }`}</style>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 48px 8px" }}>
        <div>
          <div style={{ font: "500 30px/36px var(--font-sans)", letterSpacing: "-0.02em" }}>QueuePro<span style={{ color: "var(--brand)" }}>.</span></div>
          <div style={{ font: "400 18px/24px var(--font-sans)", color: "var(--label)" }}>Riverside Clinic · waiting room</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span className="pc-pill" style={{ height: 32, padding: "0 14px", font: "500 16px var(--font-sans)", background: stale ? "var(--warning-bg)" : "var(--positive-bg)", color: stale ? "var(--warning)" : "var(--positive)" }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 9, background: "currentColor" }} />{stale ? "Reconnecting to the front desk…" : "Live"}
          </span>
          <span style={{ font: "400 48px/1 var(--font-sans)", letterSpacing: "-0.01em" }}>{clock ? fmtTime(view?.generatedAt ?? clock) : "--:--"}</span>
        </div>
      </header>

      <main style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.25fr)", gap: 24, padding: "24px 48px" }}>
        <section style={{ ...card, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ margin: 0, font: "500 24px/30px var(--font-sans)" }}>Now serving</h2>
          {view?.nowServing.length ? view.nowServing.map((s) => (
            <div key={s.ticket} className="pc-inset" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "22px 26px", borderRadius: 16, animation: fresh.includes(s.ticket) ? "called 1.1s var(--ease-out) 3" : undefined }}>
              <span style={{ font: "400 76px/1 var(--font-sans)", letterSpacing: "-0.02em" }}>{s.ticket}</span>
              <span style={{ textAlign: "right" }}>
                <span style={{ display: "block", font: "400 18px/24px var(--font-sans)", color: "var(--label)" }}>please go to</span>
                <span style={{ font: "500 30px/36px var(--font-sans)" }}>{s.counter}</span>
              </span>
            </div>
          )) : <p style={{ margin: 0, font: "400 22px/30px var(--font-sans)", color: "var(--ink-2)" }}>{view ? "Nobody is being served right now." : "Waiting for the front desk…"}</p>}
        </section>

        <section style={{ ...card, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ margin: 0, font: "500 24px/30px var(--font-sans)" }}>Waiting <span style={{ color: "var(--label)", fontWeight: 400 }}>· {view?.waitingCount ?? 0}</span></h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
            {view?.waiting.map((w) => (
              <div key={w.ticket} className="pc-inset" style={{ display: "grid", gridTemplateColumns: "52px 1fr auto", alignItems: "center", gap: 16, padding: "16px 20px" }}>
                <span style={{ font: "400 18px var(--font-sans)", color: "var(--label)" }}>#{w.position}</span>
                <span style={{ font: "400 36px/1 var(--font-sans)", letterSpacing: "-0.01em" }}>{w.ticket}</span>
                {w.estWaitMin != null && w.estWaitMin < 1
                  ? <span className="pc-pill" style={{ height: 30, padding: "0 12px", font: "500 18px var(--font-sans)", background: "var(--positive-bg)", color: "var(--positive)" }}>Next</span>
                  : <span style={{ font: "400 22px var(--font-sans)", color: "var(--ink-2)" }}>{waitLabel(w.estWaitMin)}</span>}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer style={{ padding: "8px 48px 28px", display: "flex", justifyContent: "space-between", gap: 24, font: "400 18px/24px var(--font-sans)", color: "var(--label)" }}>
        <span>Please listen for your ticket number. Urgent cases may be seen first; everyone is guaranteed to move up.</span>
        <span>Wait times are estimates.</span>
      </footer>
    </div>
  );
}
