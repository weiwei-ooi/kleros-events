"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks({ signedIn, isTeam }: { signedIn: boolean; isTeam: boolean }) {
  const path = usePathname();
  const links = [
    { href: "/events", label: "Events" },
    { href: "/talks", label: "Talks & archive" },
    { href: "/me", label: signedIn ? "My events" : "Sign in" },
    ...(isTeam ? [{ href: "/admin", label: "Team" }] : []),
  ];
  return (
    <nav className="nav" aria-label="Main">
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={path.startsWith(l.href) ? "page" : undefined}>{l.label}</Link>
      ))}
      <a className="btn sm primary" href="https://kleros.io" target="_blank" rel="noopener">kleros.io ↗</a>
    </nav>
  );
}
