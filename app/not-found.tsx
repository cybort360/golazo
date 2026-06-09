import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-center justify-center gap-5 px-4 py-16 text-center md:px-8">
      <span className="text-6xl font-black tracking-tight text-green-600">
        404
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Page not found
        </h1>
        <p className="max-w-sm text-sm text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
      >
        Back to home
      </Link>
    </div>
  );
}
