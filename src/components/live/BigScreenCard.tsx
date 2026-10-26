"use client";
import { useState } from "react";
import type { Question } from "@/lib/types";
import ScreenView, { shortUrl } from "./ScreenView";
import { SCREEN_MODES, type ScreenMode } from "./useScreenMode";

export default function BigScreenCard({ slug, title, joinUrl, qr, mode, setMode, live, error, questions, fresh }: {
  slug: string; title: string; joinUrl: string; qr: string; mode: ScreenMode; setMode: (m: ScreenMode) => void;
  live: boolean; error: string; questions: Question[]; fresh: Set<string>;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try { await navigator.clipboard.writeText(joinUrl); }
    catch {
      const i = document.createElement("textarea"); i.value = joinUrl; document.body.appendChild(i); i.select();
      document.execCommand("copy"); i.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="con-panel bs" aria-labelledby="bs-h">
      <div className="con-panel-h">
        <h2 id="bs-h">Big screen</h2>
        <span className={`con-live ${live ? "" : "off"}`} title={live ? "The screen follows changes instantly" : "Live updates paused; the screen checks every 15 seconds"}>
          <span className="pip" />{live ? "Synced" : "Reconnecting"}
        </span>
      </div>

      <div className="seg bs-modes" role="group" aria-label="What the big screen shows">
        {SCREEN_MODES.map((m) => <button key={m.id} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>)}
      </div>

      <div className="bs-preview" aria-label="Preview of the big screen">
        <ScreenView preview title={title} joinUrl={joinUrl} qr={qr} mode={mode} questions={questions} fresh={fresh} />
      </div>

      <a className="btn primary bs-open" href={`/events/${slug}/screen`} target={`kleros-screen-${slug}`} rel="noopener">Open big screen</a>
      <p className="muted small bs-help">Drag the new window to the projector, then double-click it for full screen.</p>

      <div className="bs-join">
        <span className="lbl">Join link for phones</span>
        <div className="bs-join-row">
          <a className="mono bs-url" href={joinUrl} target="_blank" rel="noopener">{shortUrl(joinUrl)}</a>
          <button className="btn sm" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {error && <div className="note" role="alert">{error}</div>}
    </section>
  );
}
