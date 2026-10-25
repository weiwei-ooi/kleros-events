import { redirect } from "next/navigation";
import { currentUser } from "./supabase/server";

export async function requireTeam(next = "/admin") {
  const { user, profile } = await currentUser();
  if (!user) redirect(`/login?next=${next}`);
  return { user, isTeam: !!profile?.is_team };
}
