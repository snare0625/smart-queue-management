"use client";
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { seedCustomers, seedHistory, seedStaff } from "@/lib/data";
import {
  MIN, learnDurations, planQueue, queueReducer, rankQueue, toDurations,
  type Assignment, type Learned, type QueueAction, type QueueState,
} from "@/lib/engine";

/**
 * One shared copy of the queue for every page (Live Queue, Services, and later the public display and Supabase sync).
 * Pages read it with useQueue() instead of each keeping their own state, so switching tabs doesn't lose anything.
 */
interface QueueCtx {
  ready: boolean;
  now: number;
  state: QueueState;
  dispatch: (a: QueueAction) => void;
  learned: Learned;
  plan: Assignment[];
  fastForward: (min: number) => void;
  nextTicket: () => string;
}
const Ctx = createContext<QueueCtx | null>(null);

const EMPTY: QueueState = { waiting: [], staff: [], history: [] };
// "load" swaps in a whole state (the seed today, Supabase later); every other action goes through the engine's reducer.
const reducer = (s: QueueState, a: QueueAction | { type: "load"; state: QueueState }) => (a.type === "load" ? a.state : queueReducer(s, a));

export function QueueProvider({ children }: { children: ReactNode }) {
  // Time is state so the queue re-ranks as it passes. `skew` lets you fast-forward to watch scores age.
  const [clock, setClock] = useState<number | null>(null);
  const [skew, setSkew] = useState(0);
  const [state, dispatch] = useReducer(reducer, EMPTY);
  const ticketNo = useRef(27); // a ref, not state: two quick clicks must never get the same ticket
  useEffect(() => {
    const t0 = Date.now();
    setClock(t0);
    dispatch({ type: "load", state: { waiting: seedCustomers(t0), staff: seedStaff(t0), history: seedHistory(t0) } });
    const t = setInterval(() => setClock(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const now = (clock ?? 0) + skew;

  // Learned durations only change when history does; the plan is recalculated on every arrival, departure, staff change or tick.
  const learned = useMemo(() => learnDurations(state.history), [state.history]);
  const plan = useMemo(() => planQueue(rankQueue(state.waiting, now), state.staff, now, toDurations(learned)), [state.waiting, state.staff, now, learned]);

  const value: QueueCtx = {
    ready: clock !== null, now, state, dispatch, learned, plan,
    fastForward: (min) => setSkew((s) => s + min * MIN),
    nextTicket: () => "A0" + ticketNo.current++,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useQueue(): QueueCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useQueue must be used inside <QueueProvider>");
  return ctx;
}
