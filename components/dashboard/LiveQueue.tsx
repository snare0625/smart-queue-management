"use client";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Clock, FastForward, Plus, Users } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Delta } from "@/components/ui/Delta";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { FilterTab } from "@/components/ui/FilterTab";
import { QueueTable } from "@/components/ui/QueueTable";
import { TicketCard } from "@/components/ui/TicketCard";
import { Callout } from "@/components/ui/Callout";
import { StaffRow } from "@/components/ui/StaffRow";
import { QueuePrediction, ServiceDistribution, SimulationResults } from "./Analytics";
import { FILTERS, seedCustomers, seedStaff, toEntry, toStaffRow } from "@/lib/data";
import { MIN, SERVICES, explainNext, fmtTime, nextUp, planQueue, rankQueue, serviceById, staffStatus, type Customer, type Priority, type Staff } from "@/lib/engine";

const NAMES = ["Ava N.", "Liam K.", "Mia D.", "Ethan B.", "Zoe P.", "Lucas M.", "Chloe T.", "Owen S."];

export function LiveQueue() {
  // Time is state so the queue re-ranks as it passes. `skew` lets you fast-forward to watch scores age.
  const [clock, setClock] = useState<number | null>(null);
  const [skew, setSkew] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [ticketNo, setTicketNo] = useState(27);
  useEffect(() => {
    const t0 = Date.now();
    setClock(t0);
    setCustomers(seedCustomers(t0));
    setStaff(seedStaff(t0));
    const t = setInterval(() => setClock(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const now = (clock ?? 0) + skew;

  // Recalculated on every arrival, departure, staff change or clock tick: rank by score, then forecast who serves whom and when.
  const plan = useMemo(() => planQueue(rankQueue(customers, now), staff, now), [customers, staff, now]);
  const next = nextUp(plan);
  const nextStaff = staff.find((s) => s.id === next?.staffId);
  const rows = plan.map((a) => toEntry(a, next?.customer.id, staff));
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const count = (f: string) => (f === "All" ? rows.length : rows.filter((r) => r.cat === f).length);
  const shown = filter === "All" ? rows : rows.filter((r) => r.cat === filter);
  const nowServing = staff.filter((s) => staffStatus(s, now) === "busy").sort((a, b) => b.serving!.startedAt - a.serving!.startedAt)[0];
  const onDuty = staff.filter((s) => staffStatus(s, now) !== "break");
  const busy = onDuty.filter((s) => staffStatus(s, now) === "busy").length;
  const utilisation = onDuty.length ? Math.round((busy / onDuty.length) * 100) : 0;

  // Hand the next customer to their assigned staff member — only possible once that person is actually free.
  const callNext = () => {
    if (!next || next.startAt! > now) return;
    const serving = { customer: next.customer, serviceId: next.customer.serviceId, startedAt: now, expectedEnd: now + next.service.durationMin * MIN };
    setStaff((ss) => ss.map((s) => (s.id === next.staffId ? { ...s, serving } : s)));
    setCustomers((cs) => cs.filter((c) => c.id !== next.customer.id));
  };
  const addCustomer = () => {
    const roll = Math.random();
    const priority: Priority = roll < 0.15 ? "urgent" : roll < 0.3 ? "priority" : "normal";
    const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
    setCustomers((cs) => [...cs, { id: "A0" + ticketNo, name: NAMES[ticketNo % NAMES.length], serviceId: service.id, priority, arrivedAt: now }]);
    setTicketNo((n) => n + 1);
  };
  if (clock === null) return <main />;

  return (
    <main style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 12 }}>
        <StatCard icon={Users} iconFilled value={rows.length} label="Customers Waiting" />
        <StatCard icon={Clock} value="18 min" label="Average Wait Time" meta={<Delta value="32%">vs last week</Delta>} />
        <StatCard icon={BarChart3} value="28" label="Customers Served Today" />
        <StatCard icon={Users} iconFilled value={onDuty.length} label="Staff On Duty" />
        <StatCard visual={<ProgressRing value={utilisation} />} value={utilisation + "%"} label="Staff Utilisation" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 428px", gap: 12 }}>
        <Panel title="Queue" size="lg" action={<div style={{ display: "flex", gap: 8 }}><Button variant="secondary" icon={FastForward} onClick={() => setSkew((s) => s + 10 * 60_000)}>+10 min</Button><Button icon={Plus} onClick={addCustomer}>Add Customer</Button></div>}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {FILTERS.map((f) => <FilterTab key={f} label={f} count={count(f)} active={filter === f} onClick={() => setFilter(f)} />)}
          </div>
          <QueueTable rows={shown} />
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Panel tone="dark" title="Now Serving">
            {nowServing?.serving
              ? <TicketCard ticket={nowServing.serving.customer.id} room={nowServing.name} name={nowServing.serving.customer.name} service={serviceById(nowServing.serving.serviceId).name} meta={`Started ${fmtTime(nowServing.serving.startedAt)} · ends ~${fmtTime(nowServing.serving.expectedEnd)}`} />
              : <div style={{ font: "var(--type-table)", color: "var(--text-on-dark-muted)" }}>Nobody is being served right now.</div>}
            <h3 style={{ margin: 0, font: "var(--type-panel-title)" }}>Up Next</h3>
            {next && <TicketCard tone="next" ticket={next.customer.id} name={next.customer.name} service={`${next.service.name} → ${nextStaff?.name}`} trailing={next.startAt! <= now ? "Call now" : `In ${Math.ceil((next.startAt! - now) / MIN)} min`} onClick={callNext} />}
            <Callout title="Why this customer?" items={explainNext(plan, staff, now)} />
          </Panel>
          <Panel title="Staff Status" actionLabel="View All">
            <div>{staff.map((s) => <StaffRow key={s.id} {...toStaffRow(s, plan, now)} />)}</div>
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
