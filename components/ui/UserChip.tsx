import { Avatar } from "./Avatar";
export function UserChip({ initials, name, role, src }: { initials?: string; name: string; role?: string; src?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-on-dark)" }}>
      <Avatar initials={initials} src={src} size={40} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ font: "var(--fw-medium) var(--fs-body) var(--font-sans)", whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ font: "var(--fw-regular) var(--fs-label) var(--font-sans)", color: "var(--text-on-dark-muted)" }}>{role}</div>
      </div>
    </div>
  );
}
