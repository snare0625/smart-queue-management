"use client";
import { useMemo } from "react";
import { UserPlus } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { IconChip } from "@/components/ui/StatCard";
import { LOAD, assessLoad, toDurations, type LoadLevel } from "@/lib/engine";
import { useQueue } from "./QueueProvider";

// Status is always a pill with a word, never colour alone.
const LOOK: Record<LoadLevel, [BadgeTone, string]> = { ok: ["positive", "Healthy"], busy: ["warning", "Busy"], overloaded: ["negative", "Overloaded"] };
const mins = (m: number) => (Number.isFinite(m) ? `${Math.round(m)} min` : "no staff");

/** Live capacity check: who is (or will be) waiting too long, for which service, and what extra person would help most. */
export function LoadBanner() {
  const { state, now, learned } = useQueue();
  const report = useMemo(() => assessLoad(state.waiting, state.staff, now, toDurations(learned)), [state.waiting, state.staff, now, learned]);
  const [tone, word] = LOOK[report.level];

  if (report.level === "ok")
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, font: "var(--type-label)", color: "var(--label)" }}>
        <Badge tone={tone}>{word}</Badge> Everyone is projected to wait under {LOAD.busyWaitMin} min.
      </div>
    );

  const issues = report.services.filter((s) => s.level !== "ok").slice(0, 3);
  return (
    <section role="status" aria-label="Queue load" className="pc-card" style={{ flexDirection: "row", alignItems: "stretch", gap: 20, padding: "16px 20px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, font: "var(--type-body)", color: "var(--ink)" }}>
          <Badge tone={tone}>{word}</Badge>
          Longest projected wait <span style={{ color: "var(--label)" }}>(waited so far + forecast)</span>: <strong>{mins(report.worstWaitMin)}</strong>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4, font: "var(--type-control)", color: "var(--ink-2)" }}>
          {issues.map((s) => (
            <li key={s.serviceId}>
              <strong style={{ color: "var(--ink)" }}>{s.name}</strong> · {s.waiting} waiting, up to {mins(s.worstWaitMin)}{s.noStaff ? " — nobody on duty can do this" : ` — only ${s.qualified.join(" & ")} can do it`}
            </li>
          ))}
        </ul>
      </div>
      {report.suggestion && (
        <div className="pc-inset" style={{ display: "flex", gap: 12, alignItems: "flex-start", maxWidth: 360 }}>
          <IconChip icon={UserPlus} tint="brand" />
          <div style={{ display: "flex", flexDirection: "column", gap: 2, font: "var(--type-control)", color: "var(--ink-2)" }}>
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>Suggestion</span>
            <span>Bring in someone like {report.suggestion.like.name} ({report.suggestion.skills}). Longest projected wait would drop from <strong style={{ color: "var(--ink)" }}>{mins(report.suggestion.beforeMin)}</strong> to <strong style={{ color: "var(--ink)" }}>{mins(report.suggestion.afterMin)}</strong>.</span>
          </div>
        </div>
      )}
    </section>
  );
}
