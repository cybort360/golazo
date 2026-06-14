import type { Metadata } from "next";
import localFont from "next/font/local";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
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
    default: "Golazo: Football Token Trading on Solana",
    template: "%s · Golazo",
  },
  description:
    "Trade World Cup team tokens on Solana. Champion holders split the prize pool.",
  applicationName: "Golazo",
  openGraph: {
    type: "website",
    siteName: "Golazo",
    title: "Golazo: Football Token Trading on Solana",
    description:
      "Trade World Cup team tokens on Solana. Champion holders split the prize pool.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Golazo: Football Token Trading on Solana",
    description:
      "Trade World Cup team tokens on Solana. Champion holders split the prize pool.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 antialiased">
        <SiteNav />
        <main>{children}</main>
        <SiteFooter />
        <IntroModal />
      </body>
    </html>
  );
}
