import Link from "next/link";
import type { EventRow, Material, MaterialKind } from "@/lib/types";
import { fmtDur, fmtRange, fmtSize, plural } from "@/lib/format";
import Thumb from "./Thumb";
import GenCover from "./Cover";

const KIND: Record<string, string> = { talk: "TALK", slides: "PDF", audio: "AUD", video: "VID", doc: "DOC", image: "IMG", link: "URL", social: "POST" };

export function fileUrl(path: string | null | undefined) {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/materials/${path}`;
}

// Talks people can sit down and watch: slide-synced talks and video recordings.
export const isWatchable = (m: Pick<Material, "kind">) => m.kind === "talk" || m.kind === "video";

export const driveId = (url: string | null | undefined) =>
  url?.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/)?.[1];
export const youtubeId = (url: string | null | undefined) =>
  url?.match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)?.[1];

/** A preview image for a video, when the link points somewhere that has one. */
export function videoThumb(m: Pick<Material, "kind" | "url">) {
  if (m.kind !== "video") return null;
  const d = driveId(m.url);
  if (d) return `https://drive.google.com/thumbnail?id=${d}&sz=w640`;
  const y = youtubeId(m.url);
  if (y) return `https://i.ytimg.com/vi/${y}/hqdefault.jpg`;
  return null;
}

/** How the archive and the event page group materials, in display order. */
export const MATERIAL_GROUPS: { label: string; kinds: MaterialKind[] }[] = [
  { label: "Slides", kinds: ["slides"] },
  { label: "Audio", kinds: ["audio"] },
  { label: "Documents", kinds: ["doc"] },
  { label: "Photos", kinds: ["image"] },
  { label: "Links and posts", kinds: ["link", "social"] },
];

type EventRef = Pick<EventRow, "slug" | "title" | "starts_on">;

/** A watchable talk: preview, title, speaker, event and a clear Watch action. */
export function TalkCard({ m, event, note }: { m: Material; event?: EventRef; note?: string }) {
  const href = `/talks/${m.id}`;
  const detail = m.kind === "talk" ? (m.pages ? plural(m.pages, "slide") + " with audio" : "Slides with audio") : "Video";
  return (
    <article className="card talk">
      <Link className="cover" href={href} aria-label={`Watch ${m.title}`} tabIndex={-1}>
        <Thumb src={videoThumb(m)} fallback={
          <GenCover seed={event?.slug ?? m.event_id} className="talk-gen" big={m.speaker ?? undefined} small={m.kind === "talk" ? "Talk with slides" : "Recording"}>
            <span className="play">▶</span>
          </GenCover>
        } />
        {m.duration_seconds ? <span className="dur mono">{fmtDur(m.duration_seconds)}</span> : null}
      </Link>
      <div className="body">
        <h3><Link href={href}>{m.title}</Link></h3>
        {m.speaker && <div className="who">{m.speaker}</div>}
        {event && <Link className="sub" href={`/events/${event.slug}`}>{event.title} · {fmtRange(event.starts_on)}</Link>}
        {note && <div className="sub">{note}</div>}
        <div className="foot">
          <Link className="btn sm primary" href={href}>▶ Watch</Link>
          <span>{detail}</span>
        </div>
      </div>
    </article>
  );
}

/**
 * One archive row, the same shape for every kind: icon or thumbnail, title, speaker and
 * details, and one right-aligned action (Watch, Slides or Open).
 */
export function ArchiveRow({ m, eventSlug }: { m: Material; eventSlug: string }) {
  const file = m.url || fileUrl(m.file_path);
  const detail = isWatchable(m)
    ? [m.kind === "talk" ? (m.pages ? plural(m.pages, "slide") + " with audio" : "Slides with audio") : "Video", m.duration_seconds ? fmtDur(m.duration_seconds) : ""]
    : [m.kind === "link" || m.kind === "social" ? hostOf(m.url) : "", m.kind === "audio" && m.duration_seconds ? fmtDur(m.duration_seconds) : "", fmtSize(m.size_bytes)];
  const sub = [m.speaker, ...detail].filter(Boolean).join(" · ");
  const thumb = videoThumb(m);
  let action: React.ReactNode;
  if (isWatchable(m)) action = <Link className="btn sm primary" href={`/talks/${m.id}`}>▶ Watch</Link>;
  else if (m.kind === "slides" && m.file_path) action = <Link className="btn sm" href={`/talks/${m.id}`}>Slides</Link>;
  else if (m.kind === "slides" && m.url) action = <a className="btn sm" href={m.url} target="_blank" rel="noopener">Slides ↗</a>;
  else if (file) action = <a className="btn sm" href={file} target="_blank" rel="noopener">Open ↗</a>;
  else action = <Link className="btn sm" href={`/events/${eventSlug}`}>Open</Link>;
  return (
    <div className="mrow arow">
      {m.kind === "image" && m.file_path
        // eslint-disable-next-line @next/next/no-img-element
        ? <span className="ico pic"><img src={fileUrl(m.file_path)} alt="" loading="lazy" /></span>
        : thumb
          // eslint-disable-next-line @next/next/no-img-element
          ? <span className="ico pic"><img src={thumb} alt="" loading="lazy" referrerPolicy="no-referrer" /></span>
          : <span className={`ico ${m.kind}`} aria-hidden>{isWatchable(m) ? "▶" : KIND[m.kind] ?? "FILE"}</span>}
      <div style={{ minWidth: 0 }}>
        <div className="t">{m.title}</div>
        {sub && <div className="s">{sub}</div>}
      </div>
      <div className="acts">{action}</div>
    </div>
  );
}

/** A compact row for slides, audio, photos, documents, links and posts. */
export default function MaterialRow({ m, eventTitle, eventSlug }: { m: Material; eventTitle?: string; eventSlug?: string }) {
  const href = m.url || fileUrl(m.file_path);
  const sub = [m.speaker,
    m.kind === "talk" ? `${m.pages ?? "?"} slides${m.duration_seconds ? " · " + fmtDur(m.duration_seconds) : ""}` : "",
    m.kind !== "talk" ? fmtSize(m.size_bytes) : "",
    m.kind === "link" || m.kind === "social" ? hostOf(m.url) : ""].filter(Boolean).join(" · ");
  return (
    <div className="mrow">
      {m.kind === "image" && m.file_path
        // eslint-disable-next-line @next/next/no-img-element
        ? <a className="ico pic" href={fileUrl(m.file_path)} target="_blank" rel="noopener"><img src={fileUrl(m.file_path)} alt="" loading="lazy" /></a>
        : <div className={`ico ${m.kind}`} aria-hidden>{KIND[m.kind] ?? "FILE"}</div>}
      <div style={{ minWidth: 0 }}>
        <div className="t">{m.title}</div>
        {(sub || eventTitle) && (
          <div className="s">
            {sub}
            {sub && eventTitle && " · "}
            {eventTitle && (eventSlug ? <Link href={`/events/${eventSlug}`}>{eventTitle}</Link> : eventTitle)}
          </div>
        )}
        {m.kind === "audio" && m.file_path && <audio controls preload="none" src={fileUrl(m.file_path)} />}
      </div>
      <div className="acts">
        {isWatchable(m) && <Link className="btn sm primary" href={`/talks/${m.id}`}>▶ Watch</Link>}
        {m.kind === "audio" && m.file_path && <Link className="btn sm" href={`/talks/${m.id}`}>Transcript</Link>}
        {m.kind === "slides" && m.file_path && <Link className="btn sm" href={`/talks/${m.id}`}>View slides</Link>}
        {m.kind === "slides" && !m.file_path && m.url && <a className="btn sm" href={m.url} target="_blank" rel="noopener">View slides ↗</a>}
        {!isWatchable(m) && m.kind !== "slides" && !(m.kind === "audio" && m.file_path) && href && <a className="btn sm" href={href} target="_blank" rel="noopener">Open ↗</a>}
      </div>
    </div>
  );
}

function hostOf(url: string | null) {
  if (!url) return "";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}
