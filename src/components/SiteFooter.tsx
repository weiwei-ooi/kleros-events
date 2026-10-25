import { LUMA_URL, SOCIALS } from "@/lib/kleros";

export default function SiteFooter() {
  return (
    <footer className="site">
      <div className="wrap">
        <div>
          <h4>Kleros</h4>
          <div style={{ font: "400 2rem/1.05 var(--font-display)", color: "var(--white)" }}>Justice, <em className="em">decentralized.</em></div>
          <p>Kleros is an on-chain dispute resolution protocol. Randomly selected, crowdsourced jurors rule on cases from escrow disputes to AI agent disagreements.</p>
          <p><a href="https://kleros.io" target="_blank" rel="noopener" style={{ display: "inline", textDecoration: "underline" }}>kleros.io</a></p>
        </div>
        <div>
          <h4>Products</h4>
          <a href="https://court.kleros.io" target="_blank" rel="noopener">Court</a>
          <a href="https://curate.kleros.io" target="_blank" rel="noopener">Curate</a>
          <a href="https://escrow.kleros.io" target="_blank" rel="noopener">Escrow</a>
          <a href="https://docs.kleros.io" target="_blank" rel="noopener">Docs</a>
        </div>
        <div>
          <h4>Community</h4>
          {SOCIALS.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noopener">{s.label}</a>)}
        </div>
        <div>
          <h4>Events</h4>
          <a href="/events">Upcoming events</a>
          <a href="/talks">Talk archive</a>
          <a href="/events?role=host">Kleros-hosted</a>
          <a href="/me">My events</a>
        </div>
        <div className="base">
          <span>Kleros Events · where Kleros has been and is going next</span>
          <span>Want Kleros at your event? <a href="https://kleros.io" target="_blank" rel="noopener" style={{ display: "inline", textDecoration: "underline" }}>Get in touch</a> · <a href={LUMA_URL} target="_blank" rel="noopener" style={{ display: "inline", textDecoration: "underline" }}>All events on Luma</a></span>
        </div>
      </div>
    </footer>
  );
}
