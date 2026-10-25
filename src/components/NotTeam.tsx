export default function NotTeam() {
  return (
    <div className="wrap page" style={{ maxWidth: 620 }}>
      <h1>Team only</h1>
      <p className="muted">This area is for the Kleros team. If you&apos;re on the team, ask an admin to mark your account as team in Supabase (<code>profiles.is_team = true</code>).</p>
    </div>
  );
}
