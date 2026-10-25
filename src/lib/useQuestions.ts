"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "./supabase/client";
import type { Question } from "./types";

// Live questions for one event, kept current over realtime, plus the viewer's own votes.
export function useQuestions(eventId: string) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [uid, setUid] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const { data } = await sb.from("question_scores").select("*").eq("event_id", eventId);
    setQuestions((data ?? []) as Question[]);
    const { data: u } = await sb.auth.getUser();
    setUid(u.user?.id ?? null);
    if (u.user) {
      const { data: v } = await sb.from("question_votes").select("question_id").eq("user_id", u.user.id);
      setMyVotes(new Set((v ?? []).map((r: { question_id: string }) => r.question_id)));
    }
  }, [eventId]);

  useEffect(() => {
    load();
    const sb = supabaseBrowser();
    const ch = sb.channel(`q-${eventId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "questions", filter: `event_id=eq.${eventId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "question_votes" }, load)
      .subscribe();
    // realtime can drop on flaky venue wifi; a slow poll keeps the screen honest
    const t = setInterval(load, 15000);
    return () => { sb.removeChannel(ch); clearInterval(t); };
  }, [eventId, load]);

  return { questions, myVotes, uid, reload: load };
}

export const byTop = (a: Question, b: Question) =>
  Number(a.status === "answered") - Number(b.status === "answered") || b.votes - a.votes || b.created_at.localeCompare(a.created_at);
