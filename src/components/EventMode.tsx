"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { supabaseBrowser } from "@/lib/supabase/client";
import { byTop, useQuestions } from "@/lib/useQuestions";
import { addChunk, dropSession, pickMime, saveSession, sessionBlob, unsavedSessions, type RecSession } from "@/lib/recorder";
import { uploadToStorage } from "./admin/MaterialsManager";
import { fmtDur } from "@/lib/format";
import type { Question } from "@/lib/types";

type Rec = "idle" | "recording" | "stopped" | "saving" | "saved";
// ~21 MB an hour, so a two-hour session stays under the 50 MB upload cap of the free tier.
const BITRATE = 48_000;

// The laptop at the venue: the projector shows the questions and a join QR, and the
// team can record the whole session with one button.
export default function EventMode({ eventId, slug, title, joinUrl, isTeam }: {
  eventId: string; slug: string; title: string; joinUrl: string; isTeam: boolean;
}) {
  const { questions, reload } = useQuestions(eventId);
  const [qr, setQr] = useState("");
  const [bar, setBar] = useState(true);
  const [rec, setRec] = useState<Rec>("idle");
  const [secs, setSecs] = useState(0);
  const [level, setLevel] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [recTitle, setRecTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [err, setErr] = useState("");
  const [leftover, setLeftover] = useState<RecSession | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  const media = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const session = useRef<RecSession | null>(null);
  const wake = useRef<WakeLockSentinel | null>(null);
  const started = useRef(0);
  const seen = useRef<Set<string> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { QRCode.toString(joinUrl, { type: "svg", margin: 0, color: { dark: "#120D1A", light: "#FFFFFF" } }).then(setQr); }, [joinUrl]);
  useEffect(() => { if (isTeam) unsavedSessions(eventId).then((s) => setLeftover(s.find((x) => x.id !== session.current?.id) ?? null)).catch(() => {}); }, [eventId, isTeam]);

  // highlight questions that arrived since the screen opened
  useEffect(() => {
    const ids = new Set(questions.map((q) => q.id));
    if (seen.current) {
      const added = [...ids].filter((id) => !seen.current!.has(id));
      if (added.length) {
        setFresh((f) => new Set([...f, ...added]));
        setTimeout(() => setFresh((f) => { const n = new Set(f); added.forEach((id) => n.delete(id)); return n; }), 6000);
      }
    }
    seen.current = ids;
  }, [questions]);

  // control bar fades out on the projector when the mouse is still
  const poke = useCallback(() => {
    setBar(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setBar(false), 4000);
  }, []);
  useEffect(() => { poke(); window.addEventListener("mousemove", poke); return () => window.removeEventListener("mousemove", poke); }, [poke]);

  useEffect(() => {
    if (rec !== "recording") return;
    const t = setInterval(() => setSecs((Date.now() - started.current) / 1000), 500);
    return () => clearInterval(t);
  }, [rec]);

  useEffect(() => {
    const keep = () => { if (rec === "recording" && document.visibilityState === "visible") navigator.wakeLock?.request("screen").then((w) => { wake.current = w; }).catch(() => {}); };
    document.addEventListener("visibilitychange", keep);
    return () => document.removeEventListener("visibilitychange", keep);
  }, [rec]);

  useEffect(() => {
    if (rec !== "recording") return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [rec]);

  async function start() {
    setErr("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
      stream.current = s;
      const mime = pickMime();
      const mr = new MediaRecorder(s, { mimeType: mime || undefined, audioBitsPerSecond: BITRATE });
      const sess: RecSession = { id: crypto.randomUUID(), eventId, startedAt: Date.now(), mime: mr.mimeType || "audio/webm", seconds: 0 };
      session.current = sess;
      await saveSession(sess);
      mr.ondataavailable = (e) => { if (e.data.size) { addChunk(sess.id, e.data); saveSession({ ...sess, seconds: (Date.now() - sess.startedAt) / 1000 }); } };
      mr.onstop = async () => {
        s.getTracks().forEach((t) => t.stop());
        await new Promise((r) => setTimeout(r, 300));
        setBlob(await sessionBlob(sess));
        setRec("stopped");
      };
      mr.start(5000);
      media.current = mr;
      started.current = Date.now();
      setSecs(0);
      setRecTitle(`${title} · recording`);
      setRec("recording");
      wake.current = await navigator.wakeLock?.request("screen").catch(() => null) ?? null;
      meter(s);
    } catch (e) {
      setErr((e as Error).name === "NotAllowedError" ? "The browser blocked the microphone. Allow it in the address bar and try again." : (e as Error).message);
    }
  }

  function meter(s: MediaStream) {
    const ctx = new AudioContext();
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    ctx.createMediaStreamSource(s).connect(an);
    const buf = new Uint8Array(an.fftSize);
    const tick = () => {
      if (media.current?.state !== "recording") { ctx.close(); setLevel(0); return; }
      an.getByteTimeDomainData(buf);
      let sum = 0; for (const v of buf) sum += ((v - 128) / 128) ** 2;
      setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
      requestAnimationFrame(tick);
    };
    tick();
  }

  function stop() {
    media.current?.stop();
    wake.current?.release().catch(() => {});
    wake.current = null;
  }

  async function recover(s: RecSession) {
    session.current = s;
    setBlob(await sessionBlob(s));
    setSecs(s.seconds);
    setRecTitle(`${title} · recording`);
    setLeftover(null);
    setRec("stopped");
  }

  async function save() {
    if (!blob || !session.current) return;
    setErr(""); setRec("saving");
    try {
      const ext = blob.type.includes("mp4") ? "m4a" : "webm";
      const path = await uploadToStorage(eventId, blob, `recording-${new Date(session.current.startedAt).toISOString().slice(0, 16)}.${ext}`);
      const { error } = await supabaseBrowser().from("materials").insert({
        event_id: eventId, kind: "audio", title: recTitle.trim() || `${title} · recording`, speaker: speaker.trim() || null,
        file_path: path, duration_seconds: Math.round(secs), size_bytes: blob.size,
      });
      if (error) throw error;
      await dropSession(session.current.id);
      setRec("saved");
    } catch (e) { setErr((e as Error).message); setRec("stopped"); }
  }

  function download() {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}-recording.${blob.type.includes("mp4") ? "m4a" : "webm"}`;
    a.click();
  }

  async function discard() {
    if (session.current) await dropSession(session.current.id);
    session.current = null; setBlob(null); setRec("idle"); setSecs(0);
  }

  async function moderate(q: Question, patch: Partial<Question>) {
    const sb = supabaseBrowser();
    if (patch.featured) await sb.from("questions").update({ featured: false }).eq("event_id", eventId);
    await sb.from("questions").update(patch).eq("id", q.id);
    reload();
  }

  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
  }

  const open = questions.filter((q) => q.status === "open").sort(byTop);
  const feat = open.find((q) => q.featured);
  const rest = open.filter((q) => q !== feat).slice(0, feat ? 3 : 6);
  const joinShort = joinUrl.replace(/^https?:\/\//, "");

  return (
    <div className={`stage ${bar ? "" : "quiet"}`}>
      <div className="stage-main">
        <div className="stage-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kleros-logo.svg" alt="Kleros" />
          {rec === "recording" && <span className="rec-badge"><span className="dot" /> REC {fmtDur(secs)}</span>}
        </div>
        <h1 className="stage-title">{title}</h1>
        {feat && (
          <div className="stage-feat">
            <div className="eyebrow">Question from the room</div>
            <div className="big-q">{feat.body}</div>
            <div className="stage-by">{feat.anonymous || !feat.author_name ? "Anonymous" : feat.author_name} · <span className="votes">{feat.votes}</span> votes</div>
            {isTeam && <div className="stage-mod"><button className="btn sm" onClick={() => moderate(feat, { status: "answered", featured: false })}>Answered</button><button className="btn sm ghost" onClick={() => moderate(feat, { featured: false })}>Back to list</button></div>}
          </div>
        )}
        <ol className="stage-list">
          {rest.map((q) => (
            <li key={q.id} className={fresh.has(q.id) ? "fresh" : ""}>
              <span className="votes">{q.votes}</span>
              <span className="body">{q.body}<span className="stage-by">{q.anonymous || !q.author_name ? "Anonymous" : q.author_name}</span></span>
              {isTeam && <span className="stage-mod"><button className="btn sm" onClick={() => moderate(q, { featured: true })}>Show big</button><button className="btn sm ghost" onClick={() => moderate(q, { status: "answered" })}>Answered</button><button className="btn sm ghost" onClick={() => moderate(q, { status: "hidden" })}>Hide</button></span>}
            </li>
          ))}
        </ol>
        {!open.length && <p className="stage-empty">Scan the code and <em>ask the first question.</em></p>}
      </div>

      <aside className="stage-join">
        <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
        <div className="stage-join-t">Scan to ask <em>and upvote</em></div>
        <div className="cta-box">{joinShort}</div>
      </aside>

      <div className="stage-bar" role="toolbar" aria-label="Event mode controls">
        {isTeam ? (
          <>
            {rec === "idle" && <button className="btn primary" onClick={start}><span className="dot" /> Start recording</button>}
            {rec === "recording" && (
              <>
                <button className="btn" onClick={stop}>■ Stop</button>
                <span className="mono">{fmtDur(secs)}</span>
                <span className="meter" aria-label="Mic level"><span style={{ width: `${Math.round(level * 100)}%` }} /></span>
                <span className="muted small">Keep this tab open. The recording is saved on this laptop as it goes.</span>
              </>
            )}
            {(rec === "stopped" || rec === "saving") && blob && (
              <>
                <input className="search" value={recTitle} onChange={(e) => setRecTitle(e.target.value)} aria-label="Recording title" style={{ flex: "1 1 240px" }} />
                <input className="search" value={speaker} onChange={(e) => setSpeaker(e.target.value)} placeholder="Speaker(s)" aria-label="Speakers" style={{ flex: "0 1 180px" }} />
                <span className="mono small">{fmtDur(secs)} · {(blob.size / 1e6).toFixed(1)} MB</span>
                <button className="btn primary" onClick={save} disabled={rec === "saving"}>{rec === "saving" ? "Uploading…" : "Save to event"}</button>
                <button className="btn" onClick={download}>Download copy</button>
                <button className="btn ghost" onClick={discard}>Discard</button>
              </>
            )}
            {rec === "saved" && (
              <>
                <span className="ok">Saved to the event page.</span>
                <Link className="btn" href={`/events/${slug}#talks`} target="_blank">View it ↗</Link>
                <button className="btn" onClick={() => { setRec("idle"); setBlob(null); setSecs(0); }}>Record another</button>
              </>
            )}
            {leftover && rec === "idle" && <button className="btn" onClick={() => recover(leftover)}>Recover unsaved recording ({fmtDur(leftover.seconds)})</button>}
          </>
        ) : <span className="muted small">Sign in with a Kleros account to record and moderate.</span>}
        <span style={{ flex: 1 }} />
        <button className="btn ghost" onClick={fullscreen}>Full screen</button>
        <Link className="btn ghost" href={`/events/${slug}`}>Exit</Link>
        {err && <div className="note" style={{ flexBasis: "100%" }}>{err}</div>}
      </div>
    </div>
  );
}
