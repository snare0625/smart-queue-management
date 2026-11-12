"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { AlertTriangle, Check, Info, type LucideIcon } from "lucide-react";

// ─── Tokens (docs/design-system/MOTION.md) ─────────────────────────────────────────────────────────────
export const ease = [0.22, 1, 0.36, 1] as const; // "out-expo": fast start, gentle landing
export const spring = { type: "spring", stiffness: 420, damping: 32 } as const;
export const dur = { row: 0.36, card: 0.56, bar: 0.9, count: 0.95, wipe: 1.3 };

/** A page: its cards rise in one after another (55 ms apart). Children opt in with `variants={cardIn}`. */
export const pageIn: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.055, delayChildren: 0.03 } } };
export const cardIn: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: dur.card, ease } } };
/** Table rows rise 6 px, 22 ms apart, capped at 18 rows so long tables don't take ages. `custom` = row index. */
export const rowIn: Variants = { hidden: { opacity: 0, y: 6 }, show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: dur.row, ease, delay: Math.min(i, 18) * 0.022 } }) };

// ─── Count-up number ───────────────────────────────────────────────────────────────────────────────────
/**
 * Counts up from 0 on first show, then glides between values when the number changes. A plain requestAnimationFrame loop
 * (easeOutQuart ≈ the system's out-expo curve) — no need to pull the whole animation engine in for one number.
 */
export function CountUp({ value, format = (n) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const current = useRef(shown);
  useEffect(() => {
    if (reduce) { current.current = value; setShown(value); return; }
    const from = current.current, start = performance.now(), ms = dur.count * 1000;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - start) / ms));
      current.current = from + (value - from) * (1 - Math.pow(1 - k, 4));
      setShown(current.current);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  return <span>{format(shown)}</span>;
}

// ─── Toasts ────────────────────────────────────────────────────────────────────────────────────────────
type Tone = "positive" | "warning" | "negative" | "neutral";
interface Toast { id: number; text: string; tone: Tone }
const CHIP: Record<Tone, [bg: string, fg: string, Icon: LucideIcon]> = {
  positive: ["#24C462", "#0B3B1F", Check], warning: ["#F29E08", "#3A2400", AlertTriangle], negative: ["#FBE3E1", "#C2362F", AlertTriangle], neutral: ["#4A4A4F", "#fff", Info],
};
const ToastCtx = createContext<(text: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/** Dark pill toasts, bottom-centre, max 3 at once, gone after 5 s. aria-live so screen readers announce them. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Tone = "neutral") => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 5000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "none" }}>
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const [bg, fg, I] = CHIP[t.tone];
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }} transition={spring}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px 8px 10px", borderRadius: 999, background: "var(--dark)", color: "#fff", font: "var(--type-body)", boxShadow: "var(--shadow-toast)", whiteSpace: "nowrap" }}>
                <span aria-hidden style={{ width: 22, height: 22, borderRadius: 999, background: bg, color: fg, display: "grid", placeItems: "center" }}><I size={12} strokeWidth={2.4} /></span>
                {t.text}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

// ─── Loading & empty states ────────────────────────────────────────────────────────────────────────────
export const Skeleton = ({ w = "100%", h = 10 }: { w?: number | string; h?: number }) => <span className="pc-skeleton" style={{ display: "block", width: w, height: h }} />;

/** Shown only while data is genuinely loading (e.g. the first Supabase fetch) — never as an artificial delay. */
export function PageSkeleton() {
  const card = (k: number, children: ReactNode) => <div key={k} className="pc-card" aria-hidden>{children}</div>;
  return (
    <main aria-busy="true" aria-label="Loading" style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: "var(--gap)" }}>
        {[0, 1, 2, 3, 4].map((k) => card(k, <><Skeleton w="50%" /><Skeleton w="40%" h={24} /><Skeleton w="70%" /></>))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 400px", gap: "var(--gap)" }}>
        {card(5, [60, 45, 70, 52, 64, 48].map((w, i) => <div key={i} style={{ display: "flex", gap: 12 }}><Skeleton w={70} /><Skeleton w={`${w}%`} /></div>))}
        {card(6, <><Skeleton w="40%" /><Skeleton h={56} /><Skeleton h={56} /></>)}
      </div>
    </main>
  );
}

/** Empty state: tinted chip, one-line title, one-line hint, optional action. */
export function EmptyState({ icon: I, title, hint, action }: { icon: LucideIcon; title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="pc-inset" style={{ padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
      <span aria-hidden style={{ width: 36, height: 36, borderRadius: 999, background: "var(--track)", color: "var(--ink-2)", display: "grid", placeItems: "center" }}><I size={16} strokeWidth={1.8} /></span>
      <span style={{ font: "var(--type-body)", fontWeight: 500, color: "var(--ink)" }}>{title}</span>
      <span style={{ font: "var(--type-control)", color: "var(--label)" }}>{hint}</span>
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}
