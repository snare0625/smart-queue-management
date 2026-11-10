import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicView } from "@/lib/engine";

/**
 * Dashboard → waiting-room screen. Same two functions, two transports:
 *
 *  • Supabase (when configured): the dashboard upserts the snapshot into the single `public_display` row; screens on ANY
 *    device read that row and subscribe to its changes via Supabase Realtime. RLS lets the public read it but not write it.
 *  • BroadcastChannel (local demo): a message bus between tabs of the same browser. A late screen sends "hello" and the
 *    dashboard answers with the current snapshot.
 *
 * Only the sanitised PublicView ever travels on either transport.
 */
const NAME = "queuepro-display";
type Msg = { type: "view"; view: PublicView } | { type: "hello" };
export interface DisplayPublisher { send: (v: PublicView) => void; close: () => void }

export function publishDisplay(sb: SupabaseClient | null, getView: () => PublicView, onError?: (msg: string) => void): DisplayPublisher {
  if (sb) {
    return {
      send: (view) => { sb.from("public_display").upsert({ id: 1, view, updated_at: new Date().toISOString() }).then(({ error }) => error && onError?.(error.message)); },
      close: () => {},
    };
  }
  const ch = new BroadcastChannel(NAME);
  ch.onmessage = (e: MessageEvent<Msg>) => { if (e.data.type === "hello") ch.postMessage({ type: "view", view: getView() } satisfies Msg); };
  return { send: (view) => ch.postMessage({ type: "view", view } satisfies Msg), close: () => ch.close() };
}

/** Calls onView with each snapshot and when it was published (ms). Returns an unsubscribe function. */
export function subscribeDisplay(sb: SupabaseClient | null, onView: (v: PublicView, publishedAt: number) => void): () => void {
  if (sb) {
    type Row = { view: PublicView; updated_at: string };
    const take = (r: Row | null) => r && onView(r.view, Date.parse(r.updated_at));
    sb.from("public_display").select("view, updated_at").eq("id", 1).maybeSingle().then(({ data }) => take(data as Row | null));
    const ch = sb.channel("public-display")
      .on("postgres_changes", { event: "*", schema: "public", table: "public_display" }, (p) => take(p.new as Row))
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }
  const ch = new BroadcastChannel(NAME);
  ch.onmessage = (e: MessageEvent<Msg>) => { if (e.data.type === "view") onView(e.data.view, Date.now()); };
  ch.postMessage({ type: "hello" } satisfies Msg);
  return () => ch.close();
}
