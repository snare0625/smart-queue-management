// Security check: act as a member of the public (anon key only, not signed in) and try to read and change private data.
// Every line should say PASS. Run with: npm run check:rls
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

// The apikey header alone = the anonymous role. (Works for both legacy "eyJ…" anon keys and new "sb_publishable_…" keys.)
const headers = { apikey: key, "Content-Type": "application/json", Prefer: "return=representation" };
const rest = (path, init = {}) => fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers } });
let failed = 0;
const check = (ok, label, detail) => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`); };
const body = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };

// A 404 means the table doesn't exist — then the other checks would "pass" for the wrong reason, so stop early.
const missing = [];
for (const table of ["visits", "staff", "public_display"]) if ((await rest(`${table}?select=*&limit=0`)).status === 404) missing.push(table);
if (missing.length) {
  console.log(`Tables not found: ${missing.join(", ")}.\nRun supabase/migrations/0001_init.sql in the Supabase SQL Editor first, then re-run this check.`);
  process.exit(1);
}

for (const table of ["visits", "staff"]) {
  const r = await rest(`${table}?select=*`);
  const data = await body(r);
  if (r.status === 404) { check(false, `${table} table exists`, "run supabase/migrations/0001_init.sql first"); continue; }
  check(r.ok && Array.isArray(data) && data.length === 0, `public cannot read ${table}`, `HTTP ${r.status}, ${Array.isArray(data) ? data.length + " rows visible" : JSON.stringify(data)}`);
}

const ins = await rest("visits", { method: "POST", body: JSON.stringify({ id: "HACK1", name: "Mallory", service_id: "general", arrived_at: new Date().toISOString() }) });
check(!ins.ok, "public cannot add a visit", `HTTP ${ins.status}`);

const upd = await rest("visits?id=neq.none", { method: "PATCH", body: JSON.stringify({ status: "cancelled", ended_at: new Date().toISOString() }) });
const updData = await body(upd);
check(!upd.ok || (Array.isArray(updData) && updData.length === 0), "public cannot cancel visits", `HTTP ${upd.status}, ${Array.isArray(updData) ? updData.length + " rows changed" : "rejected"}`);

const disp = await rest("public_display?select=view");
check(disp.ok, "public CAN read the display snapshot", `HTTP ${disp.status}`);

const deface = await rest("public_display", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ id: 1, view: { hacked: true } }) });
check(!deface.ok, "public cannot overwrite the display snapshot", `HTTP ${deface.status}`);

console.log(failed ? `\n${failed} check(s) FAILED — the database is exposing data.` : "\nAll checks passed — private data is protected by Row Level Security.");
process.exit(failed ? 1 : 0);
