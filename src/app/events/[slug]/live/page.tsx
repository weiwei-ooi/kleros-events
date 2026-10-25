import { notFound } from "next/navigation";
import { getEvent } from "@/lib/data";
import LiveScreen from "@/components/LiveScreen";
import { SITE_URL } from "@/lib/kleros";

export default async function LivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getEvent(slug);
  if (!data) notFound();
  return <LiveScreen eventId={data.event.id} title={data.event.title} joinUrl={`${SITE_URL}/events/${slug}#ask`} />;
}
