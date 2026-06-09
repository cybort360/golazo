"use client";

import { useEffect } from "react";

// Catches errors thrown in the root layout itself. It must render its own
// <html>/<body>, and can't rely on the app's CSS, so styles are inlined.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
          padding: "24px",
          textAlign: "center",
          background: "#f8fafc",
          color: "#0f172a",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        <span
          style={{
            borderRadius: "999px",
            background: "#fef2f2",
            color: "#ef4444",
            padding: "4px 12px",
            fontSize: "12px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Error
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ margin: 0, maxWidth: "24rem", color: "#64748b", fontSize: "14px" }}>
            An unexpected error occurred. Please try again.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          style={{
            border: "none",
            cursor: "pointer",
            borderRadius: "999px",
            background: "#16a34a",
            color: "white",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
