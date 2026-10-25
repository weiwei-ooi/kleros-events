import { requireTeam } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabase/server";
import NotTeam from "@/components/NotTeam";
import RosterEditor from "@/components/admin/RosterEditor";
import type { TeamMember } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { isTeam } = await requireTeam("/admin/team");
  if (!isTeam) return <NotTeam />;
  const sb = await supabaseServer();
  const { data } = await sb.from("team_members").select("*").order("sort");
  return <div className="wrap page stack"><div className="eyebrow">Kleros team</div><h1>Team roster</h1><p className="muted">People listed on event pages. A booking link turns on “Pick a time” for visitors.</p><RosterEditor initial={(data ?? []) as TeamMember[]} /></div>;
}
