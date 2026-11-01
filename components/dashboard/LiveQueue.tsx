"use client";
import { useState } from "react";
import { BarChart3, Clock, Plus, Users } from "lucide-react";
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
import { FILTERS, SEED_QUEUE, STAFF, type QueueEntry } from "@/lib/data";

export function LiveQueue() {
  const [rows, setRows] = useState<QueueEntry[]>(SEED_QUEUE);
  const [serving, setServing] = useState({ ticket: "A014", name: "Emma R.", service: "Urgent Consultation", meta: "Started 10:24" });
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const count = (f: string) => (f === "All" ? rows.length : rows.filter((r) => r.cat === f).length);
  const shown = filter === "All" ? rows : rows.filter((r) => r.cat === filter);
  const next = rows[0];
  const callNext = () => {
    if (!next) return;
    const t = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setServing({ ticket: next.id, name: next.name, service: next.service, meta: "Started " + t });
    setRows((r) => r.slice(1).map((x, i) => (i === 0 ? { ...x, status: "next" } : x)));
  };
  const addCustomer = () => setRows((r) => [...r, { id: "A0" + (40 + r.length), name: `Walk-in ${r.length + 1}`, service: "General Enquiry", priority: "normal", arrived: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), waiting: "<1 min", est: "20 min", status: r.length ? "waiting" : "next", stripe: "none", cat: "General" }]);

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
        <Panel title="Queue" size="lg" action={<Button icon={Plus} onClick={addCustomer}>Add Customer</Button>}>
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
            <Callout title="Why this customer?" items={["Urgent priority", "Longest waiting high-priority customer", "Suitable staff member available (Dr. Patel)", "Estimated service time: 15 minutes"]} />
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
