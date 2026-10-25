import Link from "next/link";
import { listEvents, listMaterials, eventCounts } from "@/lib/data";
import { fmtRange, isLive, isPast, place } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/kleros";
import EventCard from "@/components/EventCard";
import MaterialRow from "@/components/MaterialRow";
import PromoStrip from "@/components/PromoStrip";
import SetupNotice from "@/components/SetupNotice";

export const revalidate = 60;

export default async function Home() {
  const [events, materials, counts] = await Promise.all([listEvents(), listMaterials(), eventCounts()]);
  const upcoming = events.filter((e) => !isPast(e));
  const next = upcoming[0];
  const talks = materials.filter((m) => m.kind === "talk");
  const talkCount = (id: string) => talks.filter((m) => m.event_id === id).length;
  const byId = Object.fromEntries(events.map((e) => [e.id, e]));
  return (
    <div className="wrap">
      <SetupNotice />
      <div className="hero">
        <div>
          <div className="eyebrow">Kleros on stage and on the road</div>
          <h1>Every event Kleros hosts or takes part in, with the talks to match.</h1>
          <p>See where the Kleros team is speaking, sponsoring or judging next. Replay talks with the slides synced to the recording, ask the speakers questions, and book time with the team.</p>
          <div className="stats">
            <div className="stat"><b className="mono">{upcoming.length}</b><span>upcoming</span></div>
            <div className="stat"><b className="mono">{events.length}</b><span>events on record</span></div>
            <div className="stat"><b className="mono">{talks.length}</b><span>recorded talks</span></div>
            <div className="stat"><b className="mono">{new Set(events.filter((e) => e.city).map((e) => e.city)).size}</b><span>cities</span></div>
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
      <div className="section-h"><h2>Latest talks</h2><Link href="/talks">Talk archive →</Link></div>
      <div className="lib">
        {talks.slice(0, 5).map((m) => <MaterialRow key={m.id} m={m} eventTitle={byId[m.event_id]?.title} eventSlug={byId[m.event_id]?.slug} />)}
        {!talks.length && <div className="empty"><b>No talks recorded yet</b>Talks appear here with their slides as soon as the team uploads them.</div>}
      </div>
    </div>
  );
}
