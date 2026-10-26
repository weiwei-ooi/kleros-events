"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export type ScreenMode = "questions" | "join" | "blank";
export const SCREEN_MODES: { id: ScreenMode; label: string }[] = [
  { id: "questions", label: "Questions" },
  { id: "join", label: "Join code only" },
  { id: "blank", label: "Blank (logo)" },
];

type Msg = { type: "mode"; mode: ScreenMode } | { type: "questions" };

// Same-laptop fast path: the host console and the big screen window usually run in the
// same browser, so a BroadcastChannel updates the projector instantly even without wifi.
function channel(eventId: string) {
  return typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(`kleros-live-${eventId}`);
}

export function nudgeScreen(eventId: string, msg: Msg) {
  const c = channel(eventId);
  if (!c) return;
  c.postMessage(msg);
  c.close();
}

/**
 * The big screen mode for one event, stored in live_state and kept in sync over realtime,
 * a BroadcastChannel and a 15 s poll. `setMode` is for the host console (team only by RLS).
 */
export function useScreenMode(eventId: string, onQuestionsNudge?: () => void) {
  const [mode, setLocal] = useState<ScreenMode>("questions");
  const [live, setLive] = useState(true);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const nudge = useRef(onQuestionsNudge);
  nudge.current = onQuestionsNudge;

  const load = useCallback(async () => {
    if (pending.current) return;
    const { data, error: e } = await supabaseBrowser().from("live_state").select("screen_mode").eq("event_id", eventId).maybeSingle();
    if (e) { setError(e.message); return; }
    setError("");
    if (data?.screen_mode && !pending.current) setLocal(data.screen_mode as ScreenMode);
  }, [eventId]);

  useEffect(() => {
    load();
    const sb = supabaseBrowser();
    const ch = sb.channel(`live-${eventId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_state", filter: `event_id=eq.${eventId}` }, (p) => {
        const m = (p.new as { screen_mode?: ScreenMode } | null)?.screen_mode;
        if (m && !pending.current) setLocal(m);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { setLive(true); load(); }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setLive(false);
      });
    const bc = channel(eventId);
    if (bc) bc.onmessage = (e: MessageEvent<Msg>) => {
      if (e.data?.type === "mode") setLocal(e.data.mode);
      if (e.data?.type === "questions") nudge.current?.();
    };
    const t = setInterval(load, 15000);
    return () => { sb.removeChannel(ch); bc?.close(); clearInterval(t); };
  }, [eventId, load]);

  const setMode = useCallback(async (m: ScreenMode) => {
    setLocal(m);
    nudgeScreen(eventId, { type: "mode", mode: m });
    pending.current = true;
    const { error: e } = await supabaseBrowser().from("live_state")
      .upsert({ event_id: eventId, screen_mode: m, updated_at: new Date().toISOString() }, { onConflict: "event_id" });
    pending.current = false;
    if (e) {
      setError(/live_state/.test(e.message) && /exist|schema cache/i.test(e.message)
        ? "The database is missing the live_state table (migration 0004_live.sql). The screen on this laptop still follows the toggle; other devices will not."
        : `Could not save the screen mode: ${e.message}`);
    } else setError("");
  }, [eventId]);

  return { mode, setMode, live, error };
}
