import type { EventRow } from "./types";

export const todayIso = () => new Date().toISOString().slice(0, 10);
export const endOf = (e: Pick<EventRow, "starts_on" | "ends_on">) => e.ends_on ?? e.starts_on;
export const isPast = (e: Pick<EventRow, "starts_on" | "ends_on">) => endOf(e) < todayIso();
export const isLive = (e: Pick<EventRow, "starts_on" | "ends_on">) => e.starts_on <= todayIso() && endOf(e) >= todayIso();
export const place = (e: Pick<EventRow, "city" | "country">) => (e.city ? [e.city, e.country].filter(Boolean).join(", ") : "Online");

export function fmtRange(a: string, b?: string | null) {
  const A = new Date(a + "T12:00:00");
  const full: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  if (!b || b === a) return A.toLocaleDateString("en-GB", { weekday: "short", ...full });
  const B = new Date(b + "T12:00:00");
  return `${A.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${B.toLocaleDateString("en-GB", full)}`;
}

export function fmtDur(s: number | null | undefined) {
  const x = Math.max(0, Math.floor(s ?? 0));
  const h = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), sec = x % 60;
  return (h ? h + ":" : "") + String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
}

export function fmtSize(n: number | null | undefined) {
  if (!n) return "";
  return n > 1e6 ? (n / 1e6).toFixed(1) + " MB" : Math.round(n / 1e3) + " KB";
}

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

export const monthKey = (iso: string) => iso.slice(0, 7);
export const monthLabel = (iso: string) => new Date(iso.slice(0, 7) + "-15T12:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });

/** Groups events by the month they start in, keeping the order they come in. */
export function groupByMonth<T extends Pick<EventRow, "starts_on">>(list: T[]): { key: string; label: string; items: T[] }[] {
  const out: { key: string; label: string; items: T[] }[] = [];
  for (const e of list) {
    const k = monthKey(e.starts_on);
    const last = out[out.length - 1];
    if (last && last.key === k) last.items.push(e);
    else out.push({ key: k, label: monthLabel(e.starts_on), items: [e] });
  }
  return out;
}

export const soonestFirst = <T extends Pick<EventRow, "starts_on">>(a: T, b: T) => a.starts_on.localeCompare(b.starts_on);
export const newestFirst = <T extends Pick<EventRow, "starts_on">>(a: T, b: T) => b.starts_on.localeCompare(a.starts_on);

export const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;
