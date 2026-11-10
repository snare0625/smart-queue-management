"use client";
import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { getSupabase } from "@/lib/db/client";
import { useQueue } from "./QueueProvider";

const row = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 0", borderBottom: "1px solid var(--border-card)", font: "var(--type-table)" } as const;
const muted = { color: "var(--text-secondary)" };

export function SettingsPage() {
  const { mode, session, resetDemo, setOfflineDemo } = useQueue();
  const [resetting, setResetting] = useState(false);
  const configured = !!getSupabase();

  return (
    <main style={{ padding: 16, maxWidth: 760 }}>
      <Panel title="Settings" size="lg">
        <div style={row}>
          <div><strong>Data source</strong><div style={muted}>{mode === "supabase" ? "Supabase — shared by every desk and the public screen" : configured ? "Offline demo (this tab only)" : "Offline demo — add Supabase keys to .env.local to go live"}</div></div>
          {configured && <Button variant="secondary" size="sm" onClick={() => setOfflineDemo(mode === "supabase")}>{mode === "supabase" ? "Switch to offline demo" : "Switch to Supabase"}</Button>}
        </div>
        {session && (
          <div style={row}>
            <div><strong>Signed in</strong><div style={muted}>{session.user.email}</div></div>
            <Button variant="secondary" size="sm" onClick={() => getSupabase()!.auth.signOut()}>Sign out</Button>
          </div>
        )}
        <div style={{ ...row, borderBottom: "none" }}>
          <div><strong>Reset demo day</strong><div style={muted}>Replace all queue data with a fresh seeded morning{mode === "supabase" ? " (in the database, for every desk)" : ""}.</div></div>
          <Button size="sm" disabled={resetting} onClick={async () => { setResetting(true); await resetDemo(); setResetting(false); }}>{resetting ? "Resetting…" : "Reset"}</Button>
        </div>
      </Panel>
    </main>
  );
}
