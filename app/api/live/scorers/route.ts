import { kv } from "@vercel/kv";
import { espnEventIdForMatch } from "@/lib/espnEvents";
import { fetchEspnGoals, type MatchGoal } from "@/lib/espnMatchStats";

export const dynamic = "force-dynamic";

const STALE_MS = 30_000;

interface Cached {
  goals: MatchGoal[];
  fetchedAt: number;
}

// Goal scorers for one fixture (for the live banner). Maps our matchId to its
// ESPN event and pulls the goals; cached ~30s per match so the banner can poll
// without hammering ESPN. Degrades to an empty list.
export async function GET(request: Request) {
  const matchId = new URL(request.url).searchParams.get("matchId") ?? "";
  if (!matchId) return Response.json({ goals: [] });

  const cacheKey = `live_scorers:${matchId}`;
  try {
    const cached = await kv.get<Cached>(cacheKey);
    if (cached && Date.now() - cached.fetchedAt <= STALE_MS) {
      return Response.json({ goals: cached.goals });
    }
  } catch {
    /* no cache available */
  }

  try {
    const eventId = await espnEventIdForMatch(matchId);
    const goals = eventId ? await fetchEspnGoals(eventId) : [];
    try {
      await kv.set(cacheKey, { goals, fetchedAt: Date.now() });
    } catch {
      /* fine without cache */
    }
    return Response.json({ goals });
  } catch {
    return Response.json({ goals: [] });
  }
}
