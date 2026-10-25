import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEvent, eventCounts } from "@/lib/data";
import { fmtRange, isLive, isPast, place } from "@/lib/format";
import { ROLE_LABEL, productsFor, KLEROS_HOSTED } from "@/lib/kleros";
import { RolePill } from "@/components/EventCard";
import MaterialRow from "@/components/MaterialRow";
import AttendanceButtons from "@/components/AttendanceButtons";
import AskTheSpeaker from "@/components/AskTheSpeaker";
import MeetingForm from "@/components/MeetingForm";
import { currentUser } from "@/lib/supabase/server";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getEvent(slug);
  if (!data) return { title: "Event not found" };
  const e = data.event;
  return { title: e.title, description: `${ROLE_LABEL[e.kleros_role]} · ${fmtRange(e.starts_on, e.ends_on)} · ${place(e)}. ${e.description ?? ""}`.slice(0, 200) };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [data, counts, { user, profile }] = await Promise.all([getEvent(slug), eventCounts(), currentUser()]);
  if (!data) notFound();
  const { event: e, agenda, team, materials } = data;
  const past = isPast(e);
  const talks = materials.filter((m) => m.kind === "talk");
  const other = materials.filter((m) => m.kind !== "talk");
  const c = counts[e.id] ?? { going: 0, attended: 0 };
  const products = productsFor(e.topics);
  const hosted = KLEROS_HOSTED.includes(e.kleros_role);
  const booker = team.map((t) => t.team_members).find((m) => m.calendar_url);

  return (
    <div className="wrap">
      <div className="ev-head">
        <div className="meta">
          <RolePill e={e} />
          <span className="pill plain">{e.event_type}</span>
          {isLive(e) ? <span className="pill live">Happening now</span> : past ? <span className="pill plain">Ended</span> : null}
          {e.is_example && <span className="pill ex">Example</span>}
        </div>
        <h1>{e.title}</h1>
        <div className="mono">{fmtRange(e.starts_on, e.ends_on)}{e.start_time ? ` · ${e.start_time.slice(0, 5)}` : ""}{e.timezone ? ` ${e.timezone}` : ""} · {place(e)}</div>
      </div>

      <nav className="anchors" aria-label="On this page">
        <a href="#about">About</a>
        {team.length > 0 && <a href="#team">Kleros team</a>}
        {agenda.length > 0 && <a href="#agenda">Agenda</a>}
        <a href="#talks">Talks &amp; materials ({materials.length})</a>
        <a href="#ask">Ask the speaker</a>
        <a href="#meet">Meet Kleros</a>
      </nav>

      <div className="detail">
        <div className="stack" style={{ gap: 32 }}>
          <section id="about" className="stack">
            {past && e.recap && <div className="box"><div className="eyebrow">Recap</div><p className="desc">{e.recap}</p></div>}
            <p className={`desc ${e.description ? "" : "muted"}`}>{e.description || "No description yet."}</p>
          </section>

          {team.length > 0 && (
            <section id="team" className="stack">
              <h2>Kleros team {past ? "who were there" : "you can meet"}</h2>
              <div className="team">
                {team.map(({ team_members: m, part }) => (
                  <div key={m.id} className="person">
                    <span className="av">{m.avatar_url ? <img src={m.avatar_url} alt="" /> : m.name[0]}</span>
                    <span><b>{m.name}</b>{(part || m.title) && <span className="muted"> · {part || m.title}</span>}
                      {m.x_handle && <> · <a href={`https://x.com/${m.x_handle.replace(/^@/, "")}`} target="_blank" rel="noopener">@{m.x_handle.replace(/^@/, "")}</a></>}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {agenda.length > 0 && (
            <section id="agenda" className="stack">
              <h2>Agenda</h2>
              <div className="agenda">
                {agenda.map((a) => (
                  <div key={a.id} className="ag">
                    <span className="tm">{a.starts_at?.slice(0, 5)}</span>
                    <div><div className={a.is_kleros ? "k" : ""} style={{ fontWeight: 600 }}>{a.title}{a.is_kleros && " · Kleros"}</div>{a.speaker && <div className="muted small">{a.speaker}</div>}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section id="talks" className="stack">
            <h2>Talks &amp; materials</h2>
            <div className="lib">
              {talks.map((m) => <MaterialRow key={m.id} m={m} />)}
              {other.map((m) => <MaterialRow key={m.id} m={m} />)}
              {!materials.length && <div className="empty"><b>Nothing posted yet</b>{past ? "Slides and recordings are on their way." : "Slides and recordings will be posted here after the event."}</div>}
            </div>
          </section>

          <section id="ask" className="stack">
            <h2>Ask the speaker</h2>
            <AskTheSpeaker eventId={e.id} signedIn={!!user} isTeam={!!profile?.is_team} displayName={profile?.display_name ?? ""} slug={e.slug} />
          </section>
        </div>

        <aside className="stack">
          <div className="counts">
            <div><b className="mono">{c.going}</b><span>going</span></div>
            <div><b className="mono">{c.attended}</b><span>attended</span></div>
            <div><b className="mono">{talks.length}</b><span>talks</span></div>
          </div>
          <AttendanceButtons eventId={e.id} past={past} signedIn={!!user} slug={e.slug} />
          <dl className="kv">
            {e.organizer && <><dt>Organizer</dt><dd>{e.organizer}</dd></>}
            <dt>Kleros</dt><dd>{ROLE_LABEL[e.kleros_role]}</dd>
            {e.venue && <><dt>Venue</dt><dd>{e.venue}</dd></>}
            {e.topics.length > 0 && <><dt>Topics</dt><dd>{e.topics.join(", ")}</dd></>}
            {e.url && <><dt>Tickets</dt><dd><a href={e.url} target="_blank" rel="noopener">Event page ↗</a></dd></>}
          </dl>
          <section id="meet" className="meet">
            <b>{past ? "Missed the team?" : hosted ? "Hosted by Kleros" : "Meet Kleros here"}</b>
            <span>{past ? "Get in touch anyway. We follow up on every request." : "Book time with the team to talk about integrating Kleros, becoming a juror, or partnering."}</span>
            {booker?.calendar_url && <a className="btn sm" href={booker.calendar_url} target="_blank" rel="noopener" style={{ color: "var(--fg)" }}>Pick a time with {booker.name.split(" ")[0]} ↗</a>}
            <MeetingForm eventId={e.id} />
          </section>
          {products.map((p) => (
            <div key={p.name} className="prod">
              <div className="eyebrow">Relevant to this event</div>
              <b>{p.name}</b>
              <span className="muted small">{p.pitch}</span>
              <a href={p.url} target="_blank" rel="noopener">{p.cta} →</a>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
