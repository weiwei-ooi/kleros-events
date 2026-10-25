"use client";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Question } from "@/lib/types";

// Projector view for Kleros-hosted sessions: featured question or top questions, plus a join QR.
export default function LiveScreen({ eventId, title, joinUrl }: { eventId: string; title: string; joinUrl: string }) {
  const [qs, setQs] = useState<Question[]>([]);
  const [qr, setQr] = useState("");
  const load = useCallback(async () => {
    const { data } = await supabaseBrowser().from("question_scores").select("*").eq("event_id", eventId).eq("status", "open");
    setQs(((data ?? []) as Question[]).sort((a, b) => b.votes - a.votes));
  }, [eventId]);
  useEffect(() => {
    QRCode.toString(joinUrl, { type: "svg", margin: 0 }).then(setQr);
    load();
    const sb = supabaseBrowser();
    const ch = sb.channel(`screen-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "questions", filter: `event_id=eq.${eventId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "question_votes" }, load)
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [eventId, joinUrl, load]);
  const feat = qs.find((q) => q.featured);
  return (
    <div className="screen">
      <div className="stack" style={{ alignContent: "center", gap: "3vh" }}>
        <div className="eyebrow">Kleros · Ask the speaker</div>
        <h1 style={{ fontSize: "clamp(1.6rem,4vw,3.4rem)" }}>{title}</h1>
        {feat ? (
          <div><div className="eyebrow" style={{ marginBottom: 12 }}>Question from the room · ▲ {feat.votes}</div><div className="big-q">{feat.body}</div></div>
        ) : (
          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Top questions</div>
            {qs.length ? <ol style={{ margin: 0, paddingLeft: "1.2em", display: "grid", gap: 10, fontSize: "clamp(1rem,1.8vw,1.5rem)" }}>
              {qs.slice(0, 5).map((q) => <li key={q.id}>{q.body} <span className="mono" style={{ opacity: 0.6, fontSize: ".7em" }}>▲ {q.votes}</span></li>)}
            </ol> : <div style={{ fontSize: "1.4rem", opacity: 0.7 }}>Scan the code and ask the first question.</div>}
          </div>
        )}
      </div>
      <div className="stack" style={{ alignContent: "center", justifyItems: "start" }}>
        <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
        <div style={{ opacity: 0.8 }}>Scan to ask and upvote questions</div>
        <div style={{ opacity: 0.6, fontSize: ".9rem" }}>kleros.io · @kleros_io</div>
      </div>
    </div>
  );
}
