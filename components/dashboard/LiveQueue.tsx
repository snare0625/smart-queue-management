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
import { FILTERS, STAFF, seedCustomers, toEntry } from "@/lib/data";
import { SERVICES, explainNext, fmtTime, rankQueue, type Customer, type Priority } from "@/lib/engine";

const NAMES = ["Ava N.", "Liam K.", "Mia D.", "Ethan B.", "Zoe P.", "Lucas M.", "Chloe T.", "Owen S."];

export function LiveQueue() {
  // Time is state so the queue re-ranks as it passes. `skew` lets you fast-forward to watch scores age.
  const [clock, setClock] = useState<number | null>(null);
  const [skew, setSkew] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ticketNo, setTicketNo] = useState(27);
  useEffect(() => {
    const t0 = Date.now();
    setClock(t0);
    setCustomers(seedCustomers(t0));
    const t = setInterval(() => setClock(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const now = (clock ?? 0) + skew;

  const ranked = useMemo(() => rankQueue(customers, now, STAFF.length), [customers, now]);
  const rows = ranked.map(toEntry);
  const [serving, setServing] = useState({ ticket: "A014", name: "Emma R.", service: "Urgent Consultation", meta: "Started 10:24" });
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const count = (f: string) => (f === "All" ? rows.length : rows.filter((r) => r.cat === f).length);
  const shown = filter === "All" ? rows : rows.filter((r) => r.cat === filter);
  const next = rows[0];
  const callNext = () => {
    if (!next) return;
    setServing({ ticket: next.id, name: next.name, service: next.service, meta: "Started " + fmtTime(now) });
    setCustomers((cs) => cs.filter((c) => c.id !== next.id));
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
        <StatCard icon={Users} iconFilled value="4" label="Staff On Duty" />
        <StatCard visual={<ProgressRing value={87} />} value="87%" label="Staff Utilisation" />
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
            <TicketCard ticket={serving.ticket} room="Room 2" name={serving.name} service={serving.service} meta={serving.meta} />
            <h3 style={{ margin: 0, font: "var(--type-panel-title)" }}>Up Next</h3>
            {next && <TicketCard tone="next" ticket={next.id} name={next.name} service={next.service} trailing={"Est. " + next.est} onClick={callNext} />}
            <Callout title="Why this customer?" items={explainNext(ranked)} />
          </Panel>
          <Panel title="Staff Status" actionLabel="View All">
            <div>{STAFF.map((s, i) => <StaffRow key={s.name} {...s} note={i === 0 ? serving.ticket + " (15 min)" : s.note} />)}</div>
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
