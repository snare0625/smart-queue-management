"use client";
import { motion } from "motion/react";
import { CountUp, EmptyState, PageSkeleton, pageIn, useToast } from "@/components/ui/motion";
import { useState } from "react";
import { CheckCircle2, Clock, FastForward, Gauge, Plus, UserRound, Users, Inbox } from "lucide-react";
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
  const toast = useToast();
  const staffName = (id: string) => staff.find((s) => s.id === id)?.name ?? "staff";
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

  // Every action confirms itself with a toast, so staff know it happened (and screen readers announce it).
  const serve = (customerId: string, staffId: string) => { dispatch({ type: "serve", customerId, staffId, at: now }); toast(`${customerId} called → ${staffName(staffId)}`, "positive"); };
  const complete = (staffId: string) => {
    const v = staff.find((s) => s.id === staffId)?.serving;
    dispatch({ type: "complete", staffId, at: now });
    if (v) toast(`${v.customer.id} done · took ${Math.max(1, Math.round((now - v.startedAt) / MIN))} min`, "positive");
  };
  const noShow = (customerId: string) => { dispatch({ type: "noShow", customerId, at: now }); toast(`${customerId} marked as a no-show`); };
  const cancel = (customerId: string) => { dispatch({ type: "cancel", customerId, at: now }); toast(`${customerId} cancelled`); };
  const callNext = () => { if (next && next.startAt! <= now) serve(next.customer.id, next.staffId!); };
  const rowActions = (r: QueueEntry): RowAction[] => {
    const free = bestFreeStaff(state, r.id, now);
    return [
      { label: free ? `Serve now with ${free.name}` : "Serve now — no qualified staff free", disabled: !free, onClick: () => serve(r.id, free!.id) },
      { label: "Mark no-show", onClick: () => noShow(r.id) },
      { label: "Cancel visit", danger: true, onClick: () => cancel(r.id) },
    ];
  };
  const addCustomer = (quiet = false) => {
    const roll = Math.random();
    const priority: Priority = roll < 0.15 ? "urgent" : roll < 0.3 ? "priority" : "normal";
    const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
    const id = nextTicket();
    dispatch({ type: "join", customer: { id, name: NAMES[Number(id.slice(1)) % NAMES.length], serviceId: service.id, priority, arrivedAt: now } });
    if (!quiet) toast(`${id} joined · ${service.name}${priority !== "normal" ? ` · ${priority}` : ""}`);
  };
  const rush = () => { for (let i = 0; i < 8; i++) addCustomer(true); toast("8 customers joined at once", "warning"); }; // a coach-load arrives: handy for seeing the overload warning
  if (!ready) return <PageSkeleton />;

  return (
    <motion.main variants={pageIn} initial="hidden" animate="show" style={{ display: "flex", flexDirection: "column", gap: "var(--gap)", minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: "var(--gap)" }}>
        <StatCard label="Waiting" value={<CountUp value={rows.length} />} icon={Users} tint="brand" sub={`${urgent} urgent · ${appts} with appointments`} />
        <StatCard label="Average wait today" value={avgWait == null ? "–" : <CountUp value={avgWait} format={(n) => `${Math.round(n)} min`} />} icon={Clock} tint="blue" sub={`Across ${completed.length} completed visits`} />
        <StatCard label="Served today" value={<CountUp value={completed.length} />} icon={CheckCircle2} tint="green"
          sub={`${history.filter((v) => v.outcome === "no-show").length} no-shows · ${history.filter((v) => v.outcome === "cancelled").length} cancelled`} />
        <StatCard label="Staff on duty" value={<>{onDuty.length}<span style={{ font: "var(--type-body)", color: "var(--label)" }}> of {staff.length}</span></>} icon={UserRound} tint="purple"
          sub={staff.length - onDuty.length ? `${staff.length - onDuty.length} on a break` : "Nobody on a break"} />
        <StatCard label="Staff utilisation" value={<CountUp value={utilisation} format={(n) => `${Math.round(n)}%`} />} icon={Gauge} tint="amber" sub={`${busy} of ${onDuty.length} on duty are with someone`}>
          <ProgressBar value={utilisation} label="Staff utilisation" />
        </StatCard>
      </div>

      <LoadBanner />

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 400px", gap: "var(--gap)", alignItems: "start" }}>
        <Panel title="Queue" meta={`${rows.length} waiting`} action={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={label}>Demo</span>
            <Button size="sm" variant="secondary" icon={FastForward} onClick={() => { fastForward(10); toast("Demo clock moved forward 10 min"); }}>Skip 10 min</Button>
            <Button size="sm" variant="secondary" icon={Users} onClick={rush}>Rush +8</Button>
            <Button size="sm" icon={Plus} onClick={() => addCustomer()}>Add customer</Button>
          </div>
        }>
          <Segmented label="Filter by category" value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f, label: f, count: count(f) }))} />
          {shown.length
            ? <QueueTable rows={shown} actions={rowActions} replayKey={filter} />
            : <EmptyState icon={Inbox} title={filter === "All" ? "Nobody is waiting" : `Nobody waiting for ${filter}`} hint="New arrivals appear here, ranked by priority score."
                action={<Button size="sm" variant="secondary" icon={Plus} onClick={() => addCustomer()}>Add customer</Button>} />}
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
                  trailing={over && <Badge tone="negative">Over by {Math.floor((now - v.expectedEnd) / MIN)} min</Badge>}
                  actions={<>
                    <Button size="sm" variant="secondary" onClick={() => noShow(v.customer.id)}>No-show</Button>
                    <Button size="sm" onClick={() => complete(s.id)}>Done</Button>
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
    </motion.main>
  );
}
