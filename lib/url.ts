// Returns the URL only if it is a well-formed http(s) URL, otherwise null.
// Guards href targets that originate from admin-entered (KV) data against
// dangerous schemes like javascript: / data: (stored XSS).
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" || u.protocol === "http:"
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}
