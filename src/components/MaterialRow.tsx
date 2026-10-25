import Link from "next/link";
import type { Material } from "@/lib/types";
import { fmtDur, fmtSize } from "@/lib/format";

const KIND: Record<string, string> = { talk: "TALK", slides: "PDF", audio: "AUD", video: "VID", doc: "DOC", image: "IMG", link: "URL", social: "POST" };

export function fileUrl(path: string | null | undefined) {
  if (!path) return "";
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/materials/${path}`;
}

export default function MaterialRow({ m, eventTitle, eventSlug }: { m: Material; eventTitle?: string; eventSlug?: string }) {
  const href = m.url || fileUrl(m.file_path);
  const sub = [eventTitle, m.speaker,
    m.kind === "talk" ? `${m.pages ?? "?"} slides${m.duration_seconds ? " · " + fmtDur(m.duration_seconds) : ""}` : "",
    m.kind !== "talk" ? fmtSize(m.size_bytes) : ""].filter(Boolean).join(" · ");
  return (
    <div className="mrow">
      <div className={`ico ${m.kind}`}>{KIND[m.kind] ?? "FILE"}</div>
      <div style={{ minWidth: 0 }}>
        <div className="t">{m.title}</div>
        <div className="s">{sub}</div>
        {m.kind === "audio" && m.file_path && <audio controls preload="none" src={fileUrl(m.file_path)} />}
        {m.kind === "image" && m.file_path && <img src={fileUrl(m.file_path)} alt={m.title} style={{ maxHeight: 160, borderRadius: 8, marginTop: 6 }} />}
      </div>
      <div className="acts">
        {m.kind === "talk" && <Link className="btn sm primary" href={`/talks/${m.id}`}>▶ Watch talk</Link>}
        {m.kind === "slides" && m.file_path && <Link className="btn sm" href={`/talks/${m.id}`}>View slides</Link>}
        {m.kind !== "talk" && m.kind !== "slides" && href && <a className="btn sm" href={href} target="_blank" rel="noopener">Open</a>}
        {eventSlug && <Link className="btn sm ghost" href={`/events/${eventSlug}`}>Event</Link>}
      </div>
    </div>
  );
}
