"use client";
import { useState } from "react";
import Link from "next/link";
import { ensureUser, supabaseBrowser } from "@/lib/supabase/client";
import { byTop, useQuestions } from "@/lib/useQuestions";
import type { Question } from "@/lib/types";

// What people land on after scanning the QR on the big screen: ask in one tap, no account.
export default function QuickAsk({ eventId, title, slug }: { eventId: string; title: string; slug: string }) {
  const { questions, myVotes, reload } = useQuestions(eventId);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function ask(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const me = await ensureUser();
      const sb = supabaseBrowser();
      const { data, error } = await sb.from("questions")
        .insert({ event_id: eventId, body: body.trim(), anonymous: !name.trim(), author_id: me.id, author_name: name.trim() || null })
        .select("id").single();
      if (error) throw error;
      await sb.from("question_votes").insert({ question_id: data.id, user_id: me.id });
      setBody(""); setSent(true); setTimeout(() => setSent(false), 4000);
      reload();
    } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }
  async function vote(q: Question) {
    try {
      const me = await ensureUser();
      const sb = supabaseBrowser();
      if (myVotes.has(q.id)) await sb.from("question_votes").delete().eq("question_id", q.id).eq("user_id", me.id);
      else await sb.from("question_votes").insert({ question_id: q.id, user_id: me.id });
      reload();
    } catch (x) { setErr((x as Error).message); }
  }

  const list = questions.filter((q) => q.status !== "hidden").sort(byTop);
  return (
    <div className="wrap ask-page">
      <div className="eyebrow">Ask the speaker</div>
      <h1>{title}</h1>
      <form className="stack" onSubmit={ask}>
        <textarea className="ask-box" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your question…" maxLength={280} minLength={3} required aria-label="Your question" />
        <div className="row-flex">
          <input className="search" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" maxLength={40} aria-label="Your name" />
          <button className="btn primary" type="submit" disabled={busy || body.trim().length < 3}>{busy ? "Sending…" : "Send question"}</button>
        </div>
        {sent && <div className="ok">Sent. It&apos;s on the screen now.</div>}
        {err && <div className="note">{err}</div>}
      </form>
      <div className="section-h"><h2>Questions <em>from the room</em></h2><span className="muted small">Tap ▲ on the ones you want answered</span></div>
      <div className="stack">
        {list.map((q) => (
          <div key={q.id} className={`q ${q.featured ? "feat" : ""} ${q.status === "answered" ? "done" : ""}`}>
            <button className={`vote ${myVotes.has(q.id) ? "on" : ""}`} onClick={() => vote(q)} aria-label="Upvote">▲<span>{q.votes}</span></button>
            <div style={{ minWidth: 0 }}>
              <div style={{ overflowWrap: "anywhere" }}>{q.body}</div>
              <div className="by">{q.anonymous || !q.author_name ? "Anonymous" : q.author_name}{q.featured ? " · on screen now" : ""}{q.status === "answered" ? " · answered" : ""}</div>
            </div>
          </div>
        ))}
        {!list.length && <div className="empty"><b>Be the first</b>Your question shows up on the big screen as soon as you send it.</div>}
      </div>
      <p className="muted small" style={{ marginTop: 28 }}><Link href={`/events/${slug}`}>About this event</Link> · Recordings and slides go up on Kleros Events afterwards.</p>
    </div>
  );
}
