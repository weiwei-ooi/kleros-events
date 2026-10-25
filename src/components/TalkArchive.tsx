"use client";
import { useState } from "react";
import type { EventRow, Material, MaterialKind } from "@/lib/types";
import MaterialRow from "./MaterialRow";

const KINDS: [string, string][] = [["", "Everything"], ["talk", "Talks"], ["slides", "Slides"], ["video", "Video"], ["audio", "Audio"], ["image", "Photos"], ["social", "Posts & links"]];

export default function TalkArchive({ materials, events }: { materials: Material[]; events: Pick<EventRow, "id" | "slug" | "title" | "city">[] }) {
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const byId = Object.fromEntries(events.map((e) => [e.id, e]));
  const list = materials.filter((m) => {
    if (kind === "social" ? !["social", "link", "doc"].includes(m.kind) : kind && m.kind !== (kind as MaterialKind)) return false;
    if (q) { const e = byId[m.event_id]; if (![m.title, m.speaker, e?.title, e?.city].join(" ").toLowerCase().includes(q.toLowerCase())) return false; }
    return true;
  }).sort((a, b) => (a.kind === "talk") === (b.kind === "talk") ? b.created_at.localeCompare(a.created_at) : a.kind === "talk" ? -1 : 1);
  return (
    <>
      <div className="filters">
        <div className="seg" role="group" aria-label="Type">{KINDS.map(([v, l]) => <button key={v} aria-pressed={kind === v} onClick={() => setKind(v)}>{l}</button>)}</div>
        <input className="search" type="search" placeholder="Search titles, speakers, events…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search archive" />
      </div>
      <div className="lib">
        {list.map((m) => <MaterialRow key={m.id} m={m} eventTitle={byId[m.event_id]?.title} eventSlug={byId[m.event_id]?.slug} />)}
        {!list.length && <div className="empty"><b>Nothing here yet</b>Talks, slides and recordings appear here after each event.</div>}
      </div>
    </>
  );
}
