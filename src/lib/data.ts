import { supabaseServer, supabaseConfigured } from "./supabase/server";
import type { AgendaItem, EventRow, EventTeamRow, Material } from "./types";

export async function listEvents(): Promise<EventRow[]> {
  if (!supabaseConfigured) return [];
  const sb = await supabaseServer();
  const { data } = await sb.from("events").select("*").order("starts_on", { ascending: true });
  return (data ?? []) as EventRow[];
}

export async function listMaterials(): Promise<Material[]> {
  if (!supabaseConfigured) return [];
  const sb = await supabaseServer();
  const { data } = await sb.from("materials").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Material[];
}

export async function eventCounts(): Promise<Record<string, { going: number; attended: number }>> {
  if (!supabaseConfigured) return {};
  const sb = await supabaseServer();
  const { data } = await sb.from("event_counts").select("*");
  return Object.fromEntries((data ?? []).map((r: { event_id: string; going: number; attended: number }) => [r.event_id, { going: r.going, attended: r.attended }]));
}

export async function getEvent(slug: string) {
  if (!supabaseConfigured) return null;
  const sb = await supabaseServer();
  const { data: event } = await sb.from("events").select("*").eq("slug", slug).maybeSingle();
  if (!event) return null;
  const [agenda, team, materials] = await Promise.all([
    sb.from("agenda_items").select("*").eq("event_id", event.id).order("starts_at"),
    sb.from("event_team").select("part, team_members(*)").eq("event_id", event.id),
    sb.from("materials").select("*").eq("event_id", event.id).order("created_at"),
  ]);
  return {
    event: event as EventRow,
    agenda: (agenda.data ?? []) as AgendaItem[],
    team: (team.data ?? []) as unknown as EventTeamRow[],
    materials: (materials.data ?? []) as Material[],
  };
}

export async function getMaterial(id: string) {
  if (!supabaseConfigured) return null;
  const sb = await supabaseServer();
  const { data } = await sb.from("materials").select("*, events(slug, title, starts_on, city)").eq("id", id).maybeSingle();
  return data as (Material & { events: Pick<EventRow, "slug" | "title" | "starts_on" | "city"> }) | null;
}
