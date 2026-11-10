import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

export function IconButton({ icon: I, label, size = 32, onClick, style }: { icon: LucideIcon; label: string; tone?: "light" | "dark"; size?: number; onClick?: () => void; style?: CSSProperties }) {
  return (
    <button type="button" aria-label={label} title={label} className="pc-icon-btn" onClick={onClick} style={{ width: size, height: size, ...style }}>
      <I size={Math.round(size * 0.55)} strokeWidth={1.8} aria-hidden />
    </button>
  );
}
