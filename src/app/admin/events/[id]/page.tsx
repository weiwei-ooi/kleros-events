import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeam } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { fmtRange, place } from "@/lib/format";
import NotTeam from "@/components/NotTeam";
import EventForm from "@/components/admin/EventForm";
import AgendaEditor from "@/components/admin/AgendaEditor";
import TeamPicker from "@/components/admin/TeamPicker";
import MaterialsManager from "@/components/admin/MaterialsManager";
import type { AgendaItem, EventRow, Material, TeamMember } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { isTeam } = await requireTeam(`/admin/events/${id}`);
  if (!isTeam) return <NotTeam />;
  const sb = await supabaseServer();
  const { data: event } = await sb.from("events").select("*").eq("id", id).maybeSingle();
  if (!event) notFound();
  const [agenda, team, roster, materials] = await Promise.all([
    sb.from("agenda_items").select("*").eq("event_id", id).order("starts_at"),
    sb.from("event_team").select("team_member_id, part").eq("event_id", id),
    sb.from("team_members").select("*").eq("active", true).order("sort"),
    sb.from("materials").select("*").eq("event_id", id).order("created_at"),
  ]);
  const e = event as EventRow;
  const sections = [
    { id: "details", label: "Details" },
    { id: "agenda", label: "Agenda" },
    { id: "team", label: "Kleros team" },
    { id: "materials", label: "Materials" },
  ];

  return (
    <div className="adm-editor">
      <div className="ed-head">
        <div className="wrap">
          <div className="ed-top">
            <div className="ed-title">
              <Link href="/admin" className="small muted ed-back">← Events desk</Link>
              <h1>{e.title}</h1>
              <div className="meta">
                <span>{fmtRange(e.starts_on, e.ends_on)}</span><span aria-hidden>·</span><span>{place(e)}</span>
                {e.status === "draft" ? <span className="pill plain">Draft</span> : <span className="pill live">Published</span>}
              </div>
            </div>
            <div className="ed-acts">
              <Link className="btn primary" href={`/events/${e.slug}/host`}>Run live</Link>
              <Link className="btn" href={`/events/${e.slug}`} target="_blank">View public page ↗</Link>
            </div>
          </div>
          <nav className="ed-anchors" aria-label="Sections">
            {sections.map((s) => <a key={s.id} href={`#${s.id}`}>{s.label}</a>)}
          </nav>
        </div>
      </div>

      <div className="wrap ed-body">
        <section id="details" className="ed-sec">
          <div className="ed-sec-h"><h2>Details</h2><p className="muted small">Title, dates, place, description and the recap shown after the event.</p></div>
          <EventForm event={e} />
        </section>
        <section id="agenda" className="ed-sec">
          <div className="ed-sec-h"><h2>Agenda</h2><p className="muted small">Sessions in order. Kleros sessions are highlighted on the public page.</p></div>
          <AgendaEditor eventId={id} initial={(agenda.data ?? []) as AgendaItem[]} />
        </section>
        <section id="team" className="ed-sec">
          <div className="ed-sec-h"><h2>Kleros team</h2><p className="muted small">Who attends for Kleros. Visitors can ask to meet them.</p></div>
          <TeamPicker eventId={id} roster={(roster.data ?? []) as TeamMember[]} initial={team.data ?? []} />
        </section>
        <section id="materials" className="ed-sec">
          <div className="ed-sec-h"><h2>Materials</h2><p className="muted small">Talks, slides, recordings and links, listed on the event page and in the archive.</p></div>
          <MaterialsManager event={e} initial={(materials.data ?? []) as Material[]} />
        </section>
      </div>
    </div>
  );
}
