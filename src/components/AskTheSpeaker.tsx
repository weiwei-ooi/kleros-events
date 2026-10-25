"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Question } from "@/lib/types";

export default function AskTheSpeaker({ eventId, signedIn, isTeam, displayName, slug }: { eventId: string; signedIn: boolean; isTeam: boolean; displayName: string; slug: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [uid, setUid] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [anon, setAnon] = useState(false);
  const [sort, setSort] = useState<"top" | "new">("top");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const { data } = await sb.from("question_scores").select("*").eq("event_id", eventId);
    setQuestions((data ?? []) as Question[]);
    const { data: u } = await sb.auth.getUser();
    if (u.user) {
      setUid(u.user.id);
      const { data: v } = await sb.from("question_votes").select("question_id").eq("user_id", u.user.id);
      setMyVotes(new Set((v ?? []).map((r: { question_id: string }) => r.question_id)));
    }
  }, [eventId]);

  useEffect(() => {
    load();
    const sb = supabaseBrowser();
    const ch = sb.channel(`qa-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "questions", filter: `event_id=eq.${eventId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "question_votes" }, load)
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [eventId, load]);

  async function ask(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const sb = supabaseBrowser();
    const { data, error } = await sb.from("questions").insert({ event_id: eventId, body: body.trim(), anonymous: anon, author_id: uid, author_name: anon ? null : displayName || null }).select("id").single();
    if (error) { setErr(error.message); return; }
    if (data && uid) await sb.from("question_votes").insert({ question_id: data.id, user_id: uid });
    setBody(""); load();
  }
  async function vote(q: Question) {
    if (!uid) return;
    const sb = supabaseBrowser();
    if (myVotes.has(q.id)) await sb.from("question_votes").delete().eq("question_id", q.id).eq("user_id", uid);
    else await sb.from("question_votes").insert({ question_id: q.id, user_id: uid });
    load();
  }
  async function moderate(q: Question, patch: Partial<Question>) {
    const sb = supabaseBrowser();
    if (patch.featured) await sb.from("questions").update({ featured: false }).eq("event_id", eventId);
    await sb.from("questions").update(patch).eq("id", q.id);
    load();
  }

  const list = questions.filter((q) => q.status !== "hidden").sort((a, b) =>
    sort === "new" ? b.created_at.localeCompare(a.created_at) : Number(a.status === "answered") - Number(b.status === "answered") || b.votes - a.votes);

  return (
    <div className="stack">
      {signedIn ? (
        <form className="row-flex" onSubmit={ask}>
          <input className="search" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ask the Kleros speakers a question…" maxLength={280} minLength={3} required aria-label="Your question" />
          <label className="muted small"><input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> anonymous</label>
          <button className="btn primary sm" type="submit">Ask</button>
        </form>
      ) : <div className="muted small"><Link href={`/login?next=/events/${slug}%23ask`}>Sign in</Link> to ask a question or upvote one.</div>}
      {err && <div className="note">{err}</div>}
      <div className="row-flex">
        <div className="seg" role="group" aria-label="Sort"><button aria-pressed={sort === "top"} onClick={() => setSort("top")}>Top</button><button aria-pressed={sort === "new"} onClick={() => setSort("new")}>Newest</button></div>
        {isTeam && <Link className="btn sm" href={`/events/${slug}/live`} target="_blank">Open big screen ↗</Link>}
      </div>
      {list.map((q) => (
        <div key={q.id} className={`q ${q.featured ? "feat" : ""} ${q.status === "answered" ? "done" : ""}`}>
          <button className={`vote ${myVotes.has(q.id) ? "on" : ""}`} onClick={() => vote(q)} disabled={!uid} aria-label="Upvote">▲<span>{q.votes}</span></button>
          <div style={{ minWidth: 0 }}>
            <div style={{ overflowWrap: "anywhere" }}>{q.body}</div>
            <div className="by">{q.anonymous || !q.author_name ? "Anonymous" : q.author_name}{q.featured ? " · on screen" : ""}{q.status === "answered" ? " · answered" : ""}</div>
            {isTeam && (
              <div className="row-flex" style={{ marginTop: 8 }}>
                <button className="btn sm" onClick={() => moderate(q, { featured: !q.featured })}>{q.featured ? "Take off screen" : "Show on screen"}</button>
                <button className="btn sm ghost" onClick={() => moderate(q, { status: q.status === "answered" ? "open" : "answered" })}>{q.status === "answered" ? "Reopen" : "Mark answered"}</button>
                <button className="btn sm ghost" onClick={() => moderate(q, { status: "hidden" })}>Hide</button>
              </div>
            )}
          </div>
        </div>
      ))}
      {!list.length && <div className="empty" style={{ padding: 18 }}><b>No questions yet</b>Questions work during the talk and after it. The speakers see them all.</div>}
    </div>
  );
}
