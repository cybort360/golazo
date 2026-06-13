import { kv } from "@vercel/kv";

// Read from KV each request; never prerender (KV may be unconfigured at build).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const announcement =
      (await kv.get<string>("featured_announcement")) ?? null;
    return Response.json({ announcement });
  } catch {
    return Response.json({ announcement: null });
  }
}
