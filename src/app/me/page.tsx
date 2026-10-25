import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { listEvents, listMaterials } from "@/lib/data";
import MySpace from "@/components/MySpace";

export const metadata: Metadata = { title: "My events" };
export const dynamic = "force-dynamic";

export default async function MePage() {
  const { user, profile } = await currentUser();
  if (!user || !profile) redirect("/login?next=/me");
  const sb = await supabaseServer();
  const [events, materials, att, prog] = await Promise.all([
    listEvents(), listMaterials(),
    sb.from("attendance").select("event_id, status, note").eq("user_id", user.id),
    sb.from("talk_progress").select("material_id, position_seconds, finished").eq("user_id", user.id),
  ]);
  return <MySpace profile={profile} email={user.email ?? ""} events={events} materials={materials} attendance={att.data ?? []} progress={prog.data ?? []} />;
}
