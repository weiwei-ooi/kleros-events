import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="wrap page" style={{ maxWidth: 520 }}>
      <div className="eyebrow">My events</div>
      <h1 style={{ marginBottom: 12 }}>Sign in</h1>
      <p className="muted">Save events, keep private notes, pick up talks where you left off, and ask the speakers questions. We&apos;ll email you a sign-in link. No password needed.</p>
      <LoginForm next={next?.startsWith("/") ? next : "/me"} />
    </div>
  );
}
