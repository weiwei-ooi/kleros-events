import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvent, eventCounts } from "@/lib/data";
import { fmtRange, isPast, place, plural } from "@/lib/format";
import { ROLE_LABEL, productsFor } from "@/lib/kleros";
import { statusLabel } from "@/components/EventCard";
import MaterialRow, { MATERIAL_GROUPS, TalkCard, fileUrl, isWatchable } from "@/components/MaterialRow";
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
  const isTeam = !!profile?.is_team;
  const status = statusLabel(e);
  const talks = materials.filter((m) => isWatchable(m));
  const groups = MATERIAL_GROUPS.map((g) => ({ ...g, items: materials.filter((m) => g.kinds.includes(m.kind)) })).filter((g) => g.items.length);
  const otherCount = groups.reduce((s, g) => s + g.items.length, 0);
  const c = counts[e.id] ?? { going: 0, attended: 0 };
  const products = productsFor(e.topics);
  const booker = team.map((t) => t.team_members).find((m) => m?.calendar_url);
  const time = e.start_time ? `${e.start_time.slice(0, 5)}${e.timezone ? ` ${e.timezone}` : ""}` : "";
  const where = [e.venue, place(e)].filter(Boolean).join(", ");
  const hasAbout = !!(e.description || e.recap);
  const ticketLabel = e.url && /luma\.com|lu\.ma/.test(e.url) ? "RSVP on Luma" : "Get tickets";

  const sections = [
    hasAbout && ["about", "About"],
    talks.length > 0 && ["talks", `Talks (${talks.length})`],
    otherCount > 0 && ["materials", `Slides & links (${otherCount})`],
    ["ask", "Ask the speaker"],
    team.length > 0 && ["team", "Kleros team"],
    agenda.length > 0 && ["agenda", "Agenda"],
    ["meet", "Meet Kleros"],
  ].filter(Boolean) as [string, string][];

  return (
    <div className="wrap">
      <header className={e.cover_path ? "ev-head with-cover" : "ev-head"}>
        <div className="ev-title">
          <Link className="back" href="/events">← All events</Link>
          <div className="labels">
            <span className="role">{ROLE_LABEL[e.kleros_role]}</span>
            <span>{e.event_type}</span>
            {status ? <span className={`pill ${status.cls}`}>{status.text}</span> : past ? <span>Ended</span> : null}
          </div>
          <h1>{e.title}</h1>
          <div className="when-where">
            <span>{fmtRange(e.starts_on, e.ends_on)}{time && ` · ${time}`}</span>
            <span>{where}</span>
          </div>
          {(e.url && !past) || isTeam ? (
            <div className="row-flex">
              {e.url && !past && <a className="btn primary" href={e.url} target="_blank" rel="noopener">{ticketLabel} ↗</a>}
              {isTeam && <Link className="btn" href={`/events/${e.slug}/host`}>Run this event</Link>}
              {isTeam && <Link className="btn ghost" href={`/admin/events/${e.id}`}>Edit</Link>}
            </div>
          ) : null}
          {e.status === "draft" && <div className="note">Draft. Only the Kleros team can see this event until it is published.</div>}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {e.cover_path && <img className="ev-cover" src={fileUrl(e.cover_path)} alt="" />}
      </header>

      <nav className="anchors" aria-label="On this page">
        {sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>

      <div className="detail">
        <div className="sections">
          {hasAbout && (
            <section id="about" className="sec">
              <h2>About</h2>
              {e.recap && (
                <div className="recap">
                  <div className="eyebrow">Recap</div>
                  <p className="desc">{e.recap}</p>
                </div>
              )}
              {e.description && <p className="desc">{e.description}</p>}
            </section>
          )}

          {talks.length > 0 && (
            <section id="talks" className="sec">
              <h2>Talks</h2>
              <div className="grid two-up">{talks.map((m) => <TalkCard key={m.id} m={m} />)}</div>
            </section>
          )}

          {groups.length > 0 && (
            <section id="materials" className="sec">
              <h2>Slides &amp; links</h2>
              {groups.map((g) => (
                <div key={g.label} className="mgroup">
                  <h3 className="sub-h">{g.label}</h3>
                  <div className="lib">{g.items.map((m) => <MaterialRow key={m.id} m={m} />)}</div>
                </div>
              ))}
            </section>
          )}

          <section id="ask" className="sec">
            <h2>Ask the speaker</h2>
            <AskTheSpeaker eventId={e.id} signedIn={!!user} isTeam={isTeam} displayName={profile?.display_name ?? ""} slug={e.slug} />
          </section>

          {team.length > 0 && (
            <section id="team" className="sec">
              <h2>Kleros team</h2>
              <p className="muted small">{past ? "Who was there for Kleros." : "Who will be there for Kleros."}</p>
              <div className="team">
                {team.filter((t) => t.team_members).map(({ team_members: m, part }) => (
                  <div key={m.id} className="person">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <span className="av">{m.avatar_url ? <img src={m.avatar_url} alt="" /> : m.name[0]}</span>
                    <span className="who">
                      <b>{m.name}</b>
                      {(part || m.title) && <span className="muted">{part || m.title}</span>}
                    </span>
                    {m.x_handle && <a className="x" href={`https://x.com/${m.x_handle.replace(/^@/, "")}`} target="_blank" rel="noopener">@{m.x_handle.replace(/^@/, "")}</a>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {agenda.length > 0 && (
            <section id="agenda" className="sec">
              <h2>Agenda</h2>
              <div className="agenda">
                {agenda.map((a) => (
                  <div key={a.id} className="ag">
                    <span className="tm">{a.starts_at?.slice(0, 5)}</span>
                    <div>
                      <div className={a.is_kleros ? "k" : ""} style={{ fontWeight: 600 }}>{a.title}{a.is_kleros && " · Kleros"}</div>
                      {a.speaker && <div className="muted small">{a.speaker}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section id="meet" className="sec">
            <h2>Meet Kleros</h2>
            <div className="panel meet">
              <p>{past
                ? "Missed the team at this one? Send a request anyway. The team follows up on every one."
                : "Book time with the team to talk about integrating Kleros, becoming a juror, or partnering."}</p>
              <div className="row-flex">
                {booker?.calendar_url && <a className="btn sm primary" href={booker.calendar_url} target="_blank" rel="noopener">Pick a time with {booker.name.split(" ")[0]} ↗</a>}
              </div>
              <MeetingForm eventId={e.id} />
            </div>
            <div className="prods">
              {products.map((p) => (
                <a key={p.name} className="prod" href={p.url} target="_blank" rel="noopener">
                  <b>{p.name}</b>
                  <span className="muted small">{p.pitch}</span>
                  <span className="small">{p.cta} ↗</span>
                </a>
              ))}
            </div>
          </section>
        </div>

        <aside className="side">
          <div className="panel">
            <AttendanceButtons eventId={e.id} past={past} signedIn={!!user} slug={e.slug} />
            <dl className="kv">
              <dt>Date</dt><dd>{fmtRange(e.starts_on, e.ends_on)}</dd>
              {time && <><dt>Time</dt><dd>{time}</dd></>}
              <dt>Place</dt><dd>{where}</dd>
              {e.organizer && <><dt>Organiser</dt><dd>{e.organizer}</dd></>}
              <dt>Kleros</dt><dd>{ROLE_LABEL[e.kleros_role]}</dd>
              <dt>Format</dt><dd>{e.event_type}</dd>
              {e.topics.length > 0 && <><dt>Topics</dt><dd>{e.topics.join(", ")}</dd></>}
              {!past && c.going > 0 && <><dt>Going</dt><dd>{plural(c.going, "person", "people")}</dd></>}
              {past && c.attended > 0 && <><dt>Attended</dt><dd>{plural(c.attended, "person", "people")}</dd></>}
              {e.url && <><dt>{past ? "Event page" : "Tickets"}</dt><dd><a href={e.url} target="_blank" rel="noopener">{past ? "Open ↗" : `${ticketLabel} ↗`}</a></dd></>}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
