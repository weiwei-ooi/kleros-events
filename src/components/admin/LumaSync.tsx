"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ago } from "@/lib/useQuestions";

export type SyncLog = { ran_at: string; checked: number; updated: number; added: number; errors: string[] };

/** Luma keeps the events in step every hour; this shows the last run and lets the team run it now. */
export default function LumaSync({ last }: { last: SyncLog | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run() {
    setBusy(true);
    setMsg("");
    const { data, error } = await supabaseBrowser().rpc("sync_luma");
    setBusy(false);
    if (error) return setMsg(error.message);
    const r = data as { checked: number; updated: number; added: number };
    setMsg(`Checked ${r.checked} Luma events: ${r.updated} updated, ${r.added} added.`);
    router.refresh();
  }

  return (
    <div className="luma-sync small">
      <span className="muted">
        {last
          ? `Luma sync runs every hour. Last run ${ago(last.ran_at)}: ${last.updated} updated, ${last.added} added${last.errors.length ? `, ${last.errors.length} not readable` : ""}.`
          : "Luma sync runs every hour."}
      </span>
      <button className="btn sm" onClick={run} disabled={busy}>{busy ? "Syncing…" : "Sync from Luma now"}</button>
      {msg && <span role="status">{msg}</span>}
    </div>
  );
}
