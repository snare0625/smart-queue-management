import { Panel } from "@/components/ui/Panel";
import { DonutChart } from "@/components/ui/DonutChart";
import { Delta } from "@/components/ui/Delta";
import type { CSSProperties, ReactNode } from "react";
const Dot = ({ c }: { c: string }) => <span style={{ width: 9, height: 9, borderRadius: 9, background: c, display: "inline-block" }} />;
export function QueuePrediction() {
  const P = "M30,92 C55,82 70,55 85,58 S105,90 115,87 S140,90 150,80 S185,48 200,52 S250,66 270,71 S310,84 335,86";
  const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
  const legend = <div style={{ display: "flex", gap: 16, font: "var(--fw-regular) var(--fs-label) var(--font-sans)", color: "var(--text-secondary)" }}><span style={{ display: "flex", gap: 6, alignItems: "center" }}><Dot c="var(--chart-primary)" />Predicted Wait</span><span style={{ display: "flex", gap: 6, alignItems: "center" }}><Dot c="var(--chart-secondary)" />Current Wait</span></div>;
  return (
    <Panel title="Queue Prediction" action={legend}>
      <svg viewBox="0 0 345 130" style={{ width: "100%", height: 160 }} role="img" aria-label="Predicted wait over the day">
        {[["60 min", 10], ["45 min", 35], ["30 min", 60], ["15 min", 85], ["0 min", 110]].map(([l, y]) => <g key={l}><text x="0" y={Number(y) + 3} fontSize="7" fill="var(--text-muted)">{l}</text><line x1="28" x2="345" y1={y} y2={y} stroke="var(--gray-150)" /></g>)}
        <path d={P + " L335,110 L30,110 Z"} fill="var(--chart-fill)" opacity=".6" />
        <path d={P} fill="none" stroke="var(--chart-primary)" strokeWidth="1.5" />
        <line x1="115" x2="115" y1="10" y2="110" stroke="var(--gray-600)" strokeDasharray="3 2" />
        <text x="106" y="7" fontSize="8" fill="var(--text-primary)">Now</text>
        {hours.map((h, i) => <text key={h} x={30 + i * 43} y="124" fontSize="7" fill="var(--text-muted)">{h}</text>)}
      </svg>
    </Panel>
  );
}
export function ServiceDistribution() {
  const d: [string, number, string][] = [["General Enquiry", 36, "var(--chart-1)"], ["Consultation", 29, "var(--chart-2)"], ["Blood Test", 21, "var(--chart-3)"], ["Follow-up", 14, "var(--chart-4)"]];
  return (
    <Panel title="Service Distribution">
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <DonutChart center="28" caption="Today" data={[{ value: 36, color: "var(--chart-primary)" }, { value: 21, color: "var(--chart-3)" }, { value: 21, color: "var(--chart-5)" }, { value: 22, color: "var(--chart-1)" }]} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {d.map(([l, v, c]) => <div key={l} style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--type-table)" }}><Dot c={c} /><span style={{ flex: 1 }}>{l}</span><b style={{ fontWeight: 500 }}>{v}%</b></div>)}
        </div>
      </div>
    </Panel>
  );
}
export function SimulationResults() {
  const rows: [string, string, string, ReactNode][] = [["Average Wait Time", "34 min", "18 min", <Delta key="a" value="47%" pill />], ["Longest Wait", "112 min", "54 min", <Delta key="b" value="52%" />], ["Customers Served", "28", "28", "–"], ["Staff Utilisation", "62%", "87%", <Delta key="c" value="25%" direction="up" />]];
  const c: CSSProperties = { padding: "7px 10px", borderBottom: "1px solid var(--border-card)", font: "var(--type-table)" };
  return (
    <Panel title="Simulation Results (Today)">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ background: "var(--surface-card-subtle)" }}>{["Algorithm Comparison", "FIFO", "Smart Queue", ""].map((h, i) => <th key={i} style={{ ...c, textAlign: "left", fontWeight: 500 }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r[0]}><td style={c}>{r[0]}</td><td style={c}>{r[1]}</td><td style={{ ...c, color: "var(--green-700)", fontWeight: 600 }}>{r[2]}</td><td style={c}>{r[3]}</td></tr>)}</tbody>
      </table>
    </Panel>
  );
}
