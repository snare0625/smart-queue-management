"use client";
import { useState, type CSSProperties, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { getSupabase } from "@/lib/db/client";

const input: CSSProperties = { height: 44, padding: "0 18px", border: 0, borderRadius: 999, background: "var(--raised)", boxShadow: "var(--hairline)", font: "var(--type-body)", color: "var(--ink)" };
const field: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, font: "var(--type-label)", color: "var(--label)" };
const POINTS = [
  ["Fair by design", "Urgent cases go first, but nobody can be pushed back for ever."],
  ["Explains itself", "Every call comes with the reasons behind it."],
  ["Learns as it goes", "Wait estimates improve with every completed visit."],
];

/** Staff sign-in. Supabase Auth checks the password and returns a session (a signed token) that the database's RLS policies trust. */
export function Login({ onOfflineDemo }: { onOfflineDemo: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await getSupabase()!.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  };
  const invalid = error ? { boxShadow: "inset 0 0 0 1.5px var(--negative)" } : {};

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 32, background: "var(--canvas)" }}>
      <div style={{ width: "min(1040px, 100%)", minHeight: 600, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.1fr)", gap: 12, padding: 12, borderRadius: "var(--r-frame)", background: "var(--raised)", boxShadow: "var(--shadow-card)" }}>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, padding: "40px 44px", borderRadius: "var(--r-card)", background: "var(--surface)" }}>
          <div style={{ font: "500 22px/28px var(--font-sans)", letterSpacing: "-0.02em" }}>QueuePro<span style={{ color: "var(--brand)" }}>.</span></div>
          <div>
            <h1 style={{ margin: 0, font: "var(--type-display)", letterSpacing: "-0.02em" }}>Staff sign in</h1>
            <p style={{ margin: "6px 0 0", font: "var(--type-body)", color: "var(--ink-2)" }}>Use the account your clinic manager created for you.</p>
          </div>
          <label style={field}>Email
            <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...input, ...invalid }} aria-invalid={!!error} />
          </label>
          <label style={field}>Password
            <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...input, ...invalid }} aria-invalid={!!error} />
          </label>
          {error && <div role="alert" style={{ font: "var(--type-label)", color: "var(--negative)" }}>{error}</div>}
          <Button type="submit" disabled={busy} style={{ height: 48 }}>{busy ? "Signing in…" : "Sign in"}</Button>
          {/* Visitors (e.g. recruiters) have no staff account: give them an obvious, equal-weight way in. */}
          <div aria-hidden style={{ display: "flex", alignItems: "center", gap: 12, font: "var(--type-label)", color: "var(--label)" }}>
            <span style={{ flex: 1, height: 1, background: "var(--track)" }} />or<span style={{ flex: 1, height: 1, background: "var(--track)" }} />
          </div>
          <Button variant="secondary" onClick={onOfflineDemo} style={{ height: 48 }}>Explore the demo — no account needed</Button>
          <p style={{ margin: 0, font: "var(--type-label)", color: "var(--label)", textAlign: "center" }}>
            The demo runs a seeded clinic day in your browser. Or open the <a href="/display">public waiting-room screen</a>.
          </p>
        </form>

        <aside aria-label="About QueuePro" style={{ position: "relative", overflow: "hidden", borderRadius: "var(--r-card)", background: "var(--dark)", color: "#fff", padding: "44px 44px 40px", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 24 }}>
          {/* decoration only: a faint 64px grid and a soft accent glow (the one place Paper Calm allows a gradient) */}
          <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div aria-hidden style={{ position: "absolute", width: 520, height: 520, right: -160, top: -180, borderRadius: "50%", background: "radial-gradient(circle, color-mix(in oklch, var(--brand) 34%, transparent), transparent 70%)" }} />
          <div style={{ position: "relative", font: "var(--type-display)", letterSpacing: "-0.02em", maxWidth: 420 }}>Fairer queues. Happier customers.</div>
          <ul style={{ position: "relative", margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
            {POINTS.map(([t, d], i) => (
              <li key={t} style={{ display: "flex", gap: 14 }}>
                <span aria-hidden style={{ font: "var(--type-micro)", color: "var(--brand)", paddingTop: 3 }}>{String(i + 1).padStart(2, "0")}</span>
                <span><span style={{ display: "block", font: "var(--type-body)", fontWeight: 500 }}>{t}</span><span style={{ font: "var(--type-control)", color: "#B5B5BA" }}>{d}</span></span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
