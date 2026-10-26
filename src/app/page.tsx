import Link from "next/link";
import { listEvents, listMaterials, eventCounts } from "@/lib/data";
import { isPast, newestFirst, soonestFirst } from "@/lib/format";
import type { EventRow } from "@/lib/types";
import { LUMA_URL } from "@/lib/kleros";
import EventCard from "@/components/EventCard";
import { TalkCard, isWatchable } from "@/components/MaterialRow";
import PromoStrip from "@/components/PromoStrip";
import SetupNotice from "@/components/SetupNotice";

export const revalidate = 60;

/**
 * Takes events in order until two rows of the three-column grid are full. A card with a
 * cover spans two rows (see globals.css), so it uses two slots.
 */
function twoRows(list: EventRow[], slots = 6) {
  const out: EventRow[] = [];
  let used = 0;
  for (const e of list) {
    const cost = e.cover_path ? 2 : 1;
    if (used + cost > slots) break;
    out.push(e); used += cost;
    if (used === slots) break;
  }
  return out;
}

export default async function Home() {
  const [events, materials, counts] = await Promise.all([listEvents(), listMaterials(), eventCounts()]);
  const upcoming = events.filter((e) => !isPast(e)).sort(soonestFirst);
  const recent = twoRows(events.filter(isPast).sort(newestFirst));
  const byId = Object.fromEntries(events.map((e) => [e.id, e]));
  // Talks from events the visitor can see, newest event first.
  const talks = materials.filter((m) => isWatchable(m) && byId[m.event_id])
    .sort((a, b) => newestFirst(byId[a.event_id], byId[b.event_id]) || b.created_at.localeCompare(a.created_at));
  const n = (id: string, f: (k: string) => boolean) => materials.filter((m) => m.event_id === id && f(m.kind)).length;
  const talkCount = (id: string) => n(id, (k) => k === "talk" || k === "video");
  const itemCount = (id: string) => n(id, () => true);
  const cities = new Set(events.filter((e) => e.city).map((e) => e.city)).size;

  return (
    <div className="wrap">
      <SetupNotice />
      <section className="intro">
        <div className="eyebrow">Kleros Events</div>
        <h1>Where Kleros shows up, <em>and what was said there.</em></h1>
        <p className="lede">The events Kleros hosts, sponsors and speaks at. Find the next one, rewatch past talks with their slides, and ask the speakers questions.</p>
        <div className="row-flex actions">
          <a className="btn primary" href={LUMA_URL} target="_blank" rel="noopener">Follow Kleros on Luma ↗</a>
          <Link className="btn" href="/events">Browse all events</Link>
        </div>
        {events.length > 0 && (
          <dl className="facts">
            <div><dt>Upcoming</dt><dd>{upcoming.length}</dd></div>
            <div><dt>Events on record</dt><dd>{events.length}</dd></div>
            <div><dt>Recorded talks</dt><dd>{talks.length}</dd></div>
            {cities > 0 && <div><dt>Cities</dt><dd>{cities}</dd></div>}
          </dl>
        )}
      </section>

      <section className="block">
        <div className="section-h"><h2>Coming up</h2><Link href="/events?when=upcoming">All upcoming →</Link></div>
        {upcoming.length
          ? <div className="grid">{twoRows(upcoming).map((e) => <EventCard key={e.id} e={e} talks={talkCount(e.id)} materials={itemCount(e.id)} going={counts[e.id]?.going} />)}</div>
          : <p className="quiet-empty">No upcoming events announced yet. New ones are posted on <a href={LUMA_URL} target="_blank" rel="noopener">Luma</a> first.</p>}
      </section>

      {recent.length > 0 && (
        <section className="block">
          <div className="section-h"><h2>Recent events</h2><Link href="/events?when=past">All past events →</Link></div>
          <div className="grid">{recent.map((e) => <EventCard key={e.id} e={e} talks={talkCount(e.id)} materials={itemCount(e.id)} />)}</div>
        </section>
      )}

      <section className="block">
        <div className="section-h"><h2>Latest talks</h2>{talks.length > 0 && <Link href="/talks">All talks →</Link>}</div>
        {talks.length
          ? <div className="grid">{talks.slice(0, 6).map((m) => <TalkCard key={m.id} m={m} event={byId[m.event_id]} />)}</div>
          : <p className="quiet-empty">Talks appear here with their slides once the team uploads them after an event.</p>}
      </section>

      <PromoStrip />
    </div>
  );
}
