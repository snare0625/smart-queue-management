"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { seedState } from "@/lib/data";
import { getSupabase } from "@/lib/db/client";
import { nextTicketNumber } from "@/lib/db/mapping";
import { loadState, persistAction, writeSeed } from "@/lib/db/queueRepo";
import { publishDisplay, type DisplayPublisher } from "@/lib/sync/displayChannel";
import {
  MIN, learnDurations, planQueue, queueReducer, rankQueue, toDurations, toPublicView,
  type Assignment, type Learned, type QueueAction, type QueueState,
} from "@/lib/engine";

/**
 * One shared copy of the queue for every page. Two modes:
 *  • "supabase" — env vars set: staff sign in, state is loaded from Postgres, every action is written back, and changes
 *    made at other desks arrive over Realtime.
 *  • "local"    — no env vars (or "use offline demo"): the seeded demo lives only in this browser tab, as before.
 * Pages don't care which — they all just call useQueue().
 */
export type Mode = "local" | "supabase";
interface QueueCtx {
  mode: Mode | null; // null until we've checked (on mount)
  session: Session | null;
  authChecked: boolean;
  ready: boolean;
  now: number;
  state: QueueState;
  dispatch: (a: QueueAction) => void;
  learned: Learned;
  plan: Assignment[];
  syncError: string | null;
  fastForward: (min: number) => void;
  nextTicket: () => string;
  resetDemo: () => Promise<void>;
  setOfflineDemo: (on: boolean) => void;
}
const Ctx = createContext<QueueCtx | null>(null);

const EMPTY: QueueState = { waiting: [], staff: [], history: [] };
const OFFLINE_KEY = "queuepro-offline-demo";
// "load" swaps in a whole state (seed or database); every other action goes through the engine's reducer.
const reducer = (s: QueueState, a: QueueAction | { type: "load"; state: QueueState }) => (a.type === "load" ? a.state : queueReducer(s, a));

export function QueueProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const sb = mode === "supabase" ? getSupabase() : null;
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Time is state so the queue re-ranks as it passes. `skew` lets you fast-forward to watch scores age.
  const [clock, setClock] = useState<number | null>(null);
  const [skew, setSkew] = useState(0);
  const [state, setState] = useReducer(reducer, EMPTY);
  const stateRef = useRef(state); // the latest state, readable inside callbacks without re-creating them
  stateRef.current = state;
  const ticketNo = useRef(27); // a ref, not state: two quick clicks must never get the same ticket

  useEffect(() => {
    let offline = false;
    try { offline = localStorage.getItem(OFFLINE_KEY) === "1"; } catch {}
    setMode(getSupabase() && !offline ? "supabase" : "local");
    setClock(Date.now());
    const t = setInterval(() => setClock(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const now = (clock ?? 0) + skew;

  const load = useCallback((s: QueueState) => {
    setState({ type: "load", state: s });
    ticketNo.current = Math.max(27, nextTicketNumber(s));
    setLoaded(true);
  }, []);

  // ── local mode: seed the demo in memory
  useEffect(() => { if (mode === "local") load(seedState(Date.now())); }, [mode, load]);

  // ── supabase mode: who is signed in?
  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setAuthChecked(true); });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  // ── supabase mode: load from the database; an empty database gets the demo seed on first sign-in
  const refetch = useCallback(async () => {
    if (!sb) return;
    try {
      let s = await loadState(sb);
      if (s.staff.length === 0) {
        const r = await writeSeed(sb, seedState(Date.now()));
        if (!r.ok) throw new Error(r.error);
        s = await loadState(sb);
      }
      load(s);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e));
    }
  }, [sb, load]);

  // ── supabase mode: reload whenever ANY desk changes visits or staff (debounced so a burst of changes = one reload)
  useEffect(() => {
    if (!sb || !session) return;
    refetch();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => { clearTimeout(timer); timer = setTimeout(refetch, 300); };
    const ch = sb.channel("queue-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "visits" }, soon)
      .on("postgres_changes", { event: "*", schema: "public", table: "staff" }, soon)
      .subscribe();
    return () => { clearTimeout(timer); sb.removeChannel(ch); };
  }, [sb, session, refetch]);

  /**
   * Optimistic update: apply the action on screen immediately, then write it to the database in the background.
   * If the write fails (e.g. another desk already called that customer) we show why and reload the truth from the database.
   */
  const dispatch = useCallback((action: QueueAction) => {
    const before = stateRef.current;
    const after = queueReducer(before, action);
    if (after === before) return; // the reducer rejected it (busy staff, unknown customer, …)
    stateRef.current = after;
    setState({ type: "load", state: after });
    if (!sb) return;
    persistAction(sb, action, before, after).then((r) => {
      if (r.ok) return setSyncError(null);
      setSyncError(r.error);
      refetch();
    });
  }, [sb, refetch]);

  // Learned durations only change when history does; the plan is recalculated on every arrival, departure, staff change or tick.
  const learned = useMemo(() => learnDurations(state.history), [state.history]);
  const plan = useMemo(() => planQueue(rankQueue(state.waiting, now), state.staff, now, toDurations(learned)), [state.waiting, state.staff, now, learned]);

  // Publish the privacy-safe snapshot to the waiting-room screen whenever it changes.
  const publicView = useMemo(() => toPublicView(plan, state.staff, now), [plan, state.staff, now]);
  const latest = useRef(publicView);
  latest.current = publicView;
  const channel = useRef<DisplayPublisher | null>(null);
  useEffect(() => {
    if (mode === null || (mode === "supabase" && !session)) return;
    channel.current = publishDisplay(sb, () => latest.current, setSyncError);
    return () => { channel.current?.close(); channel.current = null; };
  }, [mode, sb, session]);
  useEffect(() => { if (loaded) channel.current?.send(publicView); }, [publicView, loaded]);

  const value: QueueCtx = {
    mode, session, authChecked, ready: clock !== null && loaded, now, state, dispatch, learned, plan, syncError,
    fastForward: (min) => setSkew((s) => s + min * MIN),
    nextTicket: () => "A" + String(ticketNo.current++).padStart(3, "0"),
    resetDemo: async () => {
      setSkew(0);
      const fresh = seedState(Date.now());
      if (!sb) return load(fresh);
      const r = await writeSeed(sb, fresh);
      if (!r.ok) setSyncError(r.error);
      await refetch();
    },
    setOfflineDemo: (on) => {
      try { if (on) localStorage.setItem(OFFLINE_KEY, "1"); else localStorage.removeItem(OFFLINE_KEY); } catch {}
      window.location.reload();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQueue(): QueueCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useQueue must be used inside <QueueProvider>");
  return ctx;
}
