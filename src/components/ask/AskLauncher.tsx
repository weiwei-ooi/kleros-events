import { currentUser } from "@/lib/supabase/server";
import AskWidget from "./AskWidget";

/**
 * The assistant's button, once the deployment has an Anthropic key. Before that only the team
 * sees it, with a note on how to switch it on. ASK_PUBLIC=off keeps it to signed-in accounts.
 */
export default async function AskLauncher() {
  const enabled = !!(process.env.ASK_ANTHROPIC_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim());
  const { user, profile } = await currentUser();
  const isTeam = !!(profile?.is_team || profile?.is_admin);
  if (!enabled && !isTeam) return null;
  if (!user && process.env.ASK_PUBLIC === "off") return null;
  return <AskWidget enabled={enabled} signedIn={!!user} account={user?.id ?? "visitor"} />;
}
