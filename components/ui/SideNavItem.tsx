"use client";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { spring } from "./motion";

/** Sidebar nav item: 40px pill; idle ink-2, hover white, active dark. aria-current marks the page for screen readers (and the CSS). */
export function SideNavItem({ icon: I, label, active, onClick, href }: { icon: LucideIcon; label: string; active?: boolean; onClick?: () => void; href?: string }) {
  // The dark pill is a shared-layout element: when another item becomes active, motion slides it there.
  const inner = <>{active && <motion.span layoutId="nav-pill" className="pc-sel" transition={spring} />}<I size={18} strokeWidth={1.6} aria-hidden />{label}</>;
  return href
    ? <a className="pc-nav" href={href} target="_blank" rel="noreferrer">{inner}</a>
    : <button type="button" className="pc-nav" aria-current={active ? "page" : undefined} onClick={onClick}>{inner}</button>;
}
