// How often people may ask. With SUPABASE_SERVICE_ROLE_KEY set and migration 0013 run, the counts
// live in the database (ask_take), so they hold across every server instance. Without them, each
// instance counts in its own memory, which stops one person but not a script that spreads its
// requests over many instances. Either way the hard ceiling is the spend limit on the key's workspace.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const env = (k: string, d: number) => Number(process.env[k]) > 0 ? Number(process.env[k]) : d;

export type Tier = "team" | "signed-in" | "visitor";

/** Questions per 10 minutes and per day, by tier, and in all for everyone outside the team per day. */
const limits = (tier: Tier) => tier === "team"
  ? { burst: env("ASK_LIMIT_TEAM", 60), daily: 0, overall: 0 }
  : tier === "signed-in"
    ? { burst: env("ASK_LIMIT_SIGNED_IN", 20), daily: env("ASK_LIMIT_SIGNED_IN_DAILY", 60), overall: env("ASK_LIMIT_DAILY_TOTAL", 600) }
    : { burst: env("ASK_LIMIT_VISITOR", 8), daily: env("ASK_LIMIT_VISITOR_DAILY", 30), overall: env("ASK_LIMIT_DAILY_TOTAL", 600) };

const MESSAGES = {
  burst: "That is a lot of questions in a short time. Try again in a few minutes.",
  daily: (tier: Tier) => tier === "visitor"
    ? "That is the limit of questions for today without signing in. Sign in to ask more."
    : "That is the limit of questions for one account today. Try again tomorrow.",
  overall: "The assistant has answered as many questions as it can today. Try again tomorrow.",
};

let service: SupabaseClient | null | undefined;
function serviceDb() {
  if (service !== undefined) return service;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  service = key && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
  return service;
}

/** Records one question for `key`; returns a reason when it is over a limit. */
export async function take(key: string, tier: Tier): Promise<string | null> {
  const l = limits(tier);
  const db = serviceDb();
  if (db) {
    const { data, error } = await db.rpc("ask_take", { p_key: key, p_burst: l.burst, p_daily: l.daily, p_overall: l.overall });
    if (!error) return data === "burst" ? MESSAGES.burst : data === "daily" ? MESSAGES.daily(tier) : data === "overall" ? MESSAGES.overall : null;
    // not set up yet (migration 0013 not run) or the database is unreachable: count here instead
    console.warn("ask_take failed, counting in memory:", error.message);
  }
  return takeHere(key, tier, l);
}

// ---------------------------------------------------------------- in-memory fallback
const recent = new Map<string, number[]>();
let day = "";
let overallToday = 0;

function takeHere(key: string, tier: Tier, l: ReturnType<typeof limits>): string | null {
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== day) { day = today; overallToday = 0; }
  const list = (recent.get(key) ?? []).filter((t) => new Date(t).toISOString().slice(0, 10) === today || now - t < 10 * 60_000);
  const inBurst = list.filter((t) => now - t < 10 * 60_000).length;
  const inDay = list.filter((t) => new Date(t).toISOString().slice(0, 10) === today).length;
  if (inBurst >= l.burst) return MESSAGES.burst;
  if (l.daily && inDay >= l.daily) return MESSAGES.daily(tier);
  if (l.overall && overallToday >= l.overall) return MESSAGES.overall;
  list.push(now);
  recent.delete(key);
  recent.set(key, list);
  if (l.overall) overallToday++;
  // keep memory bounded: the least recently active keys go first
  while (recent.size > 5000) recent.delete(recent.keys().next().value!);
  return null;
}
