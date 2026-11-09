"use client";
import { useEffect, useMemo, useReducer, useState } from "react";
import { BarChart3, Clock, FastForward, Plus, Users } from "lucide-react";
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
import { FILTERS, seedCustomers, seedStaff, toEntry, toStaffRow, type QueueEntry } from "@/lib/data";
import {
  MIN, SERVICES, bestFreeStaff, explainNext, fmtTime, nextUp, planQueue, queueReducer, rankQueue, serviceById, staffStatus,
  type Priority, type QueueAction, type QueueState,
} from "@/lib/engine";

const NAMES = ["Ava N.", "Liam K.", "Mia D.", "Ethan B.", "Zoe P.", "Lucas M.", "Chloe T.", "Owen S."];
const EMPTY: QueueState = { waiting: [], staff: [], history: [] };
// "load" swaps in a whole state (the seed today, Supabase later); every other action goes through the engine's reducer.
const reducer = (s: QueueState, a: QueueAction | { type: "load"; state: QueueState }) => (a.type === "load" ? a.state : queueReducer(s, a));

export function LiveQueue() {
  // Time is state so the queue re-ranks as it passes. `skew` lets you fast-forward to watch scores age.
  const [clock, setClock] = useState<number | null>(null);
  const [skew, setSkew] = useState(0);
  const [state, dispatch] = useReducer(reducer, EMPTY);
  const [ticketNo, setTicketNo] = useState(27);
  useEffect(() => {
    const t0 = Date.now();
    setClock(t0);
    dispatch({ type: "load", state: { waiting: seedCustomers(t0), staff: seedStaff(t0), history: [] } });
    const t = setInterval(() => setClock(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const now = (clock ?? 0) + skew;
  const { waiting, staff, history } = state;

  // Recalculated on every arrival, departure, staff change or clock tick: rank by score, then forecast who serves whom and when.
  const plan = useMemo(() => planQueue(rankQueue(waiting, now), staff, now), [waiting, staff, now]);
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
    dispatch({ type: "join", customer: { id: "A0" + ticketNo, name: NAMES[ticketNo % NAMES.length], serviceId: service.id, priority, arrivedAt: now } });
    setTicketNo((n) => n + 1);
  };
  if (clock === null) return <main />;

  return (
    <main style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 12 }}>
        <StatCard icon={Users} iconFilled value={rows.length} label="Customers Waiting" />
        <StatCard icon={Clock} value={avgWait == null ? "–" : `${avgWait} min`} label="Average Wait Time" />
        <StatCard icon={BarChart3} value={completed.length} label="Customers Served Today" />
        <StatCard icon={Users} iconFilled value={onDuty.length} label="Staff On Duty" />
        <StatCard visual={<ProgressRing value={utilisation} />} value={utilisation + "%"} label="Staff Utilisation" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 428px", gap: 12 }}>
        <Panel title="Queue" size="lg" action={<div style={{ display: "flex", gap: 8 }}><Button variant="secondary" icon={FastForward} onClick={() => setSkew((s) => s + 10 * MIN)}>+10 min</Button><Button icon={Plus} onClick={addCustomer}>Add Customer</Button></div>}>
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
            {lastDone && <div style={{ font: "var(--type-label)", color: "var(--text-on-dark-muted)" }}>Last completed: {lastDone.customer.id} {lastDone.customer.name} — took {Math.round(lastDone.serviceMin!)} min (expected {serviceById(lastDone.serviceId).durationMin})</div>}
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
        <SimulationResults />
      </div>
    </main>
  );
}
