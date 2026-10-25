import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEvent } from "@/lib/data";
import QuickAsk from "@/components/QuickAsk";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const data = await getEvent((await params).slug);
  return { title: data ? `Ask · ${data.event.title}` : "Ask a question" };
}

export default async function AskPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getEvent(slug);
  if (!data) notFound();
  return <QuickAsk eventId={data.event.id} title={data.event.title} slug={slug} />;
}
