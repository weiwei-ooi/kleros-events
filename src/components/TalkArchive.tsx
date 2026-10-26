"use client";
import { useState } from "react";
import Link from "next/link";
import type { EventRow, Material, MaterialKind } from "@/lib/types";
import { fmtRange, newestFirst, place, plural } from "@/lib/format";
import MaterialRow, { TalkCard, isWatchable } from "./MaterialRow";

type Tab = "all" | "talks" | "slides" | "posts";
const TABS: { v: Tab; label: string; kinds: MaterialKind[] | null }[] = [
  { v: "all", label: "All", kinds: null },
  { v: "talks", label: "Talks", kinds: ["talk", "video", "audio"] },
  { v: "slides", label: "Slides", kinds: ["slides", "doc"] },
  { v: "posts", label: "Photos and posts", kinds: ["image", "social", "link"] },
];

type Ev = Pick<EventRow, "id" | "slug" | "title" | "city" | "country" | "starts_on">;

export default function TalkArchive({ materials, events }: { materials: Material[]; events: Ev[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const byId = Object.fromEntries(events.map((e) => [e.id, e]));
  const kinds = TABS.find((t) => t.v === tab)!.kinds;
  const needle = q.trim().toLowerCase();

  const list = materials.filter((m) => {
    const e = byId[m.event_id];
    if (!e) return false;
    if (kinds && !kinds.includes(m.kind)) return false;
    if (needle && ![m.title, m.speaker, e.title, e.city, e.country].join(" ").toLowerCase().includes(needle)) return false;
    return true;
  });
  const groups = [...new Set(list.map((m) => m.event_id))].map((id) => byId[id]).sort(newestFirst)
    .map((e) => ({ e, items: list.filter((m) => m.event_id === e.id).sort((a, b) => a.created_at.localeCompare(b.created_at)) }));
  const tabCount = (t: (typeof TABS)[number]) => materials.filter((m) => byId[m.event_id] && (!t.kinds || t.kinds.includes(m.kind))).length;

  return (
    <div className="browser">
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Type">
          {TABS.map((t) => <button key={t.v} aria-pressed={tab === t.v} onClick={() => setTab(t.v)}>{t.label} <span className="n">{tabCount(t)}</span></button>)}
        </div>
      </div>
      <div className="refine">
        <input className="search" type="search" placeholder="Search by title, speaker or event" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the archive" />
      </div>
      <div className="result-line" role="status">
        <span>{plural(list.length, "item")} from {plural(groups.length, "event")}</span>
        {needle && <button className="link-btn" onClick={() => setQ("")}>Clear search</button>}
      </div>

      {groups.map(({ e, items }) => {
        const watch = items.filter((m) => isWatchable(m));
        const rest = items.filter((m) => !isWatchable(m));
        return (
          <section key={e.id} className="arch-event">
            <header className="arch-h">
              <h2><Link href={`/events/${e.slug}`}>{e.title}</Link></h2>
              <span className="muted small">{fmtRange(e.starts_on)} · {place(e)} · {plural(items.length, "item")}</span>
            </header>
            {watch.length > 0 && <div className="grid">{watch.map((m) => <TalkCard key={m.id} m={m} />)}</div>}
            {rest.length > 0 && <div className="lib">{rest.map((m) => <MaterialRow key={m.id} m={m} />)}</div>}
          </section>
        );
      })}
      {!groups.length && (
        <div className="empty">
          <b>{materials.length ? "Nothing matches" : "Nothing in the archive yet"}</b>
          {materials.length ? "Try another type or a shorter search." : "Talks, slides and recordings appear here after each event."}
        </div>
      )}
    </div>
  );
}
