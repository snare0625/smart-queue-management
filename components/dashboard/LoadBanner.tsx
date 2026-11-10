"use client";
import { useMemo } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, UserPlus } from "lucide-react";
import { LOAD, assessLoad, toDurations, type LoadLevel } from "@/lib/engine";
import { useQueue } from "./QueueProvider";

// Status colours always come with an icon and a word, never colour alone.
const LOOK: Record<LoadLevel, { bg: string; fg: string; Icon: typeof AlertCircle; word: string }> = {
  ok: { bg: "var(--green-100)", fg: "var(--green-700)", Icon: CheckCircle2, word: "Healthy" },
  busy: { bg: "var(--orange-100)", fg: "var(--orange-700)", Icon: AlertCircle, word: "Busy" },
  overloaded: { bg: "var(--red-100)", fg: "var(--red-600)", Icon: AlertTriangle, word: "Overloaded" },
};
const mins = (m: number) => (Number.isFinite(m) ? `${Math.round(m)} min` : "no staff");

/** Live capacity check: who is (or will be) waiting too long, for which service, and what extra person would help most. */
export function LoadBanner() {
  const { state, now, learned } = useQueue();
  const report = useMemo(() => assessLoad(state.waiting, state.staff, now, toDurations(learned)), [state.waiting, state.staff, now, learned]);
  const { bg, fg, Icon, word } = LOOK[report.level];

  if (report.level === "ok")
    return <div style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--type-label)", color: "var(--text-on-dark-muted)" }}><Icon size={14} color="var(--green-500)" /> Queue {word.toLowerCase()} — everyone is projected to wait under {LOAD.busyWaitMin} min.</div>;

  const issues = report.services.filter((s) => s.level !== "ok").slice(0, 3);
  return (
    <div role="status" style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 16px", borderRadius: "var(--radius-md)", background: bg, color: "var(--text-primary)" }}>
      <Icon size={20} color={fg} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, font: "var(--type-table)" }}>
        <div><b style={{ color: fg }}>{word}.</b> Longest projected wait (waited so far + forecast): <b>{mins(report.worstWaitMin)}</b>.</div>
        {issues.map((s) => (
          <div key={s.serviceId}>
            <b>{s.name}</b>: {s.waiting} waiting, up to {mins(s.worstWaitMin)}{s.noStaff ? " — nobody on duty can do this" : ` — only ${s.qualified.join(" & ")} can do it`}.
          </div>
        ))}
      </div>
      {report.suggestion && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", maxWidth: 340, padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "var(--surface-card)", font: "var(--type-label)" }}>
          <UserPlus size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
          <span><b>Suggestion:</b> bring in someone like {report.suggestion.like.name} ({report.suggestion.skills}). Longest projected wait would drop from <b>{mins(report.suggestion.beforeMin)}</b> to <b>{mins(report.suggestion.afterMin)}</b>.</span>
        </div>
      )}
    </div>
  );
}
