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

/** Placeholder for events without a cover: a calm date tile on a tinted block. */
export function CoverFallback({ e }: { e: Pick<EventRow, "starts_on" | "event_type"> }) {
  const d = new Date(e.starts_on + "T12:00:00");
  return (
    <span className="cover-fb">
      <span className="tile">
        <b>{d.getDate()}</b>
        <span>{d.toLocaleDateString("en-GB", { month: "short" })}</span>
      </span>
      <span className="kind">{e.event_type}</span>
    </span>
  );
}

export default function EventCard({ e, talks = 0, materials = 0, going = 0, why, mine }: {
  e: EventRow; talks?: number; materials?: number; going?: number; why?: string; mine?: string;
}) {
  const status = statusLabel(e);
  const count = talks ? plural(talks, "talk") : materials ? plural(materials, "item") : going ? `${going} going` : "";
  return (
    <Link className="card ev" href={`/events/${e.slug}`}>
      <div className="cover">
        <Thumb src={e.cover_path ? fileUrl(e.cover_path) : null} contain fallback={<CoverFallback e={e} />} />
        {status && <span className={`pill ${status.cls} on-cover`}>{status.text}</span>}
      </div>
      <div className="body">
        <div className="date">{fmtRange(e.starts_on, e.ends_on)}</div>
        <h3>{e.title}</h3>
        <div className="place">{place(e)}</div>
        {why && <span className="why">{why}</span>}
        {mine && <span className="why">{mine}</span>}
        <div className="foot">
          <span className="role">{ROLE_LABEL[e.kleros_role]}</span>
          {count && <span>{count}</span>}
        </div>
      </div>
    </Link>
  );
}
