import type { Metadata } from "next";
import localFont from "next/font/local";
import { SoccerBall } from "@phosphor-icons/react/dist/ssr";
import SideNav from "@/components/predict/SideNav";
import BottomNav from "@/components/predict/BottomNav";
import IntroModal from "@/components/IntroModal";
import "flag-icons/css/flag-icons.min.css";
import "./globals.css";

// Self-hosted font (no runtime Google Fonts request). Inter remains the
// fallback stack. The CSS variable stays --font-inter so styles are unchanged.
const sans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
  fallback: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Golazo: Prove You Know Ball",
    template: "%s · Golazo",
  },
  description:
    "Make picks. Prove you know ball. Verify every result. Free-to-play football prediction leagues with verified results.",
  applicationName: "Golazo",
  openGraph: {
    type: "website",
    siteName: "Golazo",
    title: "Golazo: Prove You Know Ball",
    description: "Make picks. Prove you know ball. Verify every result.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Golazo: Prove You Know Ball",
    description: "Make picks. Prove you know ball. Verify every result.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-screen bg-[#f8fafc] pb-[68px] font-sans text-slate-900 antialiased lg:pb-0">
        {/* Ambient pitch watermark: big + very subtle, bleeding off the bottom-
            right of the canvas so empty pages don't read as a flat white void.
            Behind content (z-0), desktop-only, non-interactive. */}
        <SoccerBall
          weight="fill"
          aria-hidden
          className="pointer-events-none fixed -bottom-24 -right-20 z-0 hidden h-[420px] w-[420px] text-slate-900/[0.04] xl:h-[520px] xl:w-[520px] lg:block"
        />
        <SideNav />
        <main className="relative z-10 lg:pl-[230px]">{children}</main>
        <BottomNav />
        <IntroModal />
      </body>
    </html>
  );
}
