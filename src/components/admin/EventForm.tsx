"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { EVENT_TYPES, REGIONS, ROLE_LABEL, TOPICS } from "@/lib/kleros";
import { slugify } from "@/lib/format";
import type { EventRow, KlerosRole } from "@/lib/types";

export default function EventForm({ event }: { event?: EventRow }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [topics, setTopics] = useState<string[]>(event?.topics ?? []);

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault(); setErr("");
    const f = new FormData(ev.currentTarget);
    const s = (k: string) => (String(f.get(k) ?? "").trim() || null);
    const row = {
      title: s("title")!, kleros_role: s("kleros_role") as KlerosRole, organizer: s("organizer"), event_type: s("event_type")!,
      starts_on: s("starts_on")!, ends_on: s("ends_on"), start_time: s("start_time"), timezone: s("timezone"),
      city: s("city"), country: s("country"), region: s("region") ?? (s("city") ? null : "Online"), venue: s("venue"), url: s("url"),
      description: s("description"), recap: s("recap"), topics, status: (s("status") ?? "draft") as "draft" | "published",
      slug: s("slug") ?? slugify(`${s("title")}-${s("starts_on")?.slice(0, 7)}`), updated_at: new Date().toISOString(),
    };
    if (row.ends_on && row.ends_on < row.starts_on) { setErr("The end date is before the start date."); return; }
    setBusy(true);
    const sb = supabaseBrowser();
    const res = event ? await sb.from("events").update(row).eq("id", event.id).select("id").single() : await sb.from("events").insert(row).select("id").single();
    setBusy(false);
    if (res.error) { setErr(res.error.message.includes("events_slug_key") ? "Another event already uses this URL slug." : res.error.message); return; }
    if (!event) router.push(`/admin/events/${res.data.id}`); else router.refresh();
  }
  async function remove() {
    if (!event) return;
    if (!confirmDel) { setConfirmDel(true); return; }
    const { error } = await supabaseBrowser().from("events").delete().eq("id", event.id);
    if (error) { setErr(error.message); return; }
    router.push("/admin");
  }

  const v = event;
  return (
    <form className="panel" onSubmit={submit}>
      <div className="field"><label htmlFor="title">Event name</label><input id="title" name="title" required defaultValue={v?.title} placeholder="Kleros Court Day Lisbon" /></div>
      <div className="two">
        <div className="field"><label htmlFor="kleros_role">Kleros&apos; role</label><select id="kleros_role" name="kleros_role" defaultValue={v?.kleros_role ?? "host"}>{Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="field"><label htmlFor="organizer">Organizer</label><input id="organizer" name="organizer" defaultValue={v?.organizer ?? ""} placeholder="Kleros, ETHGlobal, a university…" /></div>
      </div>
      <div className="two">
        <div className="field"><label htmlFor="event_type">Type</label><select id="event_type" name="event_type" defaultValue={v?.event_type ?? "Conference"}>{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="field"><label htmlFor="status">Visibility</label><select id="status" name="status" defaultValue={v?.status ?? "draft"}><option value="draft">Draft (team only)</option><option value="published">Published</option></select></div>
      </div>
      <div className="two">
        <div className="field"><label htmlFor="starts_on">Starts</label><input id="starts_on" name="starts_on" type="date" required defaultValue={v?.starts_on} /></div>
        <div className="field"><label htmlFor="ends_on">Ends</label><input id="ends_on" name="ends_on" type="date" defaultValue={v?.ends_on ?? ""} /></div>
      </div>
      <div className="two">
        <div className="field"><label htmlFor="start_time">Start time</label><input id="start_time" name="start_time" type="time" defaultValue={v?.start_time?.slice(0, 5) ?? ""} /></div>
        <div className="field"><label htmlFor="timezone">Time zone</label><input id="timezone" name="timezone" defaultValue={v?.timezone ?? ""} placeholder="GMT+7" /></div>
      </div>
      <div className="two">
        <div className="field"><label htmlFor="city">City</label><input id="city" name="city" defaultValue={v?.city ?? ""} placeholder="Leave empty if online" /></div>
        <div className="field"><label htmlFor="country">Country</label><input id="country" name="country" defaultValue={v?.country ?? ""} /></div>
      </div>
      <div className="two">
        <div className="field"><label htmlFor="region">Region</label><select id="region" name="region" defaultValue={v?.region ?? ""}><option value="">–</option>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select></div>
        <div className="field"><label htmlFor="venue">Venue or stream</label><input id="venue" name="venue" defaultValue={v?.venue ?? ""} /></div>
      </div>
      <div className="field"><label htmlFor="url">Event page (Luma, Eventbrite…)</label><input id="url" name="url" type="url" defaultValue={v?.url ?? ""} placeholder="https://" /></div>
      <div className="field"><span className="lbl">Topics (drive recommendations and the product promos shown)</span>
        <div className="chips" style={{ margin: 0 }}>{TOPICS.map((t) => <button type="button" key={t} className="chip" aria-pressed={topics.includes(t)} onClick={() => setTopics(topics.includes(t) ? topics.filter((x) => x !== t) : [...topics, t])}>{t}</button>)}</div></div>
      <div className="field"><label htmlFor="description">Description</label><textarea id="description" name="description" defaultValue={v?.description ?? ""} /></div>
      <div className="field"><label htmlFor="recap">Recap (after the event)</label><textarea id="recap" name="recap" defaultValue={v?.recap ?? ""} placeholder="What happened, who we met, key takeaways" /></div>
      <div className="field"><label htmlFor="slug">URL slug</label><input id="slug" name="slug" defaultValue={v?.slug ?? ""} placeholder="Generated from the name if empty" /></div>
      {err && <div className="note">{err}</div>}
      <div className="row-flex">
        <button className="btn primary" type="submit" disabled={busy}>{busy ? "Saving…" : event ? "Save changes" : "Create event"}</button>
        {event && <button className="btn ghost" type="button" onClick={remove}>{confirmDel ? "Click again to delete this event" : "Delete event"}</button>}
      </div>
    </form>
  );
}
