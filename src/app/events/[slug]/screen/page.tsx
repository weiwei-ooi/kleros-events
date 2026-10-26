import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEvent } from "@/lib/data";
import { SITE_URL } from "@/lib/kleros";
import ScreenPage from "@/components/live/ScreenPage";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const data = await getEvent((await params).slug);
  return { title: data ? `Big screen · ${data.event.title}` : "Big screen", robots: { index: false } };
}

export default async function BigScreen({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getEvent(slug);
  if (!data) notFound();
  return <ScreenPage eventId={data.event.id} title={data.event.title} joinUrl={`${SITE_URL}/q/${slug}`} />;
}
