"use client";
// Players that report their time to the transcript and accept seek requests from it.
import { useEffect, useRef } from "react";
import { emitTime, onSeek } from "@/lib/transcript/client";

/** Native audio or video element, wired to the transcript. Fixes the missing duration of MediaRecorder WebM. */
export function MediaPlayer({ src, kind, title }: { src: string; kind: "audio" | "video"; title: string }) {
  const el = useRef<HTMLMediaElement | null>(null);
  const fixing = useRef(false);
  useEffect(() => onSeek((t) => {
    const m = el.current; if (!m) return;
    m.currentTime = t;
    m.play().catch(() => {});
  }), []);
  const common = {
    src, preload: "metadata" as const, controls: true, "aria-label": title,
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLMediaElement>) => {
      const m = e.currentTarget;
      if (isFinite(m.duration)) return;
      // WebM from MediaRecorder has no duration until the browser has seen its end once
      fixing.current = true;
      const fix = () => { if (!isFinite(m.duration)) return; m.removeEventListener("durationchange", fix); m.currentTime = 0; fixing.current = false; };
      m.addEventListener("durationchange", fix);
      m.currentTime = 1e101;
    },
    onTimeUpdate: (e: React.SyntheticEvent<HTMLMediaElement>) => { if (!fixing.current) emitTime(e.currentTarget.currentTime, !e.currentTarget.paused); },
    onPlay: (e: React.SyntheticEvent<HTMLMediaElement>) => emitTime(e.currentTarget.currentTime, true),
    onPause: (e: React.SyntheticEvent<HTMLMediaElement>) => emitTime(e.currentTarget.currentTime, false),
  };
  return kind === "video"
    ? <div className="video" data-player><video ref={(n) => { el.current = n; }} {...common} /></div>
    : <div className="tx-audio" data-player><audio ref={(n) => { el.current = n; }} {...common} /></div>;
}

// ---------------------------------------------------------------- YouTube

interface YTPlayer { seekTo(t: number, allow: boolean): void; playVideo(): void; getCurrentTime(): number; getPlayerState(): number; destroy(): void }
declare global {
  interface Window { YT?: { Player: new (el: HTMLElement | string, opts: unknown) => YTPlayer }; onYouTubeIframeAPIReady?: () => void }
}

let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => { apiPromise = null; reject(new Error("YouTube player API did not load")); };
    document.head.appendChild(s);
  });
  return apiPromise;
}

/**
 * YouTube embed controlled through the IFrame API, so transcript lines can seek it. If the
 * API cannot load (blocked by an extension, offline), the plain embed still plays.
 */
export function YouTubePlayer({ id, title }: { id: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const player = useRef<YTPlayer | null>(null);
  useEffect(() => {
    let alive = true;
    let poll: ReturnType<typeof setInterval> | undefined;
    loadYouTubeApi().then(() => {
      if (!alive || !frame.current || !window.YT) return;
      player.current = new window.YT.Player(frame.current, {
        events: {
          onStateChange: (e: { data: number }) => {
            const p = player.current; if (!p) return;
            emitTime(p.getCurrentTime(), e.data === 1);
            clearInterval(poll);
            if (e.data === 1) poll = setInterval(() => player.current && emitTime(player.current.getCurrentTime(), true), 500);
          },
        },
      });
    }).catch(() => { /* plain embed keeps working */ });
    const off = onSeek((t) => { const p = player.current; if (!p) return; p.seekTo(t, true); p.playVideo(); });
    return () => { alive = false; off(); clearInterval(poll); };
  }, []);
  return (
    <div className="video" data-player>
      <iframe ref={frame} src={`https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&rel=0`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={title} />
    </div>
  );
}
