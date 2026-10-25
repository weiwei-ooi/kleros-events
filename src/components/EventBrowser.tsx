"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { EventRow, KlerosRole } from "@/lib/types";
import EventCard from "./EventCard";
import { EVENT_TYPES, KLEROS_HOSTED, TOPICS } from "@/lib/kleros";
import { endOf, isPast, todayIso } from "@/lib/format";

type When = "upcoming" | "past" | "month";
type Host = "all" | "hosted" | "participating";

export default function EventBrowser({ events, talkCounts, counts, initialRole, initialWhen }: {
  events: EventRow[]; talkCounts: Record<string, number>; counts: Record<string, { going: number }>; initialRole?: string; initialWhen?: When;
}) {
  const [when, setWhen] = useState<When>(initialWhen ?? "upcoming");
  const [host, setHost] = useState<Host>(initialRole === "host" ? "hosted" : "all");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1, 12); });

  const allTags = useMemo(() => [...new Set([...TOPICS, ...events.flatMap((e) => e.topics)])], [events]);
  const list = events.filter((e) => {
    if (when === "upcoming" && isPast(e)) return false;
    if (when === "past" && !isPast(e)) return false;
    const hosted = KLEROS_HOSTED.includes(e.kleros_role as KlerosRole);
    if (host === "hosted" && !hosted) return false;
    if (host === "participating" && hosted) return false;
    if (type && e.event_type !== type) return false;
    if (tags.length && !e.topics.some((t) => tags.includes(t))) return false;
    if (q) {
      const h = [e.title, e.city, e.country, e.organizer, e.description, e.topics.join(" ")].join(" ").toLowerCase();
      if (!h.includes(q.toLowerCase())) return false;
    }
    return true;
  });
  const sorted = [...list].sort((a, b) => (when === "past" ? b.starts_on.localeCompare(a.starts_on) : a.starts_on.localeCompare(b.starts_on)));
  const y = month.getFullYear(), mo = month.getMonth();
  const shown = when === "month" ? sorted.filter((e) => { const d = new Date(e.starts_on + "T12:00:00"); return d.getFullYear() === y && d.getMonth() === mo; }) : sorted;

  return (
    <>
      <div className="filters">
        <div className="seg" role="group" aria-label="Time">
          {(["upcoming", "past", "month"] as When[]).map((w) => <button key={w} aria-pressed={when === w} onClick={() => setWhen(w)}>{w[0].toUpperCase() + w.slice(1)}</button>)}
        </div>
        <div className="seg" role="group" aria-label="Kleros role">
          <button aria-pressed={host === "all"} onClick={() => setHost("all")}>All</button>
          <button aria-pressed={host === "hosted"} onClick={() => setHost("hosted")}>Kleros-hosted</button>
          <button aria-pressed={host === "participating"} onClick={() => setHost("participating")}>Kleros taking part</button>
        </div>
        <select className="f" value={type} onChange={(e) => setType(e.target.value)} aria-label="Event type">
          <option value="">Any type</option>{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <input className="search" type="search" placeholder="Search events, cities, speakers…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search events" />
      </div>
      <div className="chips">
        {allTags.map((t) => <button key={t} className="chip" aria-pressed={tags.includes(t)} onClick={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])}>{t}</button>)}
      </div>
      {when === "month" && <MonthGrid month={month} setMonth={setMonth} events={list} />}
      <div className="grid">
        {shown.length ? shown.map((e) => <EventCard key={e.id} e={e} talks={talkCounts[e.id]} going={counts[e.id]?.going} />)
          : <div className="empty" style={{ gridColumn: "1/-1" }}><b>{events.length ? "No events match" : "No events on record yet"}</b>{events.length ? "Try another time range or clear the topics." : "The Kleros team adds events here."}</div>}
      </div>
    </>
  );
}

function MonthGrid({ month, setMonth, events }: { month: Date; setMonth: (d: Date) => void; events: EventRow[] }) {
  const y = month.getFullYear(), mo = month.getMonth();
  const first = new Date(y, mo, 1, 12);
  const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); if (i >= 35 && d.getMonth() !== mo) break; days.push(d); }
  const today = todayIso();
  return (
    <div className="month">
      <div className="month-h">
        <button className="btn sm ghost" onClick={() => setMonth(new Date(y, mo - 1, 1, 12))} aria-label="Previous month">‹</button>
        <h3>{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h3>
        <button className="btn sm ghost" onClick={() => setMonth(new Date(y, mo + 1, 1, 12))} aria-label="Next month">›</button>
      </div>
      <div className="cal">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="dow">{d}</div>)}
        {days.map((d) => {
          const iso = d.toISOString().slice(0, 10);
          const evs = events.filter((e) => e.starts_on <= iso && endOf(e) >= iso);
          return (
            <div key={iso} className={`day ${d.getMonth() !== mo ? "out" : ""} ${iso === today ? "today" : ""}`}>
              <span className="n">{d.getDate()}</span>
              {evs.map((e) => <Link key={e.id} href={`/events/${e.slug}`} className={KLEROS_HOSTED.includes(e.kleros_role) ? "" : "p"} title={e.title}>{e.title}</Link>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
