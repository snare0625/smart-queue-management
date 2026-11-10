"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, type CSSProperties, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { getSupabase } from "@/lib/db/client";

const input: CSSProperties = { height: 38, padding: "0 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-dark)", background: "var(--navy-800)", color: "var(--text-on-dark)", font: "var(--type-body)" };

/** Staff sign-in. Supabase Auth checks the password and returns a session (a signed token) that RLS policies trust. */
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

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg-app)", color: "var(--text-on-dark)" }}>
      <form onSubmit={submit} style={{ width: 360, display: "flex", flexDirection: "column", gap: 14, padding: 28, borderRadius: "var(--radius-md)", background: "var(--navy-850)", border: "1px solid var(--border-dark)" }}>
        <img src="/assets/logo-lockup.png" alt="QueuePro" style={{ height: 44, objectFit: "contain", objectPosition: "left" }} />
        <h1 style={{ margin: 0, font: "var(--type-panel-title)" }}>Staff sign in</h1>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, font: "var(--type-label)" }}>Email
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} style={input} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, font: "var(--type-label)" }}>Password
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={input} />
        </label>
        {error && <div role="alert" style={{ font: "var(--type-label)", color: "var(--red-500)" }}>{error}</div>}
        <Button disabled={busy} style={{ justifyContent: "center" }}>{busy ? "Signing in…" : "Sign in"}</Button>
        <button type="button" onClick={onOfflineDemo} style={{ border: "none", background: "none", color: "var(--accent-text)", font: "var(--fw-medium) 13px var(--font-sans)", cursor: "pointer" }}>Use the offline demo instead</button>
        <a href="/display" style={{ textAlign: "center", font: "var(--type-label)", color: "var(--text-on-dark-muted)" }}>Open the public waiting-room screen →</a>
      </form>
    </div>
  );
}
