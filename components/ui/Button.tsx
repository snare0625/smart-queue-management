import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Paper Calm buttons: primary = dark pill, secondary = white pill with hairline, ghost = underlined text action. */
export function Button({ variant = "primary", size = "md", type = "button", icon: I, children, disabled, onClick, style }: {
  variant?: "primary" | "secondary" | "ghost" | "dark"; size?: "sm" | "md"; type?: "button" | "submit";
  icon?: LucideIcon; children?: ReactNode; disabled?: boolean; onClick?: () => void; style?: CSSProperties;
}) {
  const cls = ["pc-btn", variant === "secondary" && "pc-btn--secondary", variant === "ghost" && "pc-btn--ghost", size === "sm" && "pc-btn--sm"].filter(Boolean).join(" ");
  return (
    <button type={type} className={cls} disabled={disabled} onClick={onClick} style={style}>
      {I && <I size={size === "sm" ? 15 : 16} strokeWidth={1.8} aria-hidden />}
      {children}
    </button>
  );
}
