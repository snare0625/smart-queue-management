"use client";
import { useState } from "react";
import { BarChart3, Clock, FastForward, Monitor, Plus, Users } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { FilterTab } from "@/components/ui/FilterTab";
import { QueueTable, type RowAction } from "@/components/ui/QueueTable";
import { TicketCard } from "@/components/ui/TicketCard";
import { Callout } from "@/components/ui/Callout";
import { StaffRow } from "@/components/ui/StaffRow";
import { QueuePrediction, ServiceDistribution, SimulationResults } from "./Analytics";
import { FILTERS, toEntry, toStaffRow, type QueueEntry } from "@/lib/data";
import { MIN, SERVICES, bestFreeStaff, explainNext, fmtTime, nextUp, serviceById, staffStatus, type Priority } from "@/lib/engine";
import { useQueue } from "./QueueProvider";
import { LoadBanner } from "./LoadBanner";

const NAMES = ["Ava N.", "Liam K.", "Mia D.", "Ethan B.", "Zoe P.", "Lucas M.", "Chloe T.", "Owen S."];

export function LiveQueue({ go }: { go?: (page: string) => void }) {
  const { ready, now, state, dispatch, plan, learned, fastForward, nextTicket } = useQueue();
  const { staff, history } = state;
  const next = nextUp(plan);
  const nextStaff = staff.find((s) => s.id === next?.staffId);
  const rows = plan.map((a) => toEntry(a, next?.customer.id, staff));
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const count = (f: string) => (f === "All" ? rows.length : rows.filter((r) => r.cat === f).length);
  const shown = filter === "All" ? rows : rows.filter((r) => r.cat === filter);
  const nowServing = staff.filter((s) => s.serving).sort((a, b) => b.serving!.startedAt - a.serving!.startedAt)[0];
  const onDuty = staff.filter((s) => staffStatus(s, now) !== "break");
  const busy = onDuty.filter((s) => staffStatus(s, now) === "busy").length;
  const utilisation = onDuty.length ? Math.round((busy / onDuty.length) * 100) : 0;
  const completed = history.filter((v) => v.outcome === "completed");
  const avgWait = completed.length ? Math.round(completed.reduce((t, v) => t + v.waitMin, 0) / completed.length) : null;
  const lastDone = completed.at(-1);

  const callNext = () => { if (next && next.startAt! <= now) dispatch({ type: "serve", customerId: next.customer.id, staffId: next.staffId!, at: now }); };
  const rowActions = (r: QueueEntry): RowAction[] => {
    const free = bestFreeStaff(state, r.id, now);
    return [
      { label: free ? `Serve now with ${free.name}` : "Serve now — no qualified staff free", disabled: !free, onClick: () => dispatch({ type: "serve", customerId: r.id, staffId: free!.id, at: now }) },
      { label: "Mark No Show", onClick: () => dispatch({ type: "noShow", customerId: r.id, at: now }) },
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
    <main style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 12 }}>
        <StatCard icon={Users} iconFilled value={rows.length} label="Customers Waiting" />
        <StatCard icon={Clock} value={avgWait == null ? "–" : `${avgWait} min`} label="Average Wait Time" />
        <StatCard icon={BarChart3} value={completed.length} label="Customers Served Today" />
        <StatCard icon={Users} iconFilled value={onDuty.length} label="Staff On Duty" />
        <StatCard visual={<ProgressRing value={utilisation} />} value={utilisation + "%"} label="Staff Utilisation" />
      </div>
      <LoadBanner />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 428px", gap: 12 }}>
        <Panel title="Queue" size="lg" action={<div style={{ display: "flex", gap: 8 }}><Button variant="secondary" icon={Monitor} onClick={() => window.open("/display", "queuepro-display")}>Open display</Button><Button variant="secondary" icon={FastForward} onClick={() => fastForward(10)}>+10 min</Button><Button variant="secondary" icon={Users} onClick={rush}>Rush +8</Button><Button icon={Plus} onClick={addCustomer}>Add Customer</Button></div>}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {FILTERS.map((f) => <FilterTab key={f} label={f} count={count(f)} active={filter === f} onClick={() => setFilter(f)} />)}
          </div>
          <QueueTable rows={shown} actions={rowActions} />
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Panel tone="dark" title="Now Serving">
            {nowServing?.serving
              ? <TicketCard ticket={nowServing.serving.customer.id} room={nowServing.name} name={nowServing.serving.customer.name} service={serviceById(nowServing.serving.serviceId).name} meta={`Started ${fmtTime(nowServing.serving.startedAt)} · ends ~${fmtTime(nowServing.serving.expectedEnd)}`} />
              : <div style={{ font: "var(--type-table)", color: "var(--text-on-dark-muted)" }}>Nobody is being served right now.</div>}
            {lastDone && <div style={{ font: "var(--type-label)", color: "var(--text-on-dark-muted)" }}>Last completed: {lastDone.customer.id} {lastDone.customer.name} — took {Math.round(lastDone.serviceMin!)} min · {serviceById(lastDone.serviceId).name} estimate now {learned[lastDone.serviceId].estimateMin.toFixed(1)} min</div>}
            <h3 style={{ margin: 0, font: "var(--type-panel-title)" }}>Up Next</h3>
            {next && <TicketCard tone="next" ticket={next.customer.id} name={next.customer.name} service={`${next.service.name} → ${nextStaff?.name}`} trailing={next.startAt! <= now ? "Call now" : `In ${Math.ceil((next.startAt! - now) / MIN)} min`} onClick={callNext} />}
            <Callout title="Why this customer?" items={explainNext(plan, staff, now)} />
          </Panel>
          <Panel title="Staff Status" actionLabel="View All">
            <div>{staff.map((s) => (
              <StaffRow key={s.id} {...toStaffRow(s, plan, now)} actions={s.serving && (
                <div style={{ display: "flex", gap: 4 }}>
                  <Button size="sm" onClick={() => dispatch({ type: "complete", staffId: s.id, at: now })} style={{ height: 24, padding: "0 8px" }}>Done</Button>
                  <Button size="sm" variant="secondary" onClick={() => dispatch({ type: "noShow", customerId: s.serving!.customer.id, at: now })} style={{ height: 24, padding: "0 8px" }}>No show</Button>
                </div>
              )} />
            ))}</div>
          </Panel>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,0.75fr) minmax(0,1fr)", gap: 12 }}>
        <QueuePrediction />
        <ServiceDistribution />
        <SimulationResults onOpen={() => go?.("Simulation")} />
      </div>
    </main>
  );
}
