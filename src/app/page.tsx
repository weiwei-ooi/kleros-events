import Link from "next/link";
import { listEvents, listMaterials, eventCounts } from "@/lib/data";
import { fmtRange, isLive, isPast, place } from "@/lib/format";
import { ROLE_LABEL, LUMA_URL } from "@/lib/kleros";
import EventCard from "@/components/EventCard";
import MaterialRow, { isWatchable } from "@/components/MaterialRow";
import PromoStrip from "@/components/PromoStrip";
import SetupNotice from "@/components/SetupNotice";

export const revalidate = 60;

export default async function Home() {
  const [events, materials, counts] = await Promise.all([listEvents(), listMaterials(), eventCounts()]);
  const upcoming = events.filter((e) => !isPast(e));
  const next = upcoming[0];
  const recent = events.filter(isPast).sort((a, b) => b.starts_on.localeCompare(a.starts_on)).slice(0, 3);
  const talks = materials.filter((m) => isWatchable(m));
  const talkCount = (id: string) => talks.filter((m) => m.event_id === id).length;
  const byId = Object.fromEntries(events.map((e) => [e.id, e]));
  return (
    <div className="wrap">
      <SetupNotice />
      <div className="hero">
        <div>
          <div className="eyebrow">Kleros on stage and on the road</div>
          <h1>Where Kleros shows up, <em>and what was said there.</em></h1>
          <p>The events Kleros hosts, sponsors and speaks at, from Chiang Mai to Mumbai. Rewatch the talks with their slides, ask the speakers questions, and meet the team at the next one.</p>
          <div className="stats">
            <div className="stat"><b>{upcoming.length}</b><span>upcoming</span></div>
            <div className="stat"><b>{events.length}</b><span>events on record</span></div>
            <div className="stat"><b>{talks.length}</b><span>recorded talks</span></div>
            <div className="stat"><b>{new Set(events.filter((e) => e.city).map((e) => e.city)).size}</b><span>cities</span></div>
          </div>
          <div className="row-flex" style={{ marginTop: 24 }}>
            <a className="btn cta" href={LUMA_URL} target="_blank" rel="noopener">Follow Kleros on Luma</a>
            <Link className="btn" href="/talks">Watch the talks</Link>
          </div>
        </div>
        {next && (
          <Link className="next" href={`/events/${next.slug}`}>
            <span className="eyebrow">{isLive(next) ? "Happening now" : "Next up"}</span>
            <h3>{next.title}</h3>
            <span className="mono small">{fmtRange(next.starts_on, next.ends_on)} · {place(next)}</span>
            <span className="small" style={{ opacity: 0.8 }}>{ROLE_LABEL[next.kleros_role]} →</span>
          </Link>
        )}
      </div>
      <PromoStrip />
      <div className="section-h"><h2>Coming up</h2><Link href="/events">All events →</Link></div>
      <div className="grid">
        {upcoming.slice(0, 6).map((e) => <EventCard key={e.id} e={e} talks={talkCount(e.id)} going={counts[e.id]?.going} />)}
        {!upcoming.length && <div className="empty" style={{ gridColumn: "1/-1" }}><b>No upcoming events yet</b>Follow Kleros on X to hear about the next one.</div>}
      </div>
      <div className="section-h"><h2>Recently</h2><Link href="/events?when=past">Past events →</Link></div>
      <div className="grid">
        {recent.map((e) => <EventCard key={e.id} e={e} talks={talkCount(e.id)} />)}
      </div>
      <div className="section-h"><h2>Latest talks</h2><Link href="/talks">Talk archive →</Link></div>
      <div className="lib">
        {talks.slice(0, 5).map((m) => <MaterialRow key={m.id} m={m} eventTitle={byId[m.event_id]?.title} eventSlug={byId[m.event_id]?.slug} />)}
        {!talks.length && <div className="empty"><b>No talks recorded yet</b>Talks appear here with their slides as soon as the team uploads them.</div>}
      </div>
    </div>
  );
}
