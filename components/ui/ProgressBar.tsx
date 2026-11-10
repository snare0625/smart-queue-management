/** 6px rounded progress bar: track background, brand fill. The value is also given as text by the caller. */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}
      style={{ height: 6, borderRadius: 999, background: "var(--track)", overflow: "hidden" }}>
      <div style={{ width: `${v}%`, height: "100%", borderRadius: 999, background: "var(--brand)", transition: "width var(--dur-card) var(--ease-out)" }} />
    </div>
  );
}
