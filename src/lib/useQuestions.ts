"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "./supabase/client";
import type { Question } from "./types";

const VOTE_DEBOUNCE_MS = 1500;

// Live questions for one event, kept current over realtime, plus the viewer's own votes.
// `live` is false while the realtime channel is down; a slow poll keeps lists honest anyway.
export function useQuestions(eventId: string) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [uid, setUid] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [live, setLive] = useState(true);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const again = useRef(false);

  const load = useCallback(async () => {
    // coalesce bursts of realtime events into at most one request in flight plus one queued
    if (busy.current) { again.current = true; return; }
    busy.current = true;
    try {
      const sb = supabaseBrowser();
      const { data, error: e } = await sb.from("question_scores").select("*").eq("event_id", eventId);
      if (e) throw e;
      setQuestions((data ?? []) as Question[]);
      setError("");
      const { data: u } = await sb.auth.getUser();
      setUid(u.user?.id ?? null);
      if (u.user) {
        const { data: v } = await sb.from("question_votes").select("question_id").eq("user_id", u.user.id);
        setMyVotes(new Set((v ?? []).map((r: { question_id: string }) => r.question_id)));
      }
    } catch (e) {
      setError((e as Error).message || "Could not load questions");
    } finally {
      busy.current = false;
      setLoaded(true);
      if (again.current) { again.current = false; load(); }
    }
  }, [eventId]);

  useEffect(() => {
    load();
    const sb = supabaseBrowser();
    // question_votes has no event_id to filter on, so every vote on any event arrives here.
    // Coalesce them into one reload 1.5 s after the last one instead of reloading per vote.
    let voteTimer: ReturnType<typeof setTimeout> | undefined;
    const onVote = () => { clearTimeout(voteTimer); voteTimer = setTimeout(load, VOTE_DEBOUNCE_MS); };
    const ch = sb.channel(`q-${eventId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "questions", filter: `event_id=eq.${eventId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "question_votes" }, onVote)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { setLive(true); load(); }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setLive(false);
      });
    // realtime can drop on flaky venue wifi; a slow poll keeps the screen honest
    const t = setInterval(load, 15000);
    const onFocus = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onFocus);
    return () => { sb.removeChannel(ch); clearInterval(t); clearTimeout(voteTimer); document.removeEventListener("visibilitychange", onFocus); };
  }, [eventId, load]);

  return { questions, myVotes, uid, loaded, live, error, reload: load };
}

export const byTop = (a: Question, b: Question) =>
  Number(a.status === "answered") - Number(b.status === "answered") || b.votes - a.votes || b.created_at.localeCompare(a.created_at);

export const byNew = (a: Question, b: Question) => b.created_at.localeCompare(a.created_at);

export const authorOf = (q: Question) => (q.anonymous || !q.author_name ? "Anonymous" : q.author_name);

export function ago(iso: string, now = Date.now()) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
