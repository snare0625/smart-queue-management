import { ChevronRight, DoorOpen } from "lucide-react";
const TONE = { serving: ["var(--green-950)", "var(--green-600)"], next: ["var(--navy-800)", "var(--purple-500)"] } as const;
export function TicketCard({ tone = "serving", ticket, room, name, service, meta, trailing, onClick }: { tone?: "serving" | "next"; ticket: string; room?: string; name: string; service: string; meta?: string; trailing?: string; onClick?: () => void }) {
  const [bg, edge] = TONE[tone];
  const big = tone === "serving";
  return (
    <div onClick={onClick} role={onClick ? "button" : undefined} style={{ display: "flex", alignItems: "center", gap: 20, padding: big ? "16px 18px 16px 28px" : "12px 18px 12px 24px", minHeight: big ? 98 : 68, borderRadius: "var(--radius-md)", background: bg, border: "1px solid var(--border-dark)", borderLeft: "4px solid " + edge, color: "var(--text-on-dark)", cursor: onClick ? "pointer" : "default" }}>
      <div style={{ font: big ? "var(--type-ticket)" : "var(--fw-semibold) 32px/1.1 var(--font-sans)", minWidth: big ? 110 : 96 }}>{ticket}</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, paddingLeft: big ? 16 : 0, borderLeft: big ? "1px solid var(--border-dark)" : "none", minWidth: 0 }}>
        {room && <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--green-500)", font: "var(--type-label)" }}><DoorOpen size={14} />{room}</div>}
        <div style={{ font: "var(--fw-medium) 15px var(--font-sans)" }}>{name}</div>
        <div style={{ font: "var(--type-table)", color: "var(--text-on-dark-muted)" }}>{service}</div>
        {meta && <div style={{ font: "var(--type-label)", color: "var(--green-500)" }}>{meta}</div>}
      </div>
      {trailing && <div style={{ font: "var(--type-table)", color: "var(--text-on-dark-muted)", whiteSpace: "nowrap" }}>{trailing}</div>}
      <ChevronRight size={18} />
    </div>
  );
}
