import Link from "next/link";
import type { EventRow } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/kleros";
import { fmtRange, isLive, plural, place } from "@/lib/format";
import { fileUrl } from "./MaterialRow";
import Thumb from "./Thumb";

/** One quiet status label at most: draft beats live beats example. */
export function statusLabel(e: Pick<EventRow, "status" | "starts_on" | "ends_on" | "is_example">) {
  if (e.status === "draft") return { cls: "draft", text: "Draft" };
  if (isLive(e)) return { cls: "live", text: "Happening now" };
  if (e.is_example) return { cls: "ex", text: "Example" };
  return null;
}

/** Date tile for cards without a cover: day number over the short month. */
export function DateTile({ iso }: { iso: string }) {
  const d = new Date(iso + "T12:00:00");
  return (
    <span className="date-tile" aria-hidden>
      <b>{d.getDate()}</b>
      <span>{d.toLocaleDateString("en-GB", { month: "short" })}</span>
    </span>
  );
}

export default function EventCard({ e, talks = 0, materials = 0, going = 0, why, mine }: {
  e: EventRow; talks?: number; materials?: number; going?: number; why?: string; mine?: string;
}) {
  const status = statusLabel(e);
  const count = talks ? plural(talks, "talk") : materials ? plural(materials, "item") : going ? `${going} going` : "";
  const foot = (
    <div className="foot">
      <span className="role">{ROLE_LABEL[e.kleros_role]}</span>
      {count && <span>{count}</span>}
    </div>
  );
  const extra = <>{why && <span className="why">{why}</span>}{mine && <span className="why">{mine}</span>}</>;

  if (!e.cover_path) {
    // No cover: a compact card with the date tile beside the text, no placeholder image.
    return (
      <Link className="card ev compact" href={`/events/${e.slug}`}>
        <div className="body">
          <div className="ev-row">
            <DateTile iso={e.starts_on} />
            <div className="ev-text">
              <div className="date">{fmtRange(e.starts_on, e.ends_on)}</div>
              <h3>{e.title}</h3>
              <div className="place">{place(e)} · {e.event_type}</div>
              {status && <span className={`pill ${status.cls}`}>{status.text}</span>}
              {extra}
            </div>
          </div>
          {foot}
        </div>
      </Link>
    );
  }

  return (
    <Link className="card ev" href={`/events/${e.slug}`}>
      <div className="cover">
        <Thumb src={fileUrl(e.cover_path)} contain fallback={<span className="cover-fb"><DateTile iso={e.starts_on} /></span>} />
        {status && <span className={`pill ${status.cls} on-cover`}>{status.text}</span>}
      </div>
      <div className="body">
        <div className="date">{fmtRange(e.starts_on, e.ends_on)}</div>
        <h3>{e.title}</h3>
        <div className="place">{place(e)} · {e.event_type}</div>
        {extra}
        {foot}
      </div>
    </Link>
  );
}
