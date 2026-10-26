import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMaterial } from "@/lib/data";
import { fmtDur, fmtRange } from "@/lib/format";
import TalkPlayer from "@/components/TalkPlayer";
import { driveId, fileUrl, youtubeId } from "@/components/MaterialRow";
import PromoStrip from "@/components/PromoStrip";
import { currentUser } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const m = await getMaterial((await params).id);
  return m ? { title: m.title, description: `${m.speaker ? m.speaker + " at " : ""}${m.events.title}. Slides and recording.` } : { title: "Talk not found" };
}

export default async function TalkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [m, { user }] = await Promise.all([getMaterial(id), currentUser()]);
  if (!m || !(m.kind === "talk" || m.kind === "slides" || m.kind === "video")) notFound();
  const pdf = fileUrl(m.kind === "talk" ? m.pdf_path : m.file_path);
  const drive = driveId(m.url);
  const yt = youtubeId(m.url);
  return (
    <div className="wrap page stack">
      <div>
        <Link href={`/events/${m.events.slug}`} className="back">← {m.events.title} · {fmtRange(m.events.starts_on)}</Link>
        <h1 className="talk-title">{m.title}</h1>
        <div className="muted small">{[m.speaker, m.pages ? `${m.pages} slides` : "", m.duration_seconds ? fmtDur(m.duration_seconds) : ""].filter(Boolean).join(" · ")}</div>
      </div>
      {m.kind === "video" ? (
        <div className="video">
          {drive
            ? <iframe src={`https://drive.google.com/file/d/${drive}/preview`} allow="autoplay; fullscreen" allowFullScreen title={m.title} />
            : yt ? <iframe src={`https://www.youtube-nocookie.com/embed/${yt}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={m.title} />
            : m.file_path ? <video controls preload="metadata" src={fileUrl(m.file_path)} />
            : m.url ? <a className="btn" href={m.url} target="_blank" rel="noopener">Open video ↗</a> : null}
        </div>
      ) : (
        <TalkPlayer materialId={m.id} pdfUrl={pdf} audioUrl={m.kind === "talk" ? fileUrl(m.audio_path) : undefined} marks={m.marks} notes={m.notes} signedIn={!!user} />
      )}
      <PromoStrip lead="Liked this talk?" />
    </div>
  );
}
