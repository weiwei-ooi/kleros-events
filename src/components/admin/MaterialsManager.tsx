"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { unlinkMaterial, uploadToStorage } from "@/lib/materials-client";
import type { EventRow, Material } from "@/lib/types";
import MaterialRow from "../MaterialRow";
import AddMaterials from "./AddMaterials";
import TalkBuilder from "./TalkBuilder";

// kept for older imports
export { uploadToStorage };

/** Linked to events other than this one, so removing it here only unlinks it. */
const sharedWith = (m: Material, eventId: string) => (m.event_ids ?? []).filter((id) => id !== eventId).length;

export default function MaterialsManager({ event, initial }: { event: EventRow; initial: Material[] }) {
  const [list, setList] = useState(initial);
  const [talkOpen, setTalkOpen] = useState(false);
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState("");

  async function remove(m: Material) {
    if (confirm !== m.id) { setConfirm(m.id); return; }
    setErr("");
    if (sharedWith(m, event.id)) {
      try { await unlinkMaterial(m.id, event.id); } catch (e) { setErr((e as Error).message); return; }
    } else {
      const sb = supabaseBrowser();
      // files first: storage lets whoever may edit the item remove its files only while the item exists
      const paths = [m.file_path, m.pdf_path, m.audio_path].filter((x): x is string => !!x && !/^https?:\/\//.test(x));
      if (paths.length) await sb.storage.from("materials").remove(paths);
      const { error } = await sb.from("materials").delete().eq("id", m.id);
      if (error) { setErr(error.message); return; }
    }
    setList(list.filter((x) => x.id !== m.id));
  }
  const added = (m: Material) => setList((l) => [...l, { ...m, event_ids: [event.id] }]);

  return (
    <div className="stack">
      <div className="lib">
        {list.map((m) => {
          const shared = sharedWith(m, event.id);
          return (
            <div key={m.id} className="row-flex" style={{ flexWrap: "nowrap", alignItems: "stretch" }}>
              <div style={{ flex: 1, minWidth: 0 }}><MaterialRow m={m} /></div>
              <button className="btn sm ghost" onClick={() => remove(m)} title={shared ? `Also linked to ${shared === 1 ? "1 other event" : `${shared} other events`}; it stays there.` : undefined}>
                {confirm === m.id ? "Confirm" : shared ? "Unlink" : "Remove"}
              </button>
            </div>
          );
        })}
        {!list.length && <div className="muted small">Nothing yet. After the event, add the deck and the recording as a talk.</div>}
      </div>
      <AddMaterials eventId={event.id} onAdded={added}
        extra={<button className="btn primary" type="button" onClick={() => setTalkOpen(!talkOpen)}><span className="dot" /> Add a talk (slides + recording)</button>} />
      {err && <div className="note">{err}</div>}
      {talkOpen && <TalkBuilder eventId={event.id} onSaved={(m) => { added(m); setTalkOpen(false); }} />}
    </div>
  );
}
