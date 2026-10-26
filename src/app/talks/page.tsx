import type { Metadata } from "next";
import { listEvents, listMaterials } from "@/lib/data";
import TalkArchive from "@/components/TalkArchive";
import SetupNotice from "@/components/SetupNotice";

export const metadata: Metadata = { title: "Talks & archive" };
export const revalidate = 60;

export default async function TalksPage() {
  const [events, materials] = await Promise.all([listEvents(), listMaterials()]);
  return (
    <div className="wrap page">
      <SetupNotice />
      <header className="page-head">
        <div className="eyebrow">Archive</div>
        <h1>Talks, slides and recordings</h1>
        <p className="lede">Talks, slides, photos and posts from Kleros events, grouped by event, newest first.</p>
      </header>
      <TalkArchive materials={materials} events={events.map(({ id, slug, title, city, country, starts_on }) => ({ id, slug, title, city, country, starts_on }))} />
    </div>
  );
}
