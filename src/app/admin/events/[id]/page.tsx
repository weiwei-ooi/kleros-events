import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeam } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabase/server";
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
  return (
    <div className="wrap page stack" style={{ gap: 28 }}>
      <div className="row-flex">
        <div><Link href="/admin" className="eyebrow" style={{ textDecoration: "none" }}>← Events desk</Link><h1 style={{ marginTop: 8 }}>{e.title}</h1></div>
        <span style={{ flex: 1 }} />
        <Link className="btn" href={`/events/${e.slug}`} target="_blank">View public page ↗</Link>
        <Link className="btn" href={`/events/${e.slug}/live`} target="_blank">Big screen ↗</Link>
      </div>
      <section className="stack"><h2>Talks &amp; materials</h2><MaterialsManager event={e} initial={(materials.data ?? []) as Material[]} /></section>
      <section className="stack"><h2>Kleros team at this event</h2><TeamPicker eventId={id} roster={(roster.data ?? []) as TeamMember[]} initial={team.data ?? []} /></section>
      <section className="stack"><h2>Agenda</h2><AgendaEditor eventId={id} initial={(agenda.data ?? []) as AgendaItem[]} /></section>
      <section className="stack"><h2>Details</h2><EventForm event={e} /></section>
    </div>
  );
}
