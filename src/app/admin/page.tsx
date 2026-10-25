import type { Metadata } from "next";
import Link from "next/link";
import { requireTeam } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { fmtRange, isPast } from "@/lib/format";
import { ROLE_SHORT } from "@/lib/kleros";
import type { EventRow } from "@/lib/types";
import NotTeam from "@/components/NotTeam";
import RequestsTable from "@/components/RequestsTable";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { isTeam } = await requireTeam();
  if (!isTeam) return <NotTeam />;
  const sb = await supabaseServer();
  const [ev, mats, reqs, counts] = await Promise.all([
    sb.from("events").select("*").order("starts_on", { ascending: false }),
    sb.from("materials").select("event_id, kind"),
    sb.from("meeting_requests").select("*, events(title, slug)").order("created_at", { ascending: false }).limit(200),
    sb.from("event_counts").select("*"),
  ]);
  const events = (ev.data ?? []) as EventRow[];
  const matCount = (id: string) => (mats.data ?? []).filter((m: { event_id: string }) => m.event_id === id).length;
  const going = Object.fromEntries((counts.data ?? []).map((c: { event_id: string; going: number; attended: number }) => [c.event_id, c]));
  const needsMaterials = events.filter((e) => isPast(e) && e.status === "published" && matCount(e.id) === 0);
  const open = (reqs.data ?? []).filter((r: { handled: boolean }) => !r.handled).length;
  return (
    <div className="wrap page stack" style={{ gap: 24 }}>
      <div className="row-flex">
        <div><div className="eyebrow">Kleros team</div><h1>Events desk</h1></div>
        <span style={{ flex: 1 }} />
        <Link className="btn" href="/admin/team">Team roster</Link>
        <Link className="btn primary" href="/admin/events/new">+ Add event</Link>
      </div>
      <div className="stats">
        <div className="stat"><b className="mono">{events.filter((e) => !isPast(e)).length}</b><span>upcoming</span></div>
        <div className="stat"><b className="mono">{needsMaterials.length}</b><span>past events missing materials</span></div>
        <div className="stat"><b className="mono">{open}</b><span>open meeting requests</span></div>
        <div className="stat"><b className="mono">{events.filter((e) => e.status === "draft").length}</b><span>drafts</span></div>
      </div>
      {needsMaterials.length > 0 && <div className="note">Upload slides or a recording for: {needsMaterials.map((e, i) => <span key={e.id}>{i ? ", " : ""}<Link href={`/admin/events/${e.id}`}>{e.title}</Link></span>)}</div>}
      <section className="stack">
        <h2>Events</h2>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Date</th><th>Event</th><th>Kleros role</th><th>Where</th><th>Status</th><th>Going</th><th>Materials</th></tr></thead>
          <tbody>{events.map((e) => (
            <tr key={e.id}>
              <td className="mono">{fmtRange(e.starts_on, e.ends_on)}</td>
              <td><Link href={`/admin/events/${e.id}`}>{e.title}</Link>{e.is_example && <span className="pill ex" style={{ marginLeft: 6 }}>Example</span>}</td>
              <td>{ROLE_SHORT[e.kleros_role]}</td><td>{e.city ?? "Online"}</td>
              <td>{e.status === "draft" ? <span className="pill plain">Draft</span> : <span className="pill live">Live</span>}</td>
              <td className="mono">{going[e.id]?.going ?? 0}</td><td className="mono">{matCount(e.id)}</td>
            </tr>))}</tbody>
        </table></div>
      </section>
      <section className="stack">
        <h2>Meeting requests</h2>
        <RequestsTable rows={reqs.data ?? []} />
      </section>
    </div>
  );
}
