import Script from "next/script";

// The Telegram Mini App container. Loads Telegram's WebApp SDK before the page
// runs so window.Telegram.WebApp (and initData) is available. Renders bare —
// the site nav/intro are suppressed on /tg.
export default function TgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
      />
      <div className="min-h-screen bg-[#f8fafc] text-slate-900">{children}</div>
    </>
  );
}
