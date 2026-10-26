/** One quiet line for visitors who don't know Kleros yet. */
export default function PromoStrip({ lead = "New to Kleros?" }: { lead?: string }) {
  return (
    <p className="promo-line">
      <b>{lead}</b> Kleros is a decentralized court where randomly drawn jurors settle disputes on-chain.{" "}
      <a href="https://kleros.io" target="_blank" rel="noopener">Learn how it works ↗</a>
    </p>
  );
}
