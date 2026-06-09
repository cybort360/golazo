// True only when Vercel KV credentials are present. Without them every admin
// write fails, so routes use this to return a clear "KV not configured" (503)
// instead of a generic runtime error.
export function kvConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}
