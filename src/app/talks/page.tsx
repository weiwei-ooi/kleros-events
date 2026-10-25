import type { Metadata } from "next";
import Link from "next/link";
import { listEvents, listMaterials } from "@/lib/data";
import { fmtRange, isPast } from "@/lib/format";
import TalkArchive from "@/components/TalkArchive";
import SetupNotice from "@/components/SetupNotice";

export const metadata: Metadata = { title: "Talks & archive" };
export const revalidate = 60;

export default async function TalksPage() {
  const [events, materials] = await Promise.all([listEvents(), listMaterials()]);
  const recent = events.filter(isPast).sort((a, b) => b.starts_on.localeCompare(a.starts_on)).slice(0, 10);
  return (
    <div className="wrap page">
      <SetupNotice />
      <div className="eyebrow">Archive</div>
      <h1>Talks, slides and recordings</h1>
      <div className="eyebrow" style={{ margin: "24px 0 8px" }}>Recent events</div>
      <div className="row-flex" style={{ overflowX: "auto", flexWrap: "nowrap", paddingBottom: 6, marginBottom: 18 }}>
        {recent.map((e) => {
          const n = materials.filter((m) => m.event_id === e.id).length;
          return <Link key={e.id} className="card" style={{ flex: "0 0 210px" }} href={`/events/${e.slug}`}><span className="date">{fmtRange(e.starts_on)}</span><h3 style={{ fontSize: ".92rem" }}>{e.title}</h3><span className="muted mono small">{n} item{n === 1 ? "" : "s"}</span></Link>;
        })}
        {!recent.length && <span className="muted small">Past events will line up here.</span>}
      </div>
      <TalkArchive materials={materials} events={events} />
    </div>
  );
}
