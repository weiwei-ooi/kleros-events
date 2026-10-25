"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { EventRow, Material, MaterialKind } from "@/lib/types";
import MaterialRow from "../MaterialRow";
import TalkBuilder from "./TalkBuilder";

export async function uploadToStorage(eventId: string, file: Blob, name: string) {
  const safe = name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-60);
  const path = `${eventId}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabaseBrowser().storage.from("materials").upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  return path;
}

function kindOf(f: File): MaterialKind {
  if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) return "slides";
  if (f.type.startsWith("audio/") || /\.(m4a|mp3|wav|ogg)$/i.test(f.name)) return "audio";
  if (f.type.startsWith("video/")) return "video";
  if (f.type.startsWith("image/")) return "image";
  return "doc";
}

export default function MaterialsManager({ event, initial }: { event: EventRow; initial: Material[] }) {
  const [list, setList] = useState(initial);
  const [mode, setMode] = useState<"" | "talk" | "link">("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [over, setOver] = useState(false);
  const [confirm, setConfirm] = useState("");

  async function addRow(row: Partial<Material>) {
    const { data, error } = await supabaseBrowser().from("materials").insert({ event_id: event.id, ...row }).select("*").single();
    if (error) throw error;
    setList((l) => [...l, data as Material]);
  }
  async function upload(files: File[]) {
    setErr("");
    for (const f of files) {
      setBusy(`Uploading ${f.name}…`);
      try {
        const path = await uploadToStorage(event.id, f, f.name);
        let pages: number | undefined;
        if (kindOf(f) === "slides") { const { openPdf } = await import("@/lib/pdf"); pages = (await openPdf(await f.arrayBuffer())).numPages; }
        await addRow({ kind: kindOf(f), title: f.name.replace(/\.[^.]+$/, ""), file_path: path, size_bytes: f.size, pages });
      } catch (e) { setErr(`${f.name}: ${(e as Error).message}`); }
    }
    setBusy("");
  }
  async function addLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try { await addRow({ kind: String(f.get("kind")) as MaterialKind, title: String(f.get("title")), url: String(f.get("url")), speaker: String(f.get("speaker")) || null }); setMode(""); }
    catch (er) { setErr((er as Error).message); }
  }
  async function remove(m: Material) {
    if (confirm !== m.id) { setConfirm(m.id); return; }
    const sb = supabaseBrowser();
    const { error } = await sb.from("materials").delete().eq("id", m.id);
    if (error) { setErr(error.message); return; }
    const paths = [m.file_path, m.pdf_path, m.audio_path].filter(Boolean) as string[];
    if (paths.length) await sb.storage.from("materials").remove(paths);
    setList(list.filter((x) => x.id !== m.id));
  }

  return (
    <div className="stack">
      <div className="lib">
        {list.map((m) => (
          <div key={m.id} className="row-flex" style={{ flexWrap: "nowrap", alignItems: "stretch" }}>
            <div style={{ flex: 1, minWidth: 0 }}><MaterialRow m={m} /></div>
            <button className="btn sm ghost" onClick={() => remove(m)}>{confirm === m.id ? "Confirm" : "Remove"}</button>
          </div>
        ))}
        {!list.length && <div className="muted small">Nothing yet. After the event, add the deck and the recording as a talk.</div>}
      </div>
      <div className="row-flex">
        <button className="btn primary" onClick={() => setMode(mode === "talk" ? "" : "talk")}><span className="dot" /> Add a talk (slides + recording)</button>
        <label className="btn">Upload files<input type="file" multiple hidden accept=".pdf,image/*,video/*,audio/*,.m4a,.mp3" onChange={(e) => { upload([...(e.target.files ?? [])]); e.target.value = ""; }} /></label>
        <button className="btn" onClick={() => setMode(mode === "link" ? "" : "link")}>Add a link or post</button>
      </div>
      <div className="box" style={{ textAlign: "center", borderStyle: "dashed", background: over ? "var(--accent-soft)" : undefined }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); upload([...e.dataTransfer.files]); }}>
        <span className="muted small">Drop PDFs, photos, audio or video here. Export Keynote or PowerPoint decks to PDF first.</span>
      </div>
      {busy && <div className="muted small" role="status">{busy}</div>}
      {err && <div className="note">{err}</div>}
      {mode === "link" && (
        <form className="panel" onSubmit={addLink}>
          <div className="two">
            <div className="field"><label htmlFor="lt">Title</label><input id="lt" name="title" required placeholder="Panel recording on YouTube" /></div>
            <div className="field"><label htmlFor="lk">Type</label><select id="lk" name="kind"><option value="video">Video</option><option value="social">Social post</option><option value="link">Article / link</option><option value="slides">Slides (Google Slides, Docsend)</option><option value="doc">Doc</option></select></div>
          </div>
          <div className="two">
            <div className="field"><label htmlFor="lu">URL</label><input id="lu" name="url" type="url" required placeholder="https://" /></div>
            <div className="field"><label htmlFor="ls">Speaker</label><input id="ls" name="speaker" /></div>
          </div>
          <button className="btn primary sm" type="submit">Add</button>
        </form>
      )}
      {mode === "talk" && <TalkBuilder eventId={event.id} onSaved={(m) => { setList((l) => [...l, m]); setMode(""); }} />}
    </div>
  );
}
