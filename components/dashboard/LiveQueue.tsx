"use client";
import { useState } from "react";
import { CheckCircle2, Clock, FastForward, Gauge, Plus, UserRound, Users } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Segmented } from "@/components/ui/Segmented";
import { QueueTable, type RowAction } from "@/components/ui/QueueTable";
import { TicketCard } from "@/components/ui/TicketCard";
import { Callout } from "@/components/ui/Callout";
import { StaffRow } from "@/components/ui/StaffRow";
import { QueuePrediction, ServiceDistribution, SimulationResults } from "./Analytics";
import { FILTERS, toEntry, toStaffRow, type QueueEntry } from "@/lib/data";
import { MIN, SERVICES, bestFreeStaff, explainNext, fmtTime, isOverrunning, nextUp, serviceById, staffStatus, type Priority } from "@/lib/engine";
import { useQueue } from "./QueueProvider";
import { LoadBanner } from "./LoadBanner";

const NAMES = ["Ava N.", "Liam K.", "Mia D.", "Ethan B.", "Zoe P.", "Lucas M.", "Chloe T.", "Owen S."];
const label = { font: "var(--type-label)", color: "var(--label)" } as const;

export function LiveQueue({ go }: { go?: (page: string) => void }) {
  const { ready, now, state, dispatch, plan, learned, fastForward, nextTicket } = useQueue();
  const { staff, history } = state;
  const next = nextUp(plan);
  const nextStaff = staff.find((s) => s.id === next?.staffId);
  const rows = plan.map((a) => toEntry(a, next?.customer.id, staff));
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const count = (f: string) => (f === "All" ? rows.length : rows.filter((r) => r.cat === f).length);
  const shown = filter === "All" ? rows : rows.filter((r) => r.cat === filter);
  const serving = staff.filter((s) => s.serving).sort((a, b) => a.serving!.startedAt - b.serving!.startedAt);
  const onDuty = staff.filter((s) => staffStatus(s, now) !== "break");
  const busy = onDuty.filter((s) => staffStatus(s, now) === "busy").length;
  const utilisation = onDuty.length ? Math.round((busy / onDuty.length) * 100) : 0;
  const completed = history.filter((v) => v.outcome === "completed");
  const avgWait = completed.length ? Math.round(completed.reduce((t, v) => t + v.waitMin, 0) / completed.length) : null;
  const lastDone = completed.at(-1);
  const urgent = state.waiting.filter((c) => c.priority === "urgent").length;
  const appts = state.waiting.filter((c) => c.appointmentAt != null).length;

  const callNext = () => { if (next && next.startAt! <= now) dispatch({ type: "serve", customerId: next.customer.id, staffId: next.staffId!, at: now }); };
  const rowActions = (r: QueueEntry): RowAction[] => {
    const free = bestFreeStaff(state, r.id, now);
    return [
      { label: free ? `Serve now with ${free.name}` : "Serve now — no qualified staff free", disabled: !free, onClick: () => dispatch({ type: "serve", customerId: r.id, staffId: free!.id, at: now }) },
      { label: "Mark no-show", onClick: () => dispatch({ type: "noShow", customerId: r.id, at: now }) },
      { label: "Cancel visit", danger: true, onClick: () => dispatch({ type: "cancel", customerId: r.id, at: now }) },
    ];
  };
  const addCustomer = () => {
    const roll = Math.random();
    const priority: Priority = roll < 0.15 ? "urgent" : roll < 0.3 ? "priority" : "normal";
    const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
    const id = nextTicket();
    dispatch({ type: "join", customer: { id, name: NAMES[Number(id.slice(1)) % NAMES.length], serviceId: service.id, priority, arrivedAt: now } });
  };
  const rush = () => { for (let i = 0; i < 8; i++) addCustomer(); }; // a coach-load arrives: handy for seeing the overload warning
  if (!ready) return <main />;

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "var(--gap)", minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: "var(--gap)" }}>
        <StatCard label="Waiting" value={rows.length} icon={Users} tint="brand" sub={`${urgent} urgent · ${appts} with appointments`} />
        <StatCard label="Average wait today" value={avgWait == null ? "–" : `${avgWait} min`} icon={Clock} tint="blue" sub={`Across ${completed.length} completed visits`} />
        <StatCard label="Served today" value={completed.length} icon={CheckCircle2} tint="green"
          sub={`${history.filter((v) => v.outcome === "no-show").length} no-shows · ${history.filter((v) => v.outcome === "cancelled").length} cancelled`} />
        <StatCard label="Staff on duty" value={<>{onDuty.length}<span style={{ font: "var(--type-body)", color: "var(--label)" }}> of {staff.length}</span></>} icon={UserRound} tint="purple"
          sub={staff.length - onDuty.length ? `${staff.length - onDuty.length} on a break` : "Nobody on a break"} />
        <StatCard label="Staff utilisation" value={`${utilisation}%`} icon={Gauge} tint="amber" sub={`${busy} of ${onDuty.length} on duty are with someone`}>
          <ProgressBar value={utilisation} label="Staff utilisation" />
        </StatCard>
      </div>

      <LoadBanner />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 400px", gap: "var(--gap)", alignItems: "start" }}>
        <Panel title="Queue" meta={`${rows.length} waiting`} action={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={label}>Demo</span>
            <Button size="sm" variant="secondary" icon={FastForward} onClick={() => fastForward(10)}>Skip 10 min</Button>
            <Button size="sm" variant="secondary" icon={Users} onClick={rush}>Rush +8</Button>
            <Button size="sm" icon={Plus} onClick={addCustomer}>Add customer</Button>
          </div>
        }>
          <Segmented label="Filter by category" value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f, label: f, count: count(f) }))} />
          <QueueTable rows={shown} actions={rowActions} />
        </Panel>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          <Panel title="Up next">
            {next ? (
              <TicketCard ticket={next.customer.id} name={next.customer.name} service={`${next.service.name} → ${nextStaff?.name}`}
                trailing={next.startAt! <= now ? <Button size="sm" onClick={callNext}>Call now</Button> : <Badge tone="neutral">In {Math.ceil((next.startAt! - now) / MIN)} min</Badge>} />
            ) : <div className="pc-inset" style={label}>Nobody is waiting.</div>}
            {next && <Callout title="Why this customer?" items={explainNext(plan, staff, now)} />}
          </Panel>

          <Panel title="Now serving" meta={`${serving.length} in progress`}>
            {serving.length === 0 && <div className="pc-inset" style={label}>Nobody is being served right now.</div>}
            {serving.map((s) => {
              const v = s.serving!;
              const over = isOverrunning(s, now);
              return (
                <TicketCard key={s.id} ticket={v.customer.id} name={v.customer.name} service={`${serviceById(v.serviceId).name} · ${s.name}`}
                  meta={`Started ${fmtTime(v.startedAt)} · expected end ${fmtTime(v.expectedEnd)}`}
                  trailing={<>
                    {over && <Badge tone="negative">Over by {Math.floor((now - v.expectedEnd) / MIN)} min</Badge>}
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button size="sm" onClick={() => dispatch({ type: "complete", staffId: s.id, at: now })}>Done</Button>
                      <Button size="sm" variant="secondary" onClick={() => dispatch({ type: "noShow", customerId: v.customer.id, at: now })}>No-show</Button>
                    </div>
                  </>} />
              );
            })}
            {lastDone && (
              <div style={label}>
                Last completed: {lastDone.customer.id} took {Math.round(lastDone.serviceMin!)} min — {serviceById(lastDone.serviceId).name} now estimated at {learned[lastDone.serviceId].estimateMin.toFixed(1)} min
              </div>
            )}
          </Panel>

          <Panel title="Staff" meta={`${onDuty.length} on duty`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {staff.map((s) => <StaffRow key={s.id} {...toStaffRow(s, plan, now)} />)}
            </div>
          </Panel>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,0.75fr) minmax(0,1fr)", gap: "var(--gap)" }}>
        <QueuePrediction />
        <ServiceDistribution />
        <SimulationResults onOpen={() => go?.("Simulation")} />
      </div>
    </main>
  );
}
