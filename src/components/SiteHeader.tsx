import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import NavLinks from "./NavLinks";

export function KlerosMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2 28 9v14l-12 7L4 23V9z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M16 9l6 3.5v7L16 23l-6-3.5v-7z" fill="var(--accent)" />
    </svg>
  );
}

export default async function SiteHeader() {
  const { user, profile } = await currentUser();
  return (
    <header className="top">
      <div className="wrap">
        <Link className="brand" href="/">
          <KlerosMark />
          <span>Kleros Events<br /><small>Talks · slides · recordings</small></span>
        </Link>
        <NavLinks signedIn={!!user} isTeam={!!profile?.is_team} />
      </div>
    </header>
  );
}
