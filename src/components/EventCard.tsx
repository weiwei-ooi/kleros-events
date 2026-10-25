import Link from "next/link";
import type { EventRow } from "@/lib/types";
import { ROLE_SHORT, KLEROS_HOSTED } from "@/lib/kleros";
import { fmtRange, isLive, place } from "@/lib/format";

export function RolePill({ e }: { e: Pick<EventRow, "kleros_role"> }) {
  return KLEROS_HOSTED.includes(e.kleros_role)
    ? <span className="pill host">{e.kleros_role === "host" ? "Kleros-hosted" : "Co-hosted"}</span>
    : <span className="pill part">Kleros: {ROLE_SHORT[e.kleros_role]}</span>;
}

export default function EventCard({ e, talks = 0, going = 0, why, mine }: { e: EventRow; talks?: number; going?: number; why?: string; mine?: string }) {
  return (
    <Link className="card" href={`/events/${e.slug}`}>
      <div className="when">
        <span className="date">{fmtRange(e.starts_on, e.ends_on)}</span>
        {mine && <span className="mono" style={{ fontSize: ".75rem", color: "var(--accent)" }}>● {mine}</span>}
      </div>
      <h3>{e.title}</h3>
      <div className="meta">
        <RolePill e={e} />
        {isLive(e) && <span className="pill live">Happening now</span>}
        <span className="pill plain">{e.event_type}</span>
        {e.is_example && <span className="pill ex">Example</span>}
      </div>
      {e.description && <p>{e.description}</p>}
      {why && <div className="why">{why}</div>}
      <div className="foot">
        <span>{place(e)}</span>
        <span className="mono">{talks ? `${talks} talk${talks > 1 ? "s" : ""}` : going ? `${going} going` : ""}</span>
      </div>
    </Link>
  );
}
