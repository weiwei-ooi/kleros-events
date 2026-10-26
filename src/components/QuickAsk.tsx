"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ensureUser, supabaseBrowser } from "@/lib/supabase/client";
import { ago, authorOf, byNew, byTop, useQuestions } from "@/lib/useQuestions";
import type { Question } from "@/lib/types";

const MAX = 280;

function friendly(e: unknown) {
  const m = (e as Error)?.message || "";
  if (/anonymous/i.test(m) && /disabled|not enabled/i.test(m)) return "Guest questions are switched off for this site right now. Sign in to ask.";
  if (/fetch|network/i.test(m)) return "No connection. Check the wifi and try again.";
  return m || "Something went wrong. Try again.";
}

// What people land on after scanning the QR on the big screen: ask in one tap, no account.
export default function QuickAsk({ eventId, title, slug }: { eventId: string; title: string; slug: string }) {
  const { questions, myVotes, uid, loaded, reload } = useQuestions(eventId);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [sort, setSort] = useState<"top" | "new">("top");
  const [voting, setVoting] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => { try { setName(localStorage.getItem("ke-ask-name") ?? ""); } catch { /* storage blocked */ } }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (text.length < 3) return;
    setErr(""); setBusy(true);
    try {
      const me = await ensureUser();
      const sb = supabaseBrowser();
      const { data, error } = await sb.from("questions")
        .insert({ event_id: eventId, body: text, anonymous: !name.trim(), author_id: me.id, author_name: name.trim() || null })
        .select("id").single();
      if (error) throw error;
      await sb.from("question_votes").insert({ question_id: data.id, user_id: me.id });
      try { localStorage.setItem("ke-ask-name", name.trim()); } catch { /* storage blocked */ }
      setBody(""); setSent(true); setTimeout(() => setSent(false), 5000);
      reload();
    } catch (x) { setErr(friendly(x)); }
    setBusy(false);
  }

  async function vote(q: Question) {
    setErr(""); setVoting(q.id);
    try {
      const me = await ensureUser();
      const sb = supabaseBrowser();
      const { error } = myVotes.has(q.id)
        ? await sb.from("question_votes").delete().eq("question_id", q.id).eq("user_id", me.id)
        : await sb.from("question_votes").insert({ question_id: q.id, user_id: me.id });
      if (error) throw error;
      reload();
    } catch (x) { setErr(friendly(x)); }
    setVoting("");
  }

  const visible = questions.filter((q) => q.status !== "hidden");
  const list = visible.sort(sort === "top" ? byTop : byNew);
  const left = MAX - body.length;

  return (
    <div className="wrap qa">
      <header className="qa-head">
        <div className="eyebrow">Ask the speakers</div>
        <h1>{title}</h1>
      </header>

      <form className="qa-form" onSubmit={ask}>
        <label className="lbl" htmlFor="qa-body">Your question</label>
        <textarea id="qa-body" className="qa-box" value={body} onChange={(e) => setBody(e.target.value.slice(0, MAX))}
          placeholder="Type a question for the speakers" maxLength={MAX} rows={4} required />
        <div className="qa-row">
          <input className="qa-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" maxLength={40} aria-label="Your name, optional" autoComplete="name" />
          <span className={`qa-count mono ${left < 30 ? "low" : ""}`} aria-live="polite">{left}</span>
        </div>
        <button className="btn primary qa-send" type="submit" disabled={busy || body.trim().length < 3}>{busy ? "Sending…" : "Send question"}</button>
        <p className="muted small qa-fine">No account needed. Leave the name empty to ask anonymously.</p>
        {sent && <div className="ok" role="status">Sent. It is in the list below and on the big screen.</div>}
        {err && <div className="note" role="alert">{err}</div>}
      </form>

      <section className="qa-list-wrap" aria-labelledby="qa-list-h">
        <div className="qa-list-h">
          <h2 id="qa-list-h">Questions <span className="muted">{visible.length || ""}</span></h2>
          <div className="seg" role="group" aria-label="Sort questions">
            <button aria-pressed={sort === "top"} onClick={() => setSort("top")}>Top</button>
            <button aria-pressed={sort === "new"} onClick={() => setSort("new")}>New</button>
          </div>
        </div>
        <p className="muted small">Tap the arrow on the questions that should be answered first.</p>
        <div className="qa-list">
          {list.map((q) => {
            const mine = uid && q.author_id === uid;
            return (
              <article key={q.id} className={`qa-item ${q.featured ? "is-feat" : ""} ${q.status === "answered" ? "is-done" : ""}`}>
                <button className={`qa-vote ${myVotes.has(q.id) ? "on" : ""}`} onClick={() => vote(q)} disabled={voting === q.id}
                  aria-pressed={myVotes.has(q.id)} aria-label={`${myVotes.has(q.id) ? "Remove upvote" : "Upvote"}, ${q.votes} votes`}>
                  <span aria-hidden="true">▲</span><span>{q.votes}</span>
                </button>
                <div className="qa-body">
                  <p>{q.body}</p>
                  <div className="qa-meta">
                    {authorOf(q)}{mine ? " (you)" : ""} · {ago(q.created_at, now)}
                    {q.featured && <span className="pill host">On screen now</span>}
                    {q.status === "answered" && <span className="pill plain">Answered</span>}
                  </div>
                </div>
              </article>
            );
          })}
          {loaded && !list.length && <div className="empty"><b>No questions yet</b>Questions appear here and on the big screen as soon as they are sent.</div>}
          {!loaded && <div className="muted small">Loading questions…</div>}
        </div>
      </section>

      <p className="muted small qa-foot"><Link href={`/events/${slug}`}>About this event</Link> · Recordings and slides are published on Kleros Events after the event.</p>
    </div>
  );
}
