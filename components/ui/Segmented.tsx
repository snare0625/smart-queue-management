/** Segmented control: white pill track; the active option is a dark pill. Each option is a toggle button (aria-pressed). */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="pc-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}{o.count != null && <span style={{ opacity: 0.7, marginLeft: 6 }}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
