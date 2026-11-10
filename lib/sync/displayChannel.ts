import type { PublicView } from "@/lib/engine";

/**
 * Dashboard → waiting-room screen, using the browser's BroadcastChannel API: a message bus between tabs/windows of the
 * same site in the same browser. The dashboard publishes; the screen subscribes. A screen that opens late sends "hello"
 * and the dashboard answers with the current snapshot.
 *
 * Only the sanitised PublicView ever goes on this channel. Feature 5b swaps the transport for Supabase Realtime so a TV on
 * another device can subscribe — the two functions below are the only thing that changes.
 */
const NAME = "queuepro-display";
type Msg = { type: "view"; view: PublicView } | { type: "hello" };

export function publishDisplay(getView: () => PublicView) {
  const ch = new BroadcastChannel(NAME);
  ch.onmessage = (e: MessageEvent<Msg>) => { if (e.data.type === "hello") ch.postMessage({ type: "view", view: getView() } satisfies Msg); };
  return { send: (view: PublicView) => ch.postMessage({ type: "view", view } satisfies Msg), close: () => ch.close() };
}

export function subscribeDisplay(onView: (v: PublicView) => void) {
  const ch = new BroadcastChannel(NAME);
  ch.onmessage = (e: MessageEvent<Msg>) => { if (e.data.type === "view") onView(e.data.view); };
  ch.postMessage({ type: "hello" } satisfies Msg);
  return () => ch.close();
}
