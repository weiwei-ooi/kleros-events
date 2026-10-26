"use client";
import { useState } from "react";
import type { Question } from "@/lib/types";
import ScreenView, { shortUrl } from "./ScreenView";
import type { ScreenMode } from "./useScreenMode";

/** Preview of the projector and the join link. The mode switch lives in the console header. */
export default function BigScreenCard({ title, joinUrl, qr, mode, live, error, questions, fresh }: {
  title: string; joinUrl: string; qr: string; mode: ScreenMode;
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

      <div className="bs-preview" aria-label="Preview of the big screen">
        <ScreenView preview title={title} joinUrl={joinUrl} qr={qr} mode={mode} questions={questions} fresh={fresh} />
      </div>

      <p className="muted small bs-help">The Open big screen button at the top opens this view in a new window. Drag it to the projector, then double-click it for full screen.</p>

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
