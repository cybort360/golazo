"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for debugging; replace with real reporting if desired.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-center justify-center gap-5 px-4 py-16 text-center md:px-8">
      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-500">
        Error
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Something went wrong
        </h1>
        <p className="max-w-sm text-sm text-slate-500">
          An unexpected error occurred. Please try again.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
      >
        Try again
      </button>
    </div>
  );
}
