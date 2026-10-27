"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fmtDur } from "@/lib/format";
import { seekTo, useMediaTime } from "@/lib/transcript/client";

/**
 * A talk page opened at a moment (/talks/id?t=754, as the assistant links to): one button to
 * play from there. Browsers only start playback after a click, so it does not jump on its own.
 * The button stays until the recording is playing at that moment, so a click made before the
 * player was ready can be repeated.
 */
export default function StartAt() {
  const params = useSearchParams();
  const t = Math.floor(Number(params.get("t")));
  const media = useMediaTime();
  const [asked, setAsked] = useState(false);
  const [gone, setGone] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { setAsked(false); setGone(false); }, [t]);
  useEffect(() => {
    if (!asked || gone || !media.playing || Math.abs(media.t - t) > 8) return;
    // if the button still has keyboard focus, hand it to a visible control of the player
    if (document.activeElement === btn.current) {
      const target = Array.from(document.querySelectorAll<HTMLElement>("[data-player] video[controls], [data-player] audio[controls], [data-player] iframe, [data-player] button"))
        .find((el) => el.getClientRects().length > 0);
      target?.focus({ preventScroll: true });
    }
    setGone(true);
  }, [asked, gone, media, t]);
  if (!params.has("t") || !Number.isFinite(t) || t < 0 || gone) return null;
  return (
    <div className="start-at">
      <button type="button" ref={btn} className="btn sm primary" onClick={() => { seekTo(t); setAsked(true); }}>▶ Play from {fmtDur(t)}</button>
      <span className="muted small">You followed a link to this moment of the recording.</span>
    </div>
  );
}
