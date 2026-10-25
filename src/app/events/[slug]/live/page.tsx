import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEvent } from "@/lib/data";
import EventMode from "@/components/EventMode";
import { SITE_URL } from "@/lib/kleros";
import { currentUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Event mode" };

export default async function LivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [data, { profile }] = await Promise.all([getEvent(slug), currentUser()]);
  if (!data) notFound();
  return <EventMode eventId={data.event.id} slug={slug} title={data.event.title} joinUrl={`${SITE_URL}/q/${slug}`} isTeam={!!profile?.is_team} />;
}
