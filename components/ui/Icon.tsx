import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
export function Icon({ icon: I, size = 18, color = "currentColor", strokeWidth = 2, fill = "none", style }: { icon: LucideIcon; size?: number; color?: string; strokeWidth?: number; fill?: string; style?: CSSProperties }) {
  return <I size={size} color={color} strokeWidth={strokeWidth} fill={fill} style={{ flexShrink: 0, display: "block", ...style }} aria-hidden />;
}
