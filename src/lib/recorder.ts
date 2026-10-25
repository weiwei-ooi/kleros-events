"use client";
// Event recording on the laptop: MediaRecorder chunks are written to IndexedDB as they
// arrive, so a crashed tab or a closed lid doesn't lose the talk.

const DB = "kleros-events-rec";

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      db.createObjectStore("sessions", { keyPath: "id" });
      db.createObjectStore("chunks", { autoIncrement: true }).createIndex("session", "session");
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function done(tx: IDBTransaction) {
  return new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}

export interface RecSession { id: string; eventId: string; startedAt: number; mime: string; seconds: number }

export async function saveSession(s: RecSession) {
  const db = await open();
  const tx = db.transaction("sessions", "readwrite");
  tx.objectStore("sessions").put(s);
  await done(tx);
}

export async function addChunk(session: string, blob: Blob) {
  const db = await open();
  const tx = db.transaction("chunks", "readwrite");
  tx.objectStore("chunks").add({ session, blob });
  await done(tx);
}

export async function unsavedSessions(eventId: string): Promise<RecSession[]> {
  const db = await open();
  const tx = db.transaction("sessions");
  const all: RecSession[] = await new Promise((res) => { const r = tx.objectStore("sessions").getAll(); r.onsuccess = () => res(r.result); });
  return all.filter((s) => s.eventId === eventId);
}

export async function sessionBlob(s: RecSession): Promise<Blob> {
  const db = await open();
  const tx = db.transaction("chunks");
  const rows: { blob: Blob }[] = await new Promise((res) => { const r = tx.objectStore("chunks").index("session").getAll(s.id); r.onsuccess = () => res(r.result); });
  return new Blob(rows.map((r) => r.blob), { type: s.mime });
}

export async function dropSession(id: string) {
  const db = await open();
  const tx = db.transaction(["sessions", "chunks"], "readwrite");
  tx.objectStore("sessions").delete(id);
  const idx = tx.objectStore("chunks").index("session");
  const r = idx.openKeyCursor(IDBKeyRange.only(id));
  r.onsuccess = () => { const c = r.result; if (c) { tx.objectStore("chunks").delete(c.primaryKey); c.continue(); } };
  await done(tx);
}

export function pickMime() {
  for (const t of ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"]) if (MediaRecorder.isTypeSupported(t)) return t;
  return "";
}
