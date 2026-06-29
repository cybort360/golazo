import "server-only";
import { prisma } from "@/lib/db/client";
import { getTxlineClient } from "@/lib/txline";
import type { TxlineClient, TxlineFixture } from "@/lib/txline/client";
import { latestEventPatch } from "@/lib/predict/ingest-derive";

// TxLINE ingestion (PRD §10.3): pull fixtures + live updates into Postgres,
// storing every update as an append-only match_events row (never just latest).
// Current match state is derived from the latest event. Idempotent + replayable:
// re-running ingests only new events (by seq) and recomputes the same state.

export { latestEventPatch };

function fixtureUpsertData(f: TxlineFixture) {
  return {
    competition: f.competition,
    round: f.round,
    homeTeam: f.home.name,
    awayTeam: f.away.name,
    homeTicker: f.home.ticker,
    awayTicker: f.away.ticker,
    homeFlag: f.home.flagCode,
    awayFlag: f.away.flagCode,
    homeColor: f.home.color,
    awayColor: f.away.color,
    kickoff: new Date(f.kickoffMs),
    lockAt: new Date(f.lockMs),
  };
}

/** Upsert all fixtures from TxLINE into Match (metadata only — state via events). */
export async function syncFixtures(client: TxlineClient = getTxlineClient()): Promise<number> {
  const fixtures = await client.fixtures();
  for (const f of fixtures) {
    const data = fixtureUpsertData(f);
    await prisma.match.upsert({
      where: { id: f.id },
      create: { id: f.id, status: "NOT_STARTED", ...data },
      update: data,
    });
  }
  return fixtures.length;
}

/**
 * Ingest new live events for one fixture (append-only, idempotent by seq) and
 * recompute the derived Match state from the latest event.
 */
export async function ingestEvents(
  fixtureId: string,
  client: TxlineClient = getTxlineClient(),
): Promise<number> {
  const last = await prisma.txlineEvent.findFirst({
    where: { matchId: fixtureId },
    orderBy: { seq: "desc" },
    select: { seq: true },
  });
  const since = last?.seq ?? 0;
  const events = await client.liveEvents(fixtureId, since);

  if (events.length > 0) {
    await prisma.txlineEvent.createMany({
      data: events.map((e) => ({
        matchId: fixtureId,
        seq: e.seq,
        type: e.type,
        state: e.state,
        minute: e.minute,
        homeScore: e.homeScore,
        awayScore: e.awayScore,
        payload: (e.payload ?? {}) as object,
      })),
      skipDuplicates: true,
    });
  }

  // Derive current state from the FULL stored log (replayable, not just the delta).
  const all = await prisma.txlineEvent.findMany({
    where: { matchId: fixtureId },
    orderBy: { seq: "asc" },
    select: { seq: true, state: true, minute: true, homeScore: true, awayScore: true },
  });
  const patch = latestEventPatch(all.map((e) => ({ ...e, state: e.state ?? "NOT_STARTED" })));
  if (patch) {
    await prisma.match.update({ where: { id: fixtureId }, data: patch });
  }
  return events.length;
}

/** Full sync: fixtures + events for every fixture. Returns counts. */
export async function syncAll(
  client: TxlineClient = getTxlineClient(),
): Promise<{ fixtures: number; events: number }> {
  const fixtures = await client.fixtures();
  let totalFixtures = 0;
  let totalEvents = 0;
  // upsert fixture metadata
  for (const f of fixtures) {
    const data = fixtureUpsertData(f);
    await prisma.match.upsert({
      where: { id: f.id },
      create: { id: f.id, status: "NOT_STARTED", ...data },
      update: data,
    });
    totalFixtures++;
  }
  // then ingest each fixture's events
  for (const f of fixtures) {
    totalEvents += await ingestEvents(f.id, client);
  }
  return { fixtures: totalFixtures, events: totalEvents };
}
