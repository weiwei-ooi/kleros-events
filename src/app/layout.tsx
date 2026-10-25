import type { Metadata } from "next";
import { Unbounded, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { SITE_URL } from "@/lib/kleros";

const display = Unbounded({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-display" });
const body = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Kleros Events", template: "%s · Kleros Events" },
  description: "Every event Kleros hosts or takes part in, with the talks, slides and recordings to match.",
  openGraph: { siteName: "Kleros Events", type: "website" },
  twitter: { card: "summary_large_image", site: "@kleros_io" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
