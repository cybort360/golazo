import Link from "next/link";

// Admin is gated by a password cookie (see middleware + /api/admin/auth), not by
// a wallet — so no wallet adapter here. Keeps wallet libs and any connect
// surface off the admin panel entirely.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <nav className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 md:px-8">
        <Link
          href="/admin"
          className="text-lg font-semibold uppercase tracking-tight text-slate-900"
        >
          Golazo Admin
        </Link>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">{children}</main>
    </div>
  );
}
