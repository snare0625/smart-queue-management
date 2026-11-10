import type { LucideIcon } from "lucide-react";

/** Sidebar nav item: 40px pill; idle ink-2, hover white, active dark. aria-current marks the page for screen readers (and the CSS). */
export function SideNavItem({ icon: I, label, active, onClick, href }: { icon: LucideIcon; label: string; active?: boolean; onClick?: () => void; href?: string }) {
  const inner = <><I size={18} strokeWidth={1.6} aria-hidden />{label}</>;
  return href
    ? <a className="pc-nav" href={href} target="_blank" rel="noreferrer">{inner}</a>
    : <button type="button" className="pc-nav" aria-current={active ? "page" : undefined} onClick={onClick}>{inner}</button>;
}
