"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Req = { id: string; name: string; email: string; company: string | null; interest: string | null; message: string | null; handled: boolean; created_at: string; events: { title: string; slug: string } | null };

export default function RequestsTable({ rows }: { rows: Req[] }) {
  const [list, setList] = useState(rows);
  async function toggle(r: Req) {
    const { error } = await supabaseBrowser().from("meeting_requests").update({ handled: !r.handled }).eq("id", r.id);
    if (!error) setList(list.map((x) => (x.id === r.id ? { ...x, handled: !x.handled } : x)));
  }
  if (!list.length) return <div className="empty"><b>No requests yet</b>Requests from the “Meet Kleros” form on event pages land here.</div>;
  return (
    <div className="table-wrap"><table className="table">
      <thead><tr><th>When</th><th>Who</th><th>Topic</th><th>Event</th><th>Message</th><th></th></tr></thead>
      <tbody>{list.map((r) => (
        <tr key={r.id} style={{ opacity: r.handled ? 0.5 : 1 }}>
          <td className="mono">{r.created_at.slice(0, 10)}</td>
          <td><b>{r.name}</b><br /><span className="mono small" style={{ userSelect: "all" }}>{r.email}</span>{r.company && <><br /><span className="muted small">{r.company}</span></>}</td>
          <td>{r.interest}</td><td>{r.events?.title ?? "–"}</td><td style={{ maxWidth: 320 }}>{r.message}</td>
          <td><button className="btn sm" onClick={() => toggle(r)}>{r.handled ? "Reopen" : "Mark handled"}</button></td>
        </tr>))}</tbody>
    </table></div>
  );
}
