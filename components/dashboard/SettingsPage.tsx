"use client";
import { motion } from "motion/react";
import { pageIn, useToast } from "@/components/ui/motion";
import { useState, type ReactNode } from "react";
import { Database, LogOut, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IconChip, type Tint } from "@/components/ui/StatCard";
import { getSupabase } from "@/lib/db/client";
import { useQueue } from "./QueueProvider";

/** One setting as an inset row: icon chip, title + explanation, and the control on the right. */
function Row({ icon, tint, title, hint, children }: { icon: LucideIcon; tint: Tint; title: ReactNode; hint: ReactNode; children?: ReactNode }) {
  return (
    <div className="pc-inset" style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <IconChip icon={icon} tint={tint} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--type-body)", fontWeight: 500, color: "var(--ink)" }}>{title}</div>
        <div style={{ font: "var(--type-control)", color: "var(--ink-2)" }}>{hint}</div>
      </div>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const { mode, session, resetDemo, setOfflineDemo } = useQueue();
  const [resetting, setResetting] = useState(false);
  const toast = useToast();
  const configured = !!getSupabase();

  return (
    <motion.main variants={pageIn} initial="hidden" animate="show" style={{ maxWidth: 820 }}>
      <Panel title="Workspace">
        <Row icon={Database} tint="blue" title={<>Data source {mode === "supabase" ? <Badge tone="positive">Supabase</Badge> : <Badge tone="neutral">Offline demo</Badge>}</>}
          hint={mode === "supabase" ? "Shared by every desk and the public waiting-room screen." : configured ? "Lives only in this browser tab; nothing is saved." : "Add Supabase keys to .env.local to share data between desks."}>
          {configured && <Button variant="secondary" size="sm" onClick={() => setOfflineDemo(mode === "supabase")}>{mode === "supabase" ? "Use offline demo" : "Use Supabase"}</Button>}
        </Row>
        {session && (
          <Row icon={LogOut} tint="purple" title="Signed in" hint={session.user.email}>
            <Button variant="secondary" size="sm" onClick={() => getSupabase()!.auth.signOut()}>Sign out</Button>
          </Row>
        )}
        <Row icon={RotateCcw} tint="brand" title="Reset the demo day" hint={`Replace all queue data with a fresh seeded morning${mode === "supabase" ? " — in the database, for every desk" : ""}.`}>
          <Button size="sm" disabled={resetting} onClick={async () => { setResetting(true); await resetDemo(); setResetting(false); toast("Demo day reset", "positive"); }}>{resetting ? "Resetting…" : "Reset"}</Button>
        </Row>
      </Panel>
    </motion.main>
  );
}
