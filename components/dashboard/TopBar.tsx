"use client";
import { Badge } from "@/components/ui/Badge";
import { fmtTime } from "@/lib/engine";
import { useQueue } from "./QueueProvider";

/** Page header on the canvas (no card): title + meta on the left, connection state on the right. */
export function TopBar({ page }: { page: string; setPage?: (p: string) => void }) {
  const { ready, now, mode } = useQueue();
  const date = ready ? new Date(now).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).replace(",", "") : "";
  return (
    <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h1 style={{ margin: 0, font: "var(--type-page-title)", letterSpacing: "var(--tracking-tight)", color: "var(--ink)" }}>{page}</h1>
        <span style={{ font: "var(--type-label)", color: "var(--label)" }}>Riverside Clinic{ready ? ` · ${date} · ${fmtTime(now)}` : ""}</span>
      </div>
      {mode === "supabase"
        ? <Badge tone="positive"><span aria-hidden style={{ width: 6, height: 6, borderRadius: 9, background: "currentColor" }} />Live · synced</Badge>
        : mode === "local" && <Badge tone="neutral">Offline demo</Badge>}
    </header>
  );
}
