import type { Metadata } from "next";
import { listEvents, listMaterials, eventCounts } from "@/lib/data";
import EventBrowser from "@/components/EventBrowser";
import { isWatchable } from "@/components/MaterialRow";
import SetupNotice from "@/components/SetupNotice";

export const metadata: Metadata = { title: "Events" };
export const revalidate = 60;

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ role?: string; when?: string }> }) {
  const [{ role, when }, events, materials, counts] = await Promise.all([searchParams, listEvents(), listMaterials(), eventCounts()]);
  const talkCounts: Record<string, number> = {};
  materials.filter((m) => isWatchable(m)).forEach((m) => { talkCounts[m.event_id] = (talkCounts[m.event_id] ?? 0) + 1; });
  return (
    <div className="wrap page">
      <SetupNotice />
      <div className="eyebrow">Events</div>
      <h1 style={{ marginBottom: 20 }}>Where to find <em>Kleros</em></h1>
      <EventBrowser events={events} talkCounts={talkCounts} counts={counts} initialRole={role} initialWhen={when === "past" ? "past" : undefined} />
    </div>
  );
}
